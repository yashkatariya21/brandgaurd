#!/usr/bin/env python3
"""
setup_demo.py — BrandGuard demo data loader.

Usage:
    API_URL=https://<render-url> SEED_PASSWORD=<password> python demo/setup_demo.py load

    # Windows:
    set API_URL=https://<your-render-url>
    set SEED_PASSWORD=<your-seed-password>
    python demo\\setup_demo.py load

What it does:
    1. Logs in as Brand Manager and proposes the two sample facts (support_hours, data_centres).
    2. Logs in as Brand Manager and submits the four content texts.
    3. Logs in as Approver and approves the two sample fact proposals.

Prerequisites:
    - Backend is running and already seeded (python -m app.seed was run).
    - SEED_PASSWORD matches the value used when seeding.
    - python-requests is available (pip install requests).
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' is not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)

API_URL  = os.environ.get("API_URL", "http://localhost:8000").rstrip("/")
SEED_PW  = os.environ.get("SEED_PASSWORD", "")
ORG_SLUG = os.environ.get("ORG_SLUG", "nimbusdesk")

DEMO_DIR = Path(__file__).parent

BRAND_EMAIL    = "brand@nimbusdesk.example"
APPROVER_EMAIL = "approver@nimbusdesk.example"


# ─── helpers ──────────────────────────────────────────────────────────────────

def login(email: str, password: str) -> str:
    resp = requests.post(
        f"{API_URL}/v1/auth/login",
        json={"email": email, "password": password, "org_slug": ORG_SLUG},
        timeout=30,
    )
    if not resp.ok:
        raise SystemExit(f"Login failed for {email}: {resp.status_code} {resp.text}")
    return resp.json()["token"]


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_fact(token: str, fact: dict) -> str:
    resp = requests.post(f"{API_URL}/v1/facts", json=fact, headers=headers(token), timeout=30)
    if resp.status_code == 409:
        print(f"  fact '{fact['key']}' already exists — skipping")
        return ""
    resp.raise_for_status()
    return resp.json()["fact_id"]


def submit_content(token: str, title: str, channel: str, body_text: str) -> str:
    resp = requests.post(
        f"{API_URL}/v1/content",
        json={"title": title, "channel": channel, "body_text": body_text},
        headers=headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["content_item_id"]


def list_facts(token: str) -> list:
    resp = requests.get(f"{API_URL}/v1/facts", headers=headers(token), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else data.get("facts", [])


def approve_version(token: str, fact_id: str, version_no: int) -> None:
    resp = requests.post(
        f"{API_URL}/v1/facts/{fact_id}/versions/{version_no}/approve",
        headers=headers(token),
        timeout=30,
    )
    if not resp.ok:
        print(f"  approve {fact_id} v{version_no}: {resp.status_code} {resp.text}")
    else:
        print(f"  approved {fact_id} v{version_no}")


# ─── main ──────────────────────────────────────────────────────────────────────

def cmd_load() -> None:
    if not SEED_PW:
        raise SystemExit("ERROR: set SEED_PASSWORD environment variable")

    print(f"Target: {API_URL}")
    print()

    # ── 1. Brand Manager: propose sample facts ──────────────────────────────
    print("Step 1/3 — logging in as Brand Manager …")
    bm_token = login(BRAND_EMAIL, SEED_PW)

    facts_raw = (DEMO_DIR / "1_repository" / "sample_facts.json").read_text()
    sample_facts: list[dict] = json.loads(facts_raw)
    new_fact_ids: list[tuple[str, int]] = []   # (fact_id, version_no)

    for f in sample_facts:
        print(f"  creating fact '{f['key']}' …")
        fact_id = create_fact(bm_token, f)
        if fact_id:
            new_fact_ids.append((fact_id, 1))

    # ── 2. Brand Manager: submit sample content texts ───────────────────────
    print()
    print("Step 2/3 — submitting sample content texts …")
    content_files = [
        ("2_content_review/content_sample_1_homepage_copy.txt",    "NimbusDesk Homepage Copy",   "web"),
        ("2_content_review/content_sample_2_press_release.txt",    "NimbusDesk Press Release",   "press"),
        ("3_red_team/redteam_sample_1_risky_claims.txt",           "Red Team Sample 1 — Risky Claims", "web"),
        ("3_red_team/redteam_sample_2_trust_and_ratings.txt",      "Red Team Sample 2 — Trust & Ratings", "social"),
    ]

    for rel_path, title, channel in content_files:
        body = (DEMO_DIR / rel_path).read_text(encoding="utf-8")
        print(f"  submitting '{title}' …")
        try:
            submit_content(bm_token, title, channel, body)
        except requests.HTTPError as exc:
            print(f"  WARNING: {exc}")

    # ── 3. Approver: approve the new fact proposals ─────────────────────────
    print()
    print("Step 3/3 — logging in as Approver to approve fact proposals …")
    appr_token = login(APPROVER_EMAIL, SEED_PW)

    # Fetch fresh list to get the fact_ids by key
    all_facts = list_facts(appr_token)
    sample_keys = {f["key"] for f in sample_facts}

    for fact in all_facts:
        if fact["key"] not in sample_keys:
            continue
        version_no = fact.get("version_no", 1)
        if fact.get("version_status") in ("pending_approval", "draft"):
            approve_version(appr_token, fact["id"], version_no)
        else:
            print(f"  {fact['key']} already in status '{fact.get('version_status')}' — skip")

    print()
    print("Done. Demo data loaded successfully.")
    print("Tip: approve customer_count v2 manually (Brand Manager proposes, Approver approves)")
    print("to trigger the blast-radius scenario.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "load"
    if cmd == "load":
        cmd_load()
    else:
        print(f"Unknown command: {cmd}. Use 'load'.", file=sys.stderr)
        sys.exit(1)
