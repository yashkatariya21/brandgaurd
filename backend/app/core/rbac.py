from dataclasses import dataclass

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import tenant_conn
from .errors import ApiError
from .security import decode_token

ALL_ROLES = ("admin", "brand_manager", "approver", "manager", "creator", "external_creator")

# Mirrors the permission matrix in the Build Blueprint (Section 4).
# Finer rules (own content only, approved-only for external users) are enforced in each router.
PERMISSIONS = {
    "manage_members": ("admin",),
    "propose_version": ("admin", "brand_manager"),
    "approve_version": ("admin", "approver"),
    "view_repository": ALL_ROLES,
    "upload_documents": ("admin", "brand_manager"),
    "submit_content": ALL_ROLES,
    "decide_findings": ALL_ROLES,
    "manager_review": ("admin", "brand_manager", "approver", "manager"),
    "final_approval": ("admin", "approver"),
    "run_chaos": ("admin", "brand_manager"),
    "view_analytics": ("admin", "brand_manager", "approver", "manager", "creator"),
    "delete_content": ("admin", "brand_manager"),
}


@dataclass(frozen=True)
class Principal:
    user_id: str
    org_id: str
    role: str


_bearer = HTTPBearer(auto_error=False)


def get_principal(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> Principal:
    if creds is None:
        raise ApiError(401, "auth_required", "Missing bearer token")
    try:
        claims = decode_token(creds.credentials)
    except jwt.PyJWTError:
        raise ApiError(401, "auth_required", "Invalid or expired token")
    # Re-read the role from the database so revoked or changed roles take effect immediately.
    with tenant_conn(claims["org"], claims["sub"]) as conn:
        row = conn.execute(
            "SELECT role FROM memberships WHERE user_id = %s AND org_id = %s", (claims["sub"], claims["org"])
        ).fetchone()
    if row is None:
        raise ApiError(401, "auth_required", "Membership no longer valid")
    return Principal(user_id=claims["sub"], org_id=claims["org"], role=row["role"])


def can(role: str, action: str) -> bool:
    return role in PERMISSIONS.get(action, ())


def require(action: str):
    if action not in PERMISSIONS:
        raise KeyError(f"Unknown action {action}")

    def dependency(principal: Principal = Depends(get_principal)) -> Principal:
        if not can(principal.role, action):
            raise ApiError(403, "forbidden", f"Role {principal.role} may not perform {action}")
        return principal

    return dependency
