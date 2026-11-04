import time

import bcrypt
import jwt

from .config import load_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


# Used so that login takes similar time whether or not the email exists.
DUMMY_HASH = hash_password("timing-equalisation-only")


def create_token(user_id, org_id, role: str) -> str:
    s = load_settings()
    now = int(time.time())
    payload = {"sub": str(user_id), "org": str(org_id), "role": role, "iat": now, "exp": now + s.jwt_ttl_minutes * 60}
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, load_settings().jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub", "org"]})
