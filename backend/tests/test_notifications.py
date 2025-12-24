# backend/tests/test_notifications.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _register_user(client: TestClient, email: str, role: str):
    r = client.post("/auth/register", json={
        "email": email,
        "password": "123456",
        "name": email.split("@")[0],
        "orgName": f"Org-{email}",
        "orgCountry": "RU",
        "orgRole": role,
    })
    assert r.status_code == 201
    data = r.json()
    return {
        "token": data["tokens"]["accessToken"],
        "orgId": data["org"]["id"],
        "userId": data["user"]["id"],
    }


def test_notifications_flow(client: TestClient):
    # Register buyer and supplier
    buyer = _register_user(client, "buyer@example.com", "buyer")
    supplier = _register_user(client, "supplier@example.com", "supplier")

    buyer_headers = {"Authorization": f"Bearer {buyer['token']}"}
    supplier_headers = {"Authorization": f"Bearer {supplier['token']}"}

    # 1. Buyer creates RFQ for supplier
    r = client.post("/rfqs", json={
        "supplierOrgId": supplier["orgId"],
        "items": [
            {
                "productId": None,
                "name": "Notif Item",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "notif-test"
            }
        ]
    }, headers=buyer_headers)
    assert r.status_code == 201
    rfq_id = r.json()["id"]

    # RFQ sent
    r = client.post(f"/rfqs/{rfq_id}/send", headers=buyer_headers)
    assert r.status_code == 200

    # Supplier should see notification about RFQ
    r = client.get("/notifications?unreadOnly=true", headers=supplier_headers)
    assert r.status_code == 200
    supplier_notifs = r.json()
    assert len(supplier_notifs) >= 1
    rfq_notif = supplier_notifs[0]
    assert rfq_notif["entityType"] == "rfq"
    assert rfq_notif["entityId"] == rfq_id

    # 2. Supplier creates offer
    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Notif Item",
                "qty": 10,
                "unit": "piece",
                "price": 100,
                "subtotal": 1000
            }
        ],
        "incoterms": "FOB",
        "paymentTerms": "100% prepayment",
        "validUntil": None
    }, headers=supplier_headers)
    assert r.status_code == 201
    offer_id = r.json()["id"]

    # Buyer should see notification about offer
    r = client.get("/notifications?unreadOnly=true", headers=buyer_headers)
    assert r.status_code == 200
    buyer_notifs = r.json()
    assert len(buyer_notifs) >= 1
    offer_notif = buyer_notifs[0]
    assert offer_notif["entityType"] == "offer"
    assert offer_notif["entityId"] == offer_id

    # 3. Buyer accepts offer -> creates deal
    r = client.post(f"/offers/{offer_id}/accept", headers=buyer_headers)
    assert r.status_code == 200
    deal_id = r.json()["deal"]["id"]

    # 4. Buyer creates escrow payment
    r = client.post("/payments", json={
        "dealId": deal_id,
        "amount": 1000,
        "currency": "RUB",
        "fxQuoteId": None
    }, headers=buyer_headers)
    assert r.status_code == 201
    payment_id = r.json()["id"]

    # Supplier should see payment notification
    r = client.get("/notifications?unreadOnly=true", headers=supplier_headers)
    assert r.status_code == 200
    supplier_notifs2 = r.json()
    # ƒолжно быть как минимум два уведомлени€: RFQ + payment
    assert len(supplier_notifs2) >= 2
    payment_notif = next(n for n in supplier_notifs2 if n["entityType"] == "payment")
    assert payment_notif["entityId"] == payment_id

    # 5. Mark one notification read
    notif_id = payment_notif["id"]
    r = client.post(f"/notifications/{notif_id}/read", headers=supplier_headers)
    assert r.status_code == 200
    updated = r.json()
    assert updated["read"] is True
    assert updated["readAt"] is not None

    # 6. Unread-only now should not include this notification
    r = client.get("/notifications?unreadOnly=true", headers=supplier_headers)
    assert r.status_code == 200
    unread = r.json()
    ids = [n["id"] for n in unread]
    assert notif_id not in ids