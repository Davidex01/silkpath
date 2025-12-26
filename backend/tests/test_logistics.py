# backend/tests/test_logistics.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _create_deal(client: TestClient) -> tuple[str, dict]:
    # Register org+user
    r = client.post("/auth/register", json={
        "email": "logistics@example.com",
        "password": "123456",
        "name": "Logistics User",
        "orgName": "LogisticsOrg",
        "orgCountry": "RU",
        "orgRole": "both"
    })
    assert r.status_code == 201
    data = r.json()
    token = data["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    org_id = data["org"]["id"]

    # Create RFQ
    r = client.post("/rfqs", json={
        "supplierOrgId": org_id,
        "items": [
            {
                "productId": None,
                "name": "Logistics Item",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "logistics-test"
            }
        ]
    }, headers=headers)
    assert r.status_code == 201
    rfq_id = r.json()["id"]

    # Send RFQ
    r = client.post(f"/rfqs/{rfq_id}/send", headers=headers)
    assert r.status_code == 200

    # Create offer
    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Logistics Item",
                "qty": 10,
                "unit": "piece",
                "price": 100,
                "subtotal": 1000
            }
        ],
        "incoterms": "FOB Shenzhen",
        "paymentTerms": "100% prepayment",
        "validUntil": None
    }, headers=headers)
    assert r.status_code == 201
    offer_id = r.json()["id"]

    # Accept offer -> get deal
    r = client.post(f"/offers/{offer_id}/accept", headers=headers)
    assert r.status_code == 200
    deal_id = r.json()["deal"]["id"]
    return deal_id, headers


def test_deal_logistics_flow(client: TestClient):
    deal_id, headers = _create_deal(client)

    # Initially: logistics should exist and delivered = False
    r = client.get(f"/deals/{deal_id}/logistics", headers=headers)
    assert r.status_code == 200
    state = r.json()
    assert state["delivered"] is False
    assert state["current"] == "Production"

    # Simulate delivery
    r = client.post(f"/deals/{deal_id}/logistics/simulate", headers=headers)
    assert r.status_code == 200
    state2 = r.json()
    assert state2["delivered"] is True
    assert state2["current"] == "Delivered to warehouse"
    assert state2["deliveredAt"] is not None

    # Check that /deals/{id} also reflects updated logistics
    r = client.get(f"/deals/{deal_id}", headers=headers)
    assert r.status_code == 200
    agg = r.json()
    deal = agg["deal"]
    assert deal["logistics"]["delivered"] is True
    assert deal["logistics"]["current"] == "Delivered to warehouse"