"""No hosted calls while there is no enforceable monetary budget."""
import sys
from types import SimpleNamespace
import pytest
from app.api import chaos as chaos_api
from app.services import chaos, redteam
from app.services.llm_config import ProviderCallError


def test_provider_paths_fail_closed_even_with_key_and_opt_in(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only')
    monkeypatch.setenv('REDTEAM_LIVE_ENABLED', 'true')
    def forbidden(**kwargs):
        raise AssertionError('provider client must not be created')
    monkeypatch.setitem(sys.modules, 'openai', SimpleNamespace(OpenAI=forbidden))
    assert chaos._has_llm() is False
    assert redteam._has_llm() is False
    for call in [lambda: redteam._llm_call('system', 'user'),
                 lambda: chaos._llm_chaos({}),
                 lambda: chaos._llm_interpret('rule', 'text', 1),
                 lambda: chaos_api._llm_clarification({}, [])]:
        with pytest.raises(ProviderCallError, match='spending cap'):
            call()
