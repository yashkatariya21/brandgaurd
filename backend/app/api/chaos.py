"""T4 – Chaos Testing API: test tone rules for ambiguity.

Round 2 scope: tone rules only.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from psycopg.types.json import Jsonb

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.chaos import generate_chaos_cases, interpret_case, detect_ambiguities, _has_llm

router = APIRouter(prefix="/v1")

N_INTERPRETERS = 5


def _serialize(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if v is None:
            out[k] = v
        elif hasattr(v, "hex"):
            out[k] = str(v)
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ─── POST /v1/rules/{rule_id}/chaos-test ──────────────────────────────────────

@router.post("/rules/{rule_id}/chaos-test", status_code=201)
def run_chaos_test(rule_id: str, principal: Principal = Depends(require("run_chaos"))):
    """Generate chaos cases, run n interpretations per case, flag ambiguities."""
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rule = conn.execute(
            """SELECT r.id, r.key, r.label, r.category, r.severity,
                      rv.id as version_id, rv.description, rv.expected_behaviour,
                      rv.validation_criteria
               FROM rules r
               JOIN rule_versions rv ON rv.id = r.current_version_id
               WHERE r.id = %s AND r.org_id = %s AND rv.status = 'approved'""",
            (rule_id, principal.org_id),
        ).fetchone()
        if not rule:
            raise ApiError(404, "not_found", "Rule not found or has no approved version")

        rule_dict = dict(rule)
        mode = "llm" if _has_llm() else "demo"

        # Only Round 2 scope: tone rules
        if rule_dict["category"] != "tone":
            raise ApiError(
                422, "unsupported_category",
                f"Chaos testing is available for tone rules only in Round 2 "
                f"(rule category is '{rule_dict['category']}')"
            )

        # Create the chaos_run
        run_id = uuid.uuid4()
        conn.execute(
            """INSERT INTO chaos_runs
               (id, org_id, rule_version_ids, status, started_at, created_by,
                n_interpreters, model_id, prompt_version)
               VALUES (%s,%s,%s::uuid[],'running',now(),%s,%s,%s,%s)""",
            (
                run_id, principal.org_id,
                [str(rule_dict["version_id"])],
                principal.user_id,
                N_INTERPRETERS,
                "gpt-4o-mini" if _has_llm() else "stub",
                "chaos-v1",
            ),
        )

        # Generate cases
        raw_cases = generate_chaos_cases(rule_dict)

        case_rows = []
        result_rows = []
        issue_rows = []

        rule_text = rule_dict["description"] or ""

        for case in raw_cases:
            case_text = case.get("text", "")
            axis = case.get("axis", "formality")
            intended_label = case.get("intended_label", "borderline")
            if intended_label not in ("pass", "fail", "borderline"):
                intended_label = "borderline"

            case_id = uuid.uuid4()
            conn.execute(
                """INSERT INTO chaos_cases
                   (id, org_id, chaos_run_id, rule_version_id, text, axis, intended_label)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (
                    case_id, principal.org_id, run_id,
                    rule_dict["version_id"],
                    case_text, axis, intended_label,
                ),
            )

            # Run n interpretations
            verdicts = interpret_case(rule_text, case_text, n=N_INTERPRETERS)
            valid_verdicts = [v for v in verdicts if v in ("pass", "fail", "borderline")]
            if not valid_verdicts:
                valid_verdicts = ["borderline"] * N_INTERPRETERS

            # Compute agreement: count of majority verdict / n
            from collections import Counter
            cnt = Counter(valid_verdicts)
            majority_verdict, majority_count = cnt.most_common(1)[0]
            agreement = majority_count / len(valid_verdicts)

            # A case is ambiguous if agreement < 0.8 OR majority differs from intended
            is_ambiguous = (agreement < 0.8) or (majority_verdict != intended_label and intended_label != "borderline")

            conn.execute(
                """INSERT INTO chaos_results
                   (id, org_id, chaos_case_id, verdicts, agreement, majority_verdict)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (
                    uuid.uuid4(), principal.org_id, case_id,
                    Jsonb(valid_verdicts),
                    round(agreement, 3),
                    majority_verdict,
                ),
            )

            case_rows.append({
                "id": str(case_id),
                "text": case_text,
                "axis": axis,
                "intended_label": intended_label,
                "verdicts": valid_verdicts,
                "agreement": round(agreement, 3),
                "majority_verdict": majority_verdict,
                "is_ambiguous": is_ambiguous,
            })

        # Flag ambiguity issue if any case is ambiguous
        ambiguous_cases = [c for c in case_rows if c["is_ambiguous"]]
        if ambiguous_cases:
            # Suggest clarification
            if _has_llm():
                suggested_clarification = _llm_clarification(rule_dict, ambiguous_cases)
            else:
                suggested_clarification = (
                    f"Consider adding specific examples of pass and fail cases. "
                    f"For tone rules: one exclamation mark is acceptable in social posts. "
                    f"No emoji in press releases or legal notices."
                )

            issue_id = uuid.uuid4()
            conn.execute(
                """INSERT INTO chaos_issues
                   (id, org_id, chaos_run_id, kind, rule_version_ids,
                    description, suggested_clarification, status)
                   VALUES (%s,%s,%s,'ambiguity',%s::uuid[],%s,%s,'open')""",
                (
                    issue_id, principal.org_id, run_id,
                    [str(rule_dict["version_id"])],
                    f"Rule '{rule_dict['key']}' has {len(ambiguous_cases)} ambiguous "
                    f"case(s) out of {len(case_rows)} tested.",
                    suggested_clarification,
                ),
            )
            issue_rows.append({
                "id": str(issue_id),
                "kind": "ambiguity",
                "description": f"Rule '{rule_dict['key']}' has {len(ambiguous_cases)} ambiguous case(s).",
                "suggested_clarification": suggested_clarification,
                "status": "open",
            })

        conn.execute(
            "UPDATE chaos_runs SET status='done', finished_at=now() WHERE id=%s", (run_id,)
        )
        write_audit(
            conn, principal.user_id, "chaos.run", "chaos_run", run_id,
            after={
                "rule_id": rule_id,
                "cases": len(case_rows),
                "ambiguous": len(ambiguous_cases),
                "mode": mode,
            },
        )

    return {
        "run_id": str(run_id),
        "rule_key": rule_dict["key"],
        "mode": mode,
        "n_interpreters": N_INTERPRETERS,
        "cases_count": len(case_rows),
        "ambiguous_count": len(ambiguous_cases),
        "cases": case_rows,
        "issues": issue_rows,
        **({"demo_note": "Demo mode – interpretations use lightweight heuristics, not AI."} if mode == "demo" else {}),
    }


# ─── GET /v1/chaos-runs/{run_id} ─────────────────────────────────────────────

@router.get("/chaos-runs/{run_id}")
def get_chaos_run(run_id: uuid.UUID, principal: Principal = Depends(require("run_chaos"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        run = conn.execute(
            "SELECT * FROM chaos_runs WHERE id=%s AND org_id=%s",
            (run_id, principal.org_id),
        ).fetchone()
        if not run:
            raise ApiError(404, "not_found", "Chaos run not found")

        cases = conn.execute(
            """SELECT cc.id, cc.text, cc.axis, cc.intended_label, cc.human_label,
                      cr.verdicts, cr.agreement, cr.majority_verdict
               FROM chaos_cases cc
               LEFT JOIN chaos_results cr ON cr.chaos_case_id = cc.id
               WHERE cc.chaos_run_id = %s
               ORDER BY cc.id""",
            (run_id,),
        ).fetchall()

        issues = conn.execute(
            "SELECT * FROM chaos_issues WHERE chaos_run_id=%s ORDER BY created_at",
            (run_id,),
        ).fetchall()

    return {
        "run": _serialize(dict(run)),
        "cases": [_serialize(dict(c)) for c in cases],
        "issues": [_serialize(dict(i)) for i in issues],
    }


# ─── POST /v1/chaos-cases/{case_id}/label ────────────────────────────────────

class LabelBody(BaseModel):
    human_label: str  # pass | fail | borderline


@router.post("/chaos-cases/{case_id}/label")
def label_case(case_id: uuid.UUID, body: LabelBody,
               principal: Principal = Depends(require("run_chaos"))):
    if body.human_label not in ("pass", "fail", "borderline"):
        raise ApiError(400, "bad_request", "human_label must be pass, fail, or borderline")

    with tenant_conn(principal.org_id, principal.user_id) as conn:
        case = conn.execute(
            "SELECT id FROM chaos_cases WHERE id=%s AND org_id=%s",
            (case_id, principal.org_id),
        ).fetchone()
        if not case:
            raise ApiError(404, "not_found", "Chaos case not found")

        conn.execute(
            "UPDATE chaos_cases SET human_label=%s WHERE id=%s",
            (body.human_label, case_id),
        )
        write_audit(
            conn, principal.user_id, "chaos_case.labelled", "chaos_case", case_id,
            after={"human_label": body.human_label},
        )

    return {"case_id": str(case_id), "human_label": body.human_label}


# ─── POST /v1/chaos-issues/{issue_id}/resolve ────────────────────────────────

class ResolveBody(BaseModel):
    status: str  # accepted | rejected


@router.post("/chaos-issues/{issue_id}/resolve")
def resolve_issue(issue_id: uuid.UUID, body: ResolveBody,
                  principal: Principal = Depends(require("run_chaos"))):
    if body.status not in ("accepted", "rejected"):
        raise ApiError(400, "bad_request", "status must be accepted or rejected")

    with tenant_conn(principal.org_id, principal.user_id) as conn:
        issue = conn.execute(
            "SELECT id FROM chaos_issues WHERE id=%s AND org_id=%s",
            (issue_id, principal.org_id),
        ).fetchone()
        if not issue:
            raise ApiError(404, "not_found", "Chaos issue not found")

        conn.execute(
            "UPDATE chaos_issues SET status=%s WHERE id=%s",
            (body.status, issue_id),
        )
        write_audit(
            conn, principal.user_id, f"chaos_issue.{body.status}", "chaos_issue", issue_id,
            after={"status": body.status},
        )

    return {"issue_id": str(issue_id), "status": body.status}


# ─── Private LLM helper ──────────────────────────────────────────────────────

def _llm_clarification(rule: dict, ambiguous_cases: list) -> str:
    try:
        import json
        from openai import OpenAI
        client = OpenAI()
        examples = "\n".join(
            f"  - \"{c['text']}\" (expected: {c['intended_label']}, "
            f"readers: {c['majority_verdict']}, agreement: {c['agreement']:.0%})"
            for c in ambiguous_cases[:3]
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": (
                    f"Rule: {rule['key']} – {rule['description']}\n"
                    f"Ambiguous cases:\n{examples}\n\n"
                    "Write one sentence of clarification to make this rule less ambiguous. "
                    "Return only the sentence."
                ),
            }],
            max_tokens=100,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return (
            "Consider adding specific examples of pass and fail cases. "
            "One exclamation mark is acceptable in social posts. "
            "No emoji in press releases or legal notices."
        )
