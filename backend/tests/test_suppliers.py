# backend/tests/test_suppliers.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _register(client: TestClient, email: str, role: str, country: str = "RU"):
    r = client.post("/auth/register", json={
        "email": email,
        "password": "123456",
        "name": email.split("@")[0],
        "orgName": f"Org-{email}",
        "orgCountry": country,
        "orgRole": role,
    })
    assert r.status_code == 201
    data = r.json()
    return {
        "token": data["tokens"]["accessToken"],
        "orgId": data["org"]["id"],
    }


def test_list_suppliers_with_kyb_filter(client: TestClient):
    # Buyer org (should not appear in suppliers list)
    buyer = _register(client, "buyer_suppliers@example.com", "both")
    supplier1 = _register(client, "supplier1_suppliers@example.com", "supplier")
    supplier2 = _register(client, "supplier2_suppliers@example.com", "both")

    # Run KYB submit for supplier1 to mark as verified
    sup1_headers = {"Authorization": f"Bearer {supplier1['token']}"}
    r = client.post("/orgs/me/compliance", json={
        "documents": [
            {"type": "registration_certificate", "fileId": "file-1"},
            {"type": "tax_certificate", "fileId": "file-2"},
            {"type": "director_id", "fileId": "file-3"},
        ]
    }, headers=sup1_headers)
    assert r.status_code == 200
    profile = r.json()
    assert profile["status"] == "verified"

    # Now, from buyer perspective, list all suppliers (no filter)
    buyer_headers = {"Authorization": f"Bearer {buyer['token']}"}
    r = client.get("/orgs/suppliers", headers=buyer_headers)
    assert r.status_code == 200
    items = r.json()
    ids = {o["id"] for o in items}

    # supplier1 and supplier2 should be there
    assert supplier1["orgId"] in ids
    assert supplier2["orgId"] in ids

    # Only supplier1 has kybStatus=verified
    sup1 = next(o for o in items if o["id"] == supplier1["orgId"])
    assert sup1["kybStatus"] == "verified"
    sup2 = next(o for o in items if o["id"] == supplier2["orgId"])
    assert sup2["kybStatus"] != "verified"

    # With verifiedOnly=true, only supplier1 should remain
    r = client.get("/orgs/suppliers?verifiedOnly=true", headers=buyer_headers)
    assert r.status_code == 200
    verified_items = r.json()
    assert len(verified_items) == 1
    assert verified_items[0]["id"] == supplier1["orgId"]
    assert verified_items[0]["kybStatus"] == "verified"