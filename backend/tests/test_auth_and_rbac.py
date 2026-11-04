import uuid

from app.core.rbac import ALL_ROLES, PERMISSIONS, can

PW = "a-long-test-password"


def _register(client, slug=None, email=None):
    suffix = uuid.uuid4().hex[:10]
    body = {"org_name": "Test Org", "org_slug": slug or f"org-{suffix}", "email": email or f"u{suffix}@test.example",
            "display_name": "Tester", "password": PW}
    return client.post("/v1/auth/register", json=body), body


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_register_login_me(client):
    r, body = _register(client)
    assert r.status_code == 201 and r.json()["role"] == "admin"
    login = client.post("/v1/auth/login", json={"email": body["email"], "password": PW})
    assert login.status_code == 200
    me = client.get("/v1/me", headers={"Authorization": f"Bearer {login.json()['token']}"})
    assert me.status_code == 200
    assert me.json()["role"] == "admin" and me.json()["org"]["slug"] == body["org_slug"]


def test_wrong_password_and_unknown_email_look_the_same(client):
    _, body = _register(client)
    bad = client.post("/v1/auth/login", json={"email": body["email"], "password": "wrong-password-1"})
    unknown = client.post("/v1/auth/login", json={"email": "nobody@test.example", "password": "wrong-password-1"})
    assert bad.status_code == unknown.status_code == 401
    assert bad.json()["message"] == unknown.json()["message"]


def test_missing_and_garbage_tokens_rejected(client):
    assert client.get("/v1/me").status_code == 401
    r = client.get("/v1/me", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 401 and r.json()["error_code"] == "auth_required"


def test_duplicate_slug_and_email_conflict(client):
    r, body = _register(client)
    again = client.post("/v1/auth/register", json=body)
    assert again.status_code == 409 and again.json()["error_code"] == "conflict"


def test_validation_errors_use_standard_shape(client):
    r = client.post("/v1/auth/register", json={"org_name": "x", "org_slug": "Bad Slug!", "email": "nope", "display_name": "", "password": "short"})
    assert r.status_code == 422 and r.json()["error_code"] == "validation_failed"


def test_tokens_are_scoped_to_their_organisation(client):
    ra, _ = _register(client)
    rb, _ = _register(client)
    me_a = client.get("/v1/me", headers={"Authorization": f"Bearer {ra.json()['token']}"}).json()
    me_b = client.get("/v1/me", headers={"Authorization": f"Bearer {rb.json()['token']}"}).json()
    assert me_a["org"]["id"] != me_b["org"]["id"]


def test_permission_matrix():
    assert not can("creator", "approve_version")
    assert not can("creator", "final_approval")
    assert can("approver", "final_approval") and can("admin", "final_approval")
    assert not can("brand_manager", "final_approval")          # proposers cannot also be final approvers by role
    assert not can("external_creator", "view_analytics")
    assert can("brand_manager", "run_chaos") and not can("manager", "run_chaos")
    assert all(set(roles) <= set(ALL_ROLES) for roles in PERMISSIONS.values())
