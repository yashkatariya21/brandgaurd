import re
import uuid
from typing import Optional

import psycopg.errors
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field, field_validator

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, get_principal
from ..core.security import DUMMY_HASH, create_token, hash_password, verify_password

router = APIRouter(prefix="/v1")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$")


class RegisterIn(BaseModel):
    org_name: str = Field(min_length=2, max_length=120)
    org_slug: str
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=10, max_length=72)

    @field_validator("org_slug")
    @classmethod
    def _slug(cls, v: str) -> str:
        v = v.lower()
        if not SLUG.match(v):
            raise ValueError("slug must be 3-40 characters: lowercase letters, digits, hyphens")
        return v

    @field_validator("password")
    @classmethod
    def _bcrypt_byte_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 UTF-8 bytes")
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)
    org_slug: Optional[str] = None


@router.post("/auth/register", status_code=201)
def register(body: RegisterIn):
    org_id, user_id = uuid.uuid4(), uuid.uuid4()
    email = body.email.lower()
    try:
        with tenant_conn(org_id, user_id) as conn:
            if conn.execute("SELECT 1 FROM organisations WHERE slug = %s", (body.org_slug,)).fetchone():
                raise ApiError(409, "conflict", "Organisation slug is already taken")
            if conn.execute("SELECT 1 FROM users WHERE lower(email) = %s", (email,)).fetchone():
                raise ApiError(409, "conflict", "An account with this email already exists")
            conn.execute("INSERT INTO organisations (id, name, slug) VALUES (%s, %s, %s)", (org_id, body.org_name, body.org_slug))
            conn.execute(
                "INSERT INTO users (id, email, display_name, password_hash) VALUES (%s, %s, %s, %s)",
                (user_id, email, body.display_name, hash_password(body.password)),
            )
            conn.execute("INSERT INTO memberships (org_id, user_id, role) VALUES (%s, %s, 'admin')", (org_id, user_id))
            write_audit(conn, user_id, "org.registered", "organisation", org_id, after={"slug": body.org_slug})
    except psycopg.errors.UniqueViolation:
        raise ApiError(409, "conflict", "Organisation or account already exists")
    return {"token": create_token(user_id, org_id, "admin"), "org_id": str(org_id), "role": "admin"}


@router.post("/auth/login")
def login(body: LoginIn):
    email = body.email.lower()
    with tenant_conn() as conn:
        user = conn.execute("SELECT id, password_hash FROM users WHERE lower(email) = %s", (email,)).fetchone()
    ok = verify_password(body.password, user["password_hash"] if user else DUMMY_HASH)
    if not user or not ok:
        raise ApiError(401, "auth_required", "Invalid email or password")
    query = (
        "SELECT m.org_id, m.role FROM memberships m JOIN organisations o ON o.id = m.org_id WHERE m.user_id = %s"
        + (" AND o.slug = %s" if body.org_slug else "")
        + " ORDER BY m.created_at LIMIT 1"
    )
    params = (user["id"], body.org_slug) if body.org_slug else (user["id"],)
    with tenant_conn(None, user["id"]) as conn:
        membership = conn.execute(query, params).fetchone()
    if membership is None:
        raise ApiError(401, "auth_required", "Invalid email or password")
    with tenant_conn(membership["org_id"], user["id"]) as conn:
        write_audit(conn, user["id"], "auth.login", "user", user["id"])
    return {"token": create_token(user["id"], membership["org_id"], membership["role"]),
            "org_id": str(membership["org_id"]), "role": membership["role"]}


@router.get("/me")
def me(principal: Principal = Depends(get_principal)):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        user = conn.execute("SELECT id, email, display_name FROM users WHERE id = %s", (principal.user_id,)).fetchone()
        org = conn.execute("SELECT id, name, slug, ai_disclosure_ack FROM organisations WHERE id = %s", (principal.org_id,)).fetchone()
    return {"user": {**user, "id": str(user["id"])}, "org": {**org, "id": str(org["id"])}, "role": principal.role}
