"""T2 – Red Team API: run 3 personas over a content item.
T3 – Prosecutor vs Defender debate for a single finding.
"""
from __future__ import annotations

import logging
import hashlib
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from psycopg.types.json import Jsonb

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.redteam import _run_persona, run_prosecutor_defender, _has_llm, PERSONAS
from ..services.grounding import ground_runs
from ..services.debate_evidence import finding_evidence, demo_argument_evidence, safe_cached_debate
from ..services.llm_config import ProviderCallError, configured_model

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
def run_redteam(item_id: str, n: int = Query(default=3, ge=1, le=5),
                principal: Principal = Depends(require("submit_content"))):
    """Validate evidence and cluster repeated persona outputs; no AI verdict."""
    started = time.monotonic()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute("""SELECT ci.id, ci.current_version_id, cv.body_text
            FROM content_items ci JOIN content_versions cv ON cv.id=ci.current_version_id
            WHERE ci.id=%s AND ci.org_id=%s AND cv.org_id=%s""",
            (item_id, principal.org_id, principal.org_id)).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found or has no version")
        text, version_id = item['body_text'] or '', str(item['current_version_id'])
        facts = conn.execute("""SELECT f.id, f.key, v.version_no, v.value_text AS text
            FROM facts f JOIN fact_versions v ON v.id=f.current_version_id
            WHERE f.org_id=%s AND v.org_id=%s AND v.status='approved' ORDER BY f.id""",
            (principal.org_id, principal.org_id)).fetchall()
        rules = conn.execute("""SELECT r.id, r.key, v.version_no, v.description AS text
            FROM rules r JOIN rule_versions v ON v.id=r.current_version_id
            WHERE r.org_id=%s AND v.org_id=%s AND v.status='approved' ORDER BY r.id""",
            (principal.org_id, principal.org_id)).fetchall()
        def records(rows):
            return [{'id': str(x['id']), 'key': x['key'], 'version': x['version_no'], 'text': x['text']} for x in rows]
        fact_records, rule_records = records(facts), records(rules)
        catalogue = {(kind, r['id'], r['version']): r['text']
                     for kind, items in [('fact', fact_records), ('rule', rule_records)] for r in items}
        # Live calls are disabled by the central fail-closed spend guard.
        requested_llm = _has_llm() and os.environ.get('REDTEAM_LIVE_ENABLED', '').lower() == 'true'
        if requested_llm and len(text) > 12000:
            raise ApiError(422, 'input_too_large', 'Live Red Team accepts at most 12,000 characters per run.')
        model = configured_model() if requested_llm else 'stub'
        fingerprint = {'version_id': version_id, 'text': text, 'facts': fact_records, 'rules': rule_records,
                       'personas': [p['name'] for p in PERSONAS], 'n': n, 'model': model, 'prompt': 'redteam-v2'}
        cache_key = hashlib.sha256(json.dumps(fingerprint, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))', (str(principal.org_id) + ':redteam:' + cache_key,))
        cached = conn.execute("""SELECT config FROM analysis_runs WHERE org_id=%s AND kind='redteam'
            AND status='done' AND config->>'cache_key'=%s ORDER BY created_at DESC LIMIT 1""",
            (principal.org_id, cache_key)).fetchone()
        if cached:
            return {**cached['config']['response'], 'cached': True}

        mode = 'llm' if requested_llm else 'demo'
        fact_json, rule_json = json.dumps(fact_records, ensure_ascii=False), json.dumps(rule_records, ensure_ascii=False)
        if requested_llm and len(fact_json) + len(rule_json) > 24000:
            raise ApiError(422, 'context_too_large', 'Live Red Team accepts at most 24,000 characters of approved facts and rules.')
        def one(persona, live):
            return _run_persona(persona, text, fact_json, rule_json, live, version_id)
        def execute(live):
            runs = [[] for _ in range(n)]
            if live:
                # At most 4*N concurrent calls, with one schema retry per call.
                with ThreadPoolExecutor(max_workers=min(20, n * len(PERSONAS))) as pool:
                    futures = [(i, p, pool.submit(one, p, True)) for i in range(n) for p in PERSONAS]
                    for i, persona, future in futures:
                        runs[i].extend({**f, 'persona': persona['name']} for f in future.result())
            else:
                for i in range(n):
                    for persona in PERSONAS:
                        runs[i].extend({**f, 'persona': persona['name']} for f in one(persona, False))
            return runs
        try:
            runs = execute(requested_llm)
        except ProviderCallError:
            logger.warning('Red Team provider failed; using complete deterministic fallback')
            mode = 'demo'
            runs = execute(False)
        clusters, drops, total = ground_runs(runs, text, version_id, catalogue)
        run_id = uuid.uuid4()
        conn.execute("""INSERT INTO analysis_runs (id,org_id,content_version_id,kind,status,started_at,
            created_by,model_id,prompt_version) VALUES (%s,%s,%s,'redteam','running',now(),%s,%s,'redteam-v2')""",
            (run_id, principal.org_id, version_id, principal.user_id, configured_model() if mode == 'llm' else 'stub'))
        for dropped in drops:
            conn.execute("""INSERT INTO redteam_drops (org_id,analysis_run_id,persona,reason,raw_finding)
                VALUES (%s,%s,%s,%s,%s)""", (principal.org_id, run_id, dropped['persona'], dropped['reason'], Jsonb(dropped['raw_finding'])))
        findings = []
        for f in clusters:
            finding_id = uuid.uuid4()
            confidence = 'medium' if f['stable'] else 'low'
            citations = f['citations']
            fact_id = next((c['ref_id'] for c in citations if c['kind'] == 'fact'), None)
            rule_id = next((c['ref_id'] for c in citations if c['kind'] == 'rule'), None)
            why = 'AI risk perspective, not legal advice.' if f['persona'] == 'Legal Eagle' else None
            conn.execute("""INSERT INTO findings (id,org_id,analysis_run_id,content_version_id,span_start,span_end,
                finding_type,source_kind,persona,fact_id,rule_id,issue,why_it_matters,severity,confidence,
                human_review_required,suggested_text,status,grounded,citations,stability_appearances,stability_total,stable)
                VALUES (%s,%s,%s,%s,%s,%s,'possible','persona',%s,%s,%s,%s,%s,%s,%s,true,%s,'open',true,%s,%s,%s,%s)""",
                (finding_id, principal.org_id, run_id, version_id, f['span_start'], f['span_end'], f['persona'],
                 fact_id, rule_id, f['issue'], why, f['severity'], confidence, f.get('suggested_fix'), Jsonb(citations),
                 f['appearances'], n, f['stable']))
            findings.append({'id': str(finding_id), 'persona': f['persona'], 'issue': f['issue'], 'severity': f['severity'],
                'confidence': confidence, 'why_it_matters': why, 'suggested_text': f.get('suggested_fix'),
                'span_start': f['span_start'], 'span_end': f['span_end'], 'human_review_required': True,
                'finding_type': 'possible', 'source_kind': 'persona', 'citations': citations,
                'appearances': f['appearances'], 'total_runs': n, 'stable': f['stable']})
        stable = [f for f in findings if f['stable']]
        unstable = [f for f in findings if not f['stable']]
        response = {'run_id': str(run_id), 'mode': mode, 'findings': stable, 'unstable_findings': unstable,
                    'cached': False, 'metrics': {'grounding_pass_rate': (total-len(drops))/total if total else None,
                    'ungrounded_drops': len(drops), 'stability_rate': len(stable)/len(findings) if findings else None,
                    'unstable_hidden': len(unstable), 'duration_seconds': round(time.monotonic()-started, 3),
                    'model': configured_model() if mode == 'llm' else 'deterministic heuristic'},
                    'demo_note': (('Provider unavailable; using deterministic demo heuristics. ' if requested_llm else 'Hosted calls are disabled until a spending cap is enforced. Demo heuristics. ') + 'Repeated agreement is trivial, not measured reliability.' if mode == 'demo' else None)}
        conn.execute("UPDATE analysis_runs SET status='done',finished_at=now(),config=%s WHERE id=%s AND org_id=%s",
                     (Jsonb({'cache_key': cache_key, 'response': response}), run_id, principal.org_id))
        write_audit(conn, principal.user_id, 'redteam.run', 'analysis_run', run_id,
                    after={'content_item_id': item_id, 'stable': len(stable), 'ungrounded_drops': len(drops), 'mode': mode})
        return response


def _debate_evidence(conn, org_id, finding):
    # Resolve only explicitly cited versions in this tenant; never use an
    # unverified model-supplied identifier as a database query without parsing.
    catalogue = {}
    citations = finding.get('citations') or []
    if isinstance(citations, list):
        for c in citations:
            if not isinstance(c, dict) or c.get('kind') not in ('fact', 'rule'):
                continue
            try:
                ref = str(uuid.UUID(c.get('ref_id', '')))
            except (ValueError, TypeError, AttributeError):
                continue
            version = c.get('version')
            if isinstance(version, bool) or not isinstance(version, int):
                continue
            if c['kind'] == 'fact':
                row = conn.execute("""SELECT fv.value_text AS text FROM fact_versions fv
                    JOIN facts f ON f.id=fv.fact_id AND f.org_id=fv.org_id
                    WHERE f.org_id=%s AND f.id=%s AND fv.version_no=%s
                      AND fv.status IN ('approved', 'superseded')""", (org_id, ref, version)).fetchone()
            else:
                row = conn.execute("""SELECT rv.description AS text FROM rule_versions rv
                    JOIN rules r ON r.id=rv.rule_id AND r.org_id=rv.org_id
                    WHERE r.org_id=%s AND r.id=%s AND rv.version_no=%s
                      AND rv.status IN ('approved', 'superseded')""", (org_id, ref, version)).fetchone()
            if row:
                catalogue[(c['kind'], ref, version)] = row['text']
    evidence, rejected = finding_evidence(finding, finding['content_text'] or '', catalogue)
    return {'evidence': evidence, 'invalid_evidence_count': rejected,
            'evidence_note': 'Finding evidence is revalidated against tenant records. It does not verify either argument or establish that a conclusion is correct.'}


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
               JOIN content_versions cv ON cv.id = f.content_version_id AND cv.org_id=f.org_id
               WHERE f.id = %s AND f.org_id = %s""",
            (finding_id, principal.org_id),
        ).fetchone()
        if not finding or (finding['source_kind'] == 'persona' and not finding['grounded']):
            raise ApiError(404, "not_found", "Finding not found")
        evidence_info = _debate_evidence(conn, principal.org_id, finding)
        # Return the cached debate for any severity.
        existing = conn.execute(
            "SELECT * FROM debates WHERE finding_id = %s AND org_id = %s",
            (finding_id, principal.org_id),
        ).fetchone()
        if existing:
            result = safe_cached_debate(_serialise(dict(existing)), evidence_info['evidence'])
            return {
                **result,
                **evidence_info,
                "cached": True,
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
                   JOIN fact_versions fv ON fv.id = f.current_version_id AND fv.org_id=f.org_id
                   WHERE f.id = %s AND f.org_id=%s AND fv.status='approved'""",
                (finding["fact_id"], principal.org_id),
            ).fetchone()
            if fact_row:
                fact_context_parts.append(f"Related fact: {fact_row['key']} = {fact_row['value_text']}")

        if finding["rule_id"]:
            rule_row = conn.execute(
                """SELECT r.key, rv.description
                   FROM rules r
                   JOIN rule_versions rv ON rv.id = r.current_version_id AND rv.org_id=r.org_id
                   WHERE r.id = %s AND r.org_id=%s AND rv.status='approved'""",
                (finding["rule_id"], principal.org_id),
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
        **evidence_info,
        "prosecutor_text": prosecutor_text,
        "defender_text": defender_text,
        "minimal_edit": minimal_edit,
        **(demo_argument_evidence(evidence_info['evidence']) if mode == 'demo' else {}),
        "mode": mode,
        "cached": False,
        **({"demo_note": (
            "Provider unavailable; deterministic demo arguments were used."
            if requested_llm else "Hosted calls are disabled until a spending cap is enforced. Demo prompts are not AI-generated."
        )} if mode == "demo" else {}),
        "footer": "Both arguments are shown so a person can decide. Neither is a verdict.",
    }
