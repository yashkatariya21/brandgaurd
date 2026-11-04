"""Fail CI on tracked .env files and a small set of high-confidence secrets.

This is a guardrail, not a general-purpose secrets scanner and not a history scan.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SECRET_PATTERNS = (
    re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)
SENSITIVE_ENV_KEYS = {
    "OWNER_DB_PASSWORD",
    "APP_DB_PASSWORD",
    "JWT_SECRET",
    "SEED_PASSWORD",
    "OPENAI_API_KEY",
}


def main() -> int:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    tracked = [item.decode("utf-8", errors="replace") for item in result.stdout.split(b"\0") if item]
    failures: list[str] = []

    for name in tracked:
        base_name = Path(name).name
        if base_name.startswith(".env") and base_name != ".env.example":
            failures.append(f"tracked environment file: {name}")
            continue

        path = REPO_ROOT / name
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        if b"\0" in raw:
            continue
        text = raw.decode("utf-8", errors="replace")
        if any(pattern.search(text) for pattern in SECRET_PATTERNS):
            failures.append(f"high-confidence credential pattern in tracked file: {name}")

        if name == ".env.example":
            for line_number, line in enumerate(text.splitlines(), start=1):
                key, separator, value = line.partition("=")
                if not separator or key.strip() not in SENSITIVE_ENV_KEYS or not value.strip():
                    continue
                if "replace-with-" not in value.strip().lower():
                    failures.append(
                        f"non-placeholder value for {key.strip()} in .env.example:{line_number}"
                    )

    if failures:
        print("Secret guard failed:")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print(f"Secret guard passed for {len(tracked)} tracked files (current index only).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
