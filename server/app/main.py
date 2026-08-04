"""VLAILA API.

Serves ~200 independently-hosted Virtual Labs origins, so CORS is a suffix
allowlist rather than a fixed origin list, and every endpoint is stateless.
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db
from .kb import get_kb
from .routers import chat, dashboards, kb as kb_router, session

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("vlaila")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    knowledge = get_kb()
    log.info(
        "VLAILA ready: %d knowledge base entries, llm provider=%s, db=%s",
        knowledge.count,
        settings.llm_provider,
        settings.database_url.split("://")[0],
    )
    yield


app = FastAPI(
    lifespan=lifespan,
    title="VLAILA API",
    version="1.0.0",
    description=(
        "Virtual Labs AI Lab Assistant. Proactive, experiment-grounded guidance "
        "for students, class analytics for instructors, and platform intelligence "
        "for administrators."
    ),
)

# A regex rather than a list: every lab has its own subdomain, and enumerating
# ~200 of them (and re-deploying whenever a new lab ships) is not workable.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://([a-z0-9-]+\.)*(vlabs\.ac\.in|vlab\.co\.in|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)",
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)


@app.middleware("http")
async def timing(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time-Ms"] = str(int((time.perf_counter() - started) * 1000))
    return response


@app.get("/health", tags=["ops"])
def health():
    knowledge = get_kb()
    return {
        "status": "ok",
        "version": app.version,
        "knowledge_base_entries": knowledge.count,
        "experiments": sorted(e.experiment_id for e in knowledge.all()),
        "llm_provider": settings.llm_provider,
        "llm_configured": settings.llm_configured,
        # Tier 1 works regardless of the model tier, so with no provider the
        # assistant is degraded (rules-only) rather than down.
        "degraded": settings.llm_provider == "offline" or not settings.llm_configured,
    }


app.include_router(session.router)
app.include_router(chat.router)
app.include_router(dashboards.router)
app.include_router(kb_router.router)
