from fastapi import FastAPI

from app.api.v1 import auth as auth_routes
from app.api.v1 import orgs as org_routes
from app.api.v1 import files as files_routes
from app.api.v1 import products as products_routes
from app.api.v1 import rfq_deals as rfq_deals_routes

app = FastAPI(
    title="SilkFlow API",
    version="0.1.0",
    description="Backend for SilkFlow B2B messenger (MVP)",
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_routes.router)
app.include_router(org_routes.router)
app.include_router(files_routes.router)
app.include_router(products_routes.router)
app.include_router(rfq_deals_routes.router)  