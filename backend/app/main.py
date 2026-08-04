from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    app_info,
    approvals,
    auth,
    branches,
    checkins,
    export,
    members,
    membership_types,
    promotions,
    renewals,
    reports,
    scan,
    tv,
    walkins,
)

app = FastAPI(title="Gym Membership API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router_module in (
    app_info,
    auth,
    members,
    approvals,
    renewals,
    membership_types,
    branches,
    promotions,
    reports,
    walkins,
    checkins,
    tv,
    scan,
    export,
):
    app.include_router(router_module.router)
