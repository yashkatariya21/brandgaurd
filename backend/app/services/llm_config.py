"""Shared configuration for optional hosted-model calls."""
from __future__ import annotations

import os


class ProviderCallError(RuntimeError):
    """A hosted-model call or response failed; callers must label any fallback."""


def configured_model() -> str:
    """Return the model ID used consistently by provider calls and audit rows."""
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()
    return model or "gpt-4o-mini"
