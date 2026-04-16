from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import Base, engine
from app.routes import (
    ai,
    applications,
    audit,
    citizen,
    fairness,
    health,
    policy,
    review,
)

app = FastAPI(
    title="WMO Zorgagent API",
    description="Privacy-by-design WMO aanvraagverwerking met AI-ondersteuning.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5678",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Idempotent DB init
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(health.router)
app.include_router(applications.router)
app.include_router(policy.router)
app.include_router(ai.router)
app.include_router(fairness.router)
app.include_router(review.router)
app.include_router(audit.router)
app.include_router(citizen.router)
