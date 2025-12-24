# backend/tests/test_analytics.py
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _create_deal(client: TestClient) -> tuple[str, dict]:
    """
    Helper: register org, create RFQ, offer, accept -> return (dealId, headers).
    Revenue (order.totalAmount) will be 1000 for easier math.
    """
    # Register
    r = client.post("/auth/register", json={
        "email": "analytics@example.com",
        "password": "123456",
        "name": "Analytics User",
        "orgName": "AnalyticsOrg",
        "orgCountry": "RU",
        "orgRole": "both",
    })
    assert r.status_code == 201, f"Register failed: {r.json()}"
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
                "name": "Analytics Item",
                "qty": 100,
                "unit": "piece",
                "targetPrice": 10,
                "notes": "analytics-test",
            }
        ],
    }, headers=headers)
    assert r.status_code == 201, f"RFQ create failed: {r.json()}"
    rfq_id = r.json()["id"]

    # Send RFQ
    r = client.post(f"/rfqs/{rfq_id}/send", headers=headers)
    assert r.status_code == 200, f"RFQ send failed: {r.json()}"

    # Create offer: price * qty = 1000
    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Analytics Item",
                "qty": 100,
                "unit": "piece",
                "price": 10,
                "subtotal": 1000,
            }
        ],
        "incoterms": "FOB Shenzhen",
        "paymentTerms": "100% prepayment",
        "validUntil": None,
    }, headers=headers)
    assert r.status_code == 201, f"Offer create failed: {r.json()}"
    offer_id = r.json()["id"]

    # Accept offer -> get deal
    r = client.post(f"/offers/{offer_id}/accept", headers=headers)
    assert r.status_code == 200, f"Offer accept failed: {r.json()}"
    deal_id = r.json()["deal"]["id"]

    return deal_id, headers


def test_deal_unit_economics(client: TestClient):
    deal_id, headers = _create_deal(client)

    r = client.get(f"/analytics/deals/{deal_id}/unit-economics", headers=headers)
    assert r.status_code == 200, f"Analytics endpoint failed: {r.json()}"
    data = r.json()

    # Revenue should be exactly 1000 (from subtotal)
    assert data["dealId"] == deal_id
    assert data["revenue"] == pytest.approx(1000.0)

    cbd = data["costBreakdown"]

    # Based on shares in analytics service:
    # productCost = 0.75 * revenue
    # logisticsCost = 0.08 * revenue
    # dutiesTaxes = 0.07 * revenue
    # fxCost = 0.03 * revenue
    # commissions = 0.02 * revenue
    assert cbd["productCost"] == pytest.approx(750.0)
    assert cbd["logisticsCost"] == pytest.approx(80.0)
    assert cbd["dutiesTaxes"] == pytest.approx(70.0)
    assert cbd["fxCost"] == pytest.approx(30.0)
    assert cbd["commissions"] == pytest.approx(20.0)
    assert cbd["otherCost"] == pytest.approx(0.0)

    # Total cost and margin
    assert data["totalCost"] == pytest.approx(950.0)
    assert data["grossMarginAbs"] == pytest.approx(50.0)
    assert data["grossMarginPct"] == pytest.approx(5.0, rel=1e-3)