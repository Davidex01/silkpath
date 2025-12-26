# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth as auth_routes
from app.api.v1 import orgs as org_routes
from app.api.v1 import files as files_routes
from app.api.v1 import products as products_routes
from app.api.v1 import rfq_deals as rfq_deals_routes
from app.api.v1 import wallets_fx_payments as wallets_fx_routes
from app.api.v1 import analytics as analytics_routes
from app.api.v1 import documents as documents_routes
from app.api.v1 import logistics as logistics_routes
from app.api.v1 import chats as chats_routes
from app.api.v1 import notifications as notifications_routes

app = FastAPI(
    title="SilkFlow API",
    version="0.1.0",
    description="Backend for SilkFlow B2B messenger (MVP)",
)

# CORS для фронта (Vite по умолчанию на 5173)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_routes.router)
app.include_router(org_routes.router)
app.include_router(files_routes.router)
app.include_router(products_routes.router)
app.include_router(rfq_deals_routes.router)
app.include_router(wallets_fx_routes.router)
app.include_router(analytics_routes.router)
app.include_router(documents_routes.router)
app.include_router(logistics_routes.router)
app.include_router(chats_routes.router)
app.include_router(notifications_routes.router)   
