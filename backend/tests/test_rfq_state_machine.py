# backend/tests/test_rfq_state_machine.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _register_both(client: TestClient, email: str = "state@example.com"):
    r = client.post("/auth/register", json={
        "email": email,
        "password": "123456",
        "name": "State User",
        "orgName": "StateOrg",
        "orgCountry": "RU",
        "orgRole": "both",
    })
    assert r.status_code == 201
    data = r.json()
    token = data["tokens"]["accessToken"]
    org_id = data["org"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, org_id


def test_cannot_create_offer_for_draft_rfq(client: TestClient):
    headers, org_id = _register_both(client, "state1@example.com")

    # Create RFQ, but do NOT send it
    r = client.post("/rfqs", json={
        "supplierOrgId": org_id,
        "items": [
            {
                "productId": None,
                "name": "Item X",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "test"
            }
        ]
    }, headers=headers)
    assert r.status_code == 201
    rfq_id = r.json()["id"]

    # Try to create offer while RFQ is still draft -> 409
    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Item X",
                "qty": 10,
                "unit": "piece",
                "price": 100,
                "subtotal": 1000
            }
        ],
        "incoterms": "FOB",
        "paymentTerms": "100% prepayment",
        "validUntil": None
    }, headers=headers)
    assert r.status_code == 409


def test_cannot_accept_offer_twice(client: TestClient):
    headers, org_id = _register_both(client, "state2@example.com")

    # Normal RFQ -> send -> offer -> accept flow
    r = client.post("/rfqs", json={
        "supplierOrgId": org_id,
        "items": [
            {
                "productId": None,
                "name": "Item Y",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "test"
            }
        ]
    }, headers=headers)
    assert r.status_code == 201
    rfq_id = r.json()["id"]

    r = client.post(f"/rfqs/{rfq_id}/send", headers=headers)
    assert r.status_code == 200

    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Item Y",
                "qty": 10,
                "unit": "piece",
                "price": 100,
                "subtotal": 1000
            }
        ],
        "incoterms": "FOB",
        "paymentTerms": "100% prepayment",
        "validUntil": None
    }, headers=headers)
    assert r.status_code == 201
    offer_id = r.json()["id"]

    # First accept -> OK
    r = client.post(f"/offers/{offer_id}/accept", headers=headers)
    assert r.status_code == 200

    # Second accept -> 409
    r = client.post(f"/offers/{offer_id}/accept", headers=headers)
    assert r.status_code == 409