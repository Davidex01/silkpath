# backend/tests/test_auth.py
from __future__ import annotations

from fastapi.testclient import TestClient


def test_register_and_login_and_me(client: TestClient):
    # 1. Register
    r = client.post("/auth/register", json={
        "email": "auth@example.com",
        "password": "123456",
        "name": "Auth User",
        "orgName": "AuthOrg",
        "orgCountry": "RU",
        "orgRole": "both",
    })
    assert r.status_code == 201
    data = r.json()
    token = data["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. /auth/me
    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 200
    me = r.json()
    assert me["user"]["email"] == "auth@example.com"
    assert me["org"]["name"] == "AuthOrg"

    # 3. Login with same credentials
    r = client.post("/auth/login", json={
        "email": "auth@example.com",
        "password": "123456",
    })
    assert r.status_code == 200
    login_data = r.json()
    assert login_data["user"]["id"] == data["user"]["id"]
    assert login_data["org"]["id"] == data["org"]["id"]
    assert login_data["tokens"]["accessToken"]

    # 4. Login with wrong password -> 401
    r = client.post("/auth/login", json={
        "email": "auth@example.com",
        "password": "wrongpass",
    })
    assert r.status_code == 401