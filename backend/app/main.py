# app/main.py
from fastapi import FastAPI

from app.api.v1 import auth as auth_routes
from app.api.v1 import orgs as org_routes

app = FastAPI(
  title="SilkFlow API",
  version="0.1.0",
  description="Backend for SilkFlow B2B messenger (MVP)",
)


@app.get("/health")
def health():
  return {"status": "ok"}


# Подключаем v1-роутеры
app.include_router(auth_routes.router)
app.include_router(org_routes.router)