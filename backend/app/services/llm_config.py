"""Shared configuration for optional hosted-model calls."""
from __future__ import annotations

import os


class ProviderCallError(RuntimeError):
    """A hosted-model call or response failed; callers must label any fallback."""


def configured_model() -> str:
    """Return the model ID used consistently by provider calls and audit rows."""
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()
    return model or "gpt-4o-mini"


def hosted_calls_available() -> bool:
    """Fail closed until an approved monetary cap is enforced across workers.

    A key, a feature flag, or a request count is not a spending limit. Do not
    enable this without a durable, concurrent reservation/accounting mechanism.
    """
    return False


def require_hosted_calls_allowed() -> None:
    if not hosted_calls_available():
        raise ProviderCallError("Hosted calls are disabled until a monetary spending cap is enforced.")
