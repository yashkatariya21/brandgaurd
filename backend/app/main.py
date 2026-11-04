from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth
from .api import facts
from .api import rules
from .api import content
from .api import blast_radius
from .api import findings
from .core.config import load_settings
from .core.db import close_pool, open_pool
from .core.errors import install_error_handlers


@asynccontextmanager
async def lifespan(_: FastAPI):
    open_pool()
    yield
    close_pool()


app = FastAPI(title="BrandGuard API", version="0.2.0", lifespan=lifespan)
install_error_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=load_settings().cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

# Routers
app.include_router(auth.router)
app.include_router(facts.router)
app.include_router(rules.router)
app.include_router(content.router)
app.include_router(blast_radius.router)
app.include_router(findings.router)


@app.get("/health")
def health():
    from .core.db import tenant_conn

    with tenant_conn() as conn:
        conn.execute("SELECT 1")
    return {"status": "ok"}
