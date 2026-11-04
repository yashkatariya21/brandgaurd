"""T2 – Red Team API: run 3 personas over a content item.
T3 – Prosecutor vs Defender debate for a single finding.
"""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from psycopg.types.json import Jsonb

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.redteam import run_red_team, run_prosecutor_defender, _has_llm, PERSONAS
from ..services.llm_config import ProviderCallError, configured_model
from ..services.retrieval import get_facts_context, get_rules_context, find_cited_fact, find_cited_rule

router = APIRouter(prefix="/v1")
logger = logging.getLogger(__name__)


def _serialise(row: dict) -> dict:
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


# ─── POST /v1/content/{item_id}/redteam ──────────────────────────────────────

@router.post("/content/{item_id}/redteam")
def run_redteam(item_id: str, principal: Principal = Depends(require("submit_content"))):
    """Run all 3 personas over the current version of a content item."""
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute(
            """SELECT ci.id, ci.current_version_id, cv.body_text
               FROM content_items ci
               JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.id = %s AND ci.org_id = %s""",
            (item_id, principal.org_id),
        ).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found or has no version")

        content_text = item["body_text"] or ""
        content_version_id = str(item["current_version_id"])

        facts_summary = get_facts_context(conn, principal.org_id)
        rules_summary = get_rules_context(conn, principal.org_id)

        requested_llm = _has_llm()
        mode = "llm" if requested_llm else "demo"

        # Create analysis run
        run_id = uuid.uuid4()
        conn.execute(
            """INSERT INTO analysis_runs
               (id, org_id, content_version_id, kind, status, started_at, created_by,
                model_id, prompt_version)
               VALUES (%s,%s,%s,'redteam','running',now(),%s,%s,%s)""",
            (run_id, principal.org_id, content_version_id, principal.user_id,
             configured_model() if requested_llm else "stub", "redteam-v1"),
        )

        # Run the red team
        try:
            persona_results = run_red_team(
                content_text, facts_summary, rules_summary, use_llm=requested_llm
            )
        except ProviderCallError:
            # Do not mix provider output with heuristic findings in one run.
            logger.warning("Red-team provider failed; using deterministic demo results")
            mode = "demo"
            persona_results = run_red_team(
                content_text, facts_summary, rules_summary, use_llm=False
            )
            conn.execute("UPDATE analysis_runs SET model_id='stub' WHERE id=%s", (run_id,))
        except Exception:
            conn.execute(
                "UPDATE analysis_runs SET status='failed', finished_at=now(), error=%s WHERE id=%s",
                ("Red-team processing failed", run_id),
            )
            logger.exception("Red-team processing failed")
            raise ApiError(500, "redteam_failed", "Red-team analysis failed")

        # Persist findings
        all_findings = []
        for persona_report in persona_results:
            persona_name = persona_report["persona"]
            raw_findings = persona_report["findings"]

            for raw in raw_findings:
                issue = raw.get("issue", "")
                severity = raw.get("severity", "medium")
                if severity not in ("low", "medium", "high", "critical"):
                    severity = "medium"

                # Only bind evidence when the model explicitly returns a repository key
                # and the key is validated against this tenant's approved records.
                cited = find_cited_fact(
                    conn, principal.org_id, raw.get("fact_key")
                ) or find_cited_rule(
                    conn, principal.org_id, raw.get("rule_key")
                )
                confidence = "medium" if cited else "low"

                # Determine span_start / span_end from span_hint
                span_hint = raw.get("span_hint", "")
                span_start: Optional[int] = None
                span_end: Optional[int] = None
                if span_hint and span_hint.strip():
                    idx = content_text.find(span_hint.strip())
                    if idx >= 0:
                        span_start = idx
                        span_end = idx + len(span_hint.strip())

                human_review_required = severity in ("high", "critical") or confidence == "low"

                # Legal persona note
                why_it_matters = raw.get("why_it_matters")
                if persona_name == "Legal Eagle" and not why_it_matters:
                    why_it_matters = "AI risk perspective, not legal advice."

                suggested_text = raw.get("suggested_fix")

                finding_id = uuid.uuid4()
                conn.execute(
                    """INSERT INTO findings
                       (id, org_id, analysis_run_id, content_version_id,
                        span_start, span_end,
                        finding_type, source_kind, persona,
                        fact_id, rule_id,
                        issue, why_it_matters, severity, confidence,
                        human_review_required, suggested_text, status)
                       VALUES (%s,%s,%s,%s,%s,%s,
                               'possible','persona',%s,
                               %s,%s,
                               %s,%s,%s,%s,%s,%s,'open')""",
                    (
                        finding_id, principal.org_id, run_id, content_version_id,
                        span_start, span_end,
                        persona_name,
                        cited.get("fact_id") if cited else None,
                        cited.get("rule_id") if cited else None,
                        issue, why_it_matters, severity, confidence,
                        human_review_required, suggested_text,
                    ),
                )
                all_findings.append({
                    "id": str(finding_id),
                    "persona": persona_name,
                    "issue": issue,
                    "severity": severity,
                    "confidence": confidence,
                    "why_it_matters": why_it_matters,
                    "suggested_text": suggested_text,
                    "span_start": span_start,
                    "span_end": span_end,
                    "human_review_required": human_review_required,
                    "finding_type": "possible",
                    "source_kind": "persona",
                })

        conn.execute(
            "UPDATE analysis_runs SET status='done', finished_at=now() WHERE id=%s", (run_id,)
        )
        write_audit(
            conn, principal.user_id, "redteam.run", "analysis_run", run_id,
            after={"content_item_id": item_id, "findings": len(all_findings), "mode": mode},
        )

    return {
        "run_id": str(run_id),
        "mode": mode,
        "findings": all_findings,
        **({"demo_note": (
            "Provider unavailable; the complete run used deterministic heuristics."
            if requested_llm else
            "No OPENAI_API_KEY set – running in demo mode. Results are heuristic, not AI-generated."
        )} if mode == "demo" else {}),
    }


# ─── POST /v1/findings/{finding_id}/debate ────────────────────────────────────

@router.post("/findings/{finding_id}/debate")
def debate_finding(finding_id: uuid.UUID, principal: Principal = Depends(require("decide_findings"))):
    """Generate Prosecutor vs Defender debate for one finding.
    Returns existing debate if one already exists (one per finding).
    """
    finding_id_str = str(finding_id)

    with tenant_conn(principal.org_id, principal.user_id) as conn:
        # Load the finding
        finding = conn.execute(
            """SELECT f.*, cv.body_text as content_text
               FROM findings f
               JOIN content_versions cv ON cv.id = f.content_version_id
               WHERE f.id = %s AND f.org_id = %s""",
            (finding_id, principal.org_id),
        ).fetchone()
        if not finding:
            raise ApiError(404, "not_found", "Finding not found")
        if finding["severity"] not in ("high", "critical"):
            raise ApiError(
                422, "debate_unavailable",
                "Prosecutor vs Defender is available only for high- or critical-severity findings",
            )

        # Return cached debate only after enforcing the same severity gate.
        existing = conn.execute(
            "SELECT * FROM debates WHERE finding_id = %s AND org_id = %s",
            (finding_id, principal.org_id),
        ).fetchone()
        if existing:
            result = _serialise(dict(existing))
            cached_mode = "demo" if result.get("model_id") == "stub" else "llm"
            return {
                **result,
                "mode": cached_mode,
                "cached": True,
                **({"demo_note": "This cached debate was generated by deterministic demo heuristics."}
                   if cached_mode == "demo" else {}),
                "footer": "Both arguments are shown so a person can decide. Neither is a verdict.",
            }

        issue = finding["issue"]
        content_text = finding["content_text"] or ""

        # Build fact context
        fact_context_parts = []
        if finding["fact_id"]:
            fact_row = conn.execute(
                """SELECT f.key, fv.value_text
                   FROM facts f
                   JOIN fact_versions fv ON fv.id = f.current_version_id
                   WHERE f.id = %s""",
                (finding["fact_id"],),
            ).fetchone()
            if fact_row:
                fact_context_parts.append(f"Related fact: {fact_row['key']} = {fact_row['value_text']}")

        if finding["rule_id"]:
            rule_row = conn.execute(
                """SELECT r.key, rv.description
                   FROM rules r
                   JOIN rule_versions rv ON rv.id = r.current_version_id
                   WHERE r.id = %s""",
                (finding["rule_id"],),
            ).fetchone()
            if rule_row:
                fact_context_parts.append(f"Related rule: {rule_row['key']} – {rule_row['description']}")

        fact_context = "\n".join(fact_context_parts) if fact_context_parts else "(no specific fact/rule cited)"

        requested_llm = _has_llm()
        mode = "llm" if requested_llm else "demo"

        # Run debate (no AI verdict returned)
        try:
            debate_result = run_prosecutor_defender(
                issue, content_text, fact_context, use_llm=requested_llm
            )
        except ProviderCallError:
            logger.warning("Debate provider failed; using deterministic demo arguments")
            mode = "demo"
            debate_result = run_prosecutor_defender(
                issue, content_text, fact_context, use_llm=False
            )

        # Strip any AI verdict — only human can decide
        prosecutor_text = debate_result.get("prosecutor", "")
        defender_text = debate_result.get("defender", "")
        minimal_edit = debate_result.get("minimal_edit")
        # Deliberately NOT storing verdict

        debate_id = uuid.uuid4()
        conn.execute(
            """INSERT INTO debates
               (id, org_id, finding_id, prosecutor_text, defender_text, minimal_edit,
                model_id, prompt_version)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                debate_id, principal.org_id, finding_id,
                prosecutor_text, defender_text, minimal_edit,
                configured_model() if mode == "llm" else "stub",
                "debate-v1",
            ),
        )

    return {
        "id": str(debate_id),
        "finding_id": finding_id_str,
        "prosecutor_text": prosecutor_text,
        "defender_text": defender_text,
        "minimal_edit": minimal_edit,
        "mode": mode,
        "cached": False,
        **({"demo_note": (
            "Provider unavailable; deterministic demo arguments were used."
            if requested_llm else "Demo mode – arguments are heuristic, not AI-generated."
        )} if mode == "demo" else {}),
        "footer": "Both arguments are shown so a person can decide. Neither is a verdict.",
    }
