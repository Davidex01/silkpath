# backend/tests/test_full_flow.py
from __future__ import annotations

from fastapi.testclient import TestClient


def test_full_deal_flow_with_payment(client: TestClient):
    # 1. Register user & org
    r = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "123456",
        "name": "Test User",
        "orgName": "TestOrg",
        "orgCountry": "RU",
        "orgRole": "both"
    })
    assert r.status_code == 201
    data = r.json()
    org_id = data["org"]["id"]

    # 2. Check /orgs/me
    r = client.get("/orgs/me")
    assert r.status_code == 200
    assert r.json()["id"] == org_id

    # 3. Upload file for KYB
    files = {"file": ("test.txt", b"hello", "text/plain")}
    r = client.post("/files", files=files)
    assert r.status_code == 201
    file_id = r.json()["id"]

    # 4. Submit KYB
    r = client.post("/orgs/me/compliance", json={
        "documents": [
            {"type": "registration_certificate", "fileId": file_id},
            {"type": "tax_certificate", "fileId": file_id},
            {"type": "director_id", "fileId": file_id}
        ]
    })
    assert r.status_code == 200
    kyb = r.json()
    assert len(kyb["submittedDocs"]) == 3

    # 5. Create RFQ
    r = client.post("/rfqs", json={
        "supplierOrgId": org_id,
        "items": [
            {
                "productId": None,
                "name": "Test item",
                "qty": 100,
                "unit": "piece",
                "targetPrice": 10,
                "notes": "test"
            }
        ]
    })
    assert r.status_code == 201
    rfq_id = r.json()["id"]

    # 6. Send RFQ
    r = client.post(f"/rfqs/{rfq_id}/send")
    assert r.status_code == 200
    assert r.json()["status"] == "sent"

    # 7. Create Offer
    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Test item",
                "qty": 100,
                "unit": "piece",
                "price": 10,
                "subtotal": 1000
            }
        ],
        "incoterms": "FOB Shenzhen",
        "paymentTerms": "100% prepayment",
        "validUntil": None
    })
    assert r.status_code == 201
    offer_id = r.json()["id"]

    # 8. Accept Offer -> create Order & Deal
    r = client.post(f"/offers/{offer_id}/accept")
    assert r.status_code == 200
    payload = r.json()
    deal_id = payload["deal"]["id"]
    assert payload["deal"]["status"] == "ordered"

    # 9. Make Payment for deal
    r = client.post("/payments", json={
        "dealId": deal_id,
        "amount": 1000,
        "currency": "RUB",
        "fxQuoteId": None
    })
    assert r.status_code == 201
    payment = r.json()
    assert payment["status"] == "completed"

    # 10. Check that deal status changed to paid_partially
    r = client.get(f"/deals/{deal_id}")
    assert r.status_code == 200
    deal = r.json()["deal"]
    assert deal["status"] == "paid_partially"