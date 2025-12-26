# backend/tests/test_notifications.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _register_user(client: TestClient, email: str, role: str):
    """Helper: register user+org and return auth info."""
    r = client.post("/auth/register", json={
        "email": email,
        "password": "123456",
        "name": email.split("@")[0],
        "orgName": f"Org-{email}",
        "orgCountry": "RU",
        "orgRole": role,
    })
    assert r.status_code == 201, f"Register failed for {email}: {r.json()}"
    data = r.json()
    return {
        "token": data["tokens"]["accessToken"],
        "orgId": data["org"]["id"],
        "userId": data["user"]["id"],
    }


def test_notifications_flow(client: TestClient):
    # 1. Register buyer and supplier
    buyer = _register_user(client, "buyer_notifications@example.com", "buyer")
    supplier = _register_user(client, "supplier_notifications@example.com", "supplier")

    buyer_headers = {"Authorization": f"Bearer {buyer['token']}"}
    supplier_headers = {"Authorization": f"Bearer {supplier['token']}"}

    # === STEP 1: Buyer creates RFQ for supplier ===
    r = client.post("/rfqs", json={
        "supplierOrgId": supplier["orgId"],
        "items": [
            {
                "productId": None,
                "name": "Notif Item",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "notif-test",
            }
        ],
    }, headers=buyer_headers)
    assert r.status_code == 201, f"RFQ create failed: {r.json()}"
    rfq_id = r.json()["id"]

    # RFQ sent
    r = client.post(f"/rfqs/{rfq_id}/send", headers=buyer_headers)
    assert r.status_code == 200, f"RFQ send failed: {r.json()}"

    # Supplier should see at least one unread notification about RFQ
    r = client.get("/notifications?unreadOnly=true", headers=supplier_headers)
    assert r.status_code == 200, f"Supplier notifications (after RFQ) failed: {r.json()}"
    supplier_notifs_after_rfq = r.json()
    assert isinstance(supplier_notifs_after_rfq, list), f"Expected list, got: {supplier_notifs_after_rfq}"
    assert len(supplier_notifs_after_rfq) >= 1, (
        f"Expected at least 1 RFQ notification for supplier, got: {supplier_notifs_after_rfq}"
    )

    # === STEP 2: Supplier creates offer ===
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
                "subtotal": 1000,
            }
        ],
        "incoterms": "FOB",
        "paymentTerms": "100% prepayment",
        "validUntil": None,
    }, headers=supplier_headers)
    assert r.status_code == 201, f"Offer create failed: {r.json()}"
    offer_id = r.json()["id"]

    # Buyer should see at least one unread notification about offer
    r = client.get("/notifications?unreadOnly=true", headers=buyer_headers)
    assert r.status_code == 200, f"Buyer notifications (after Offer) failed: {r.json()}"
    buyer_notifs_after_offer = r.json()
    assert isinstance(buyer_notifs_after_offer, list), f"Expected list, got: {buyer_notifs_after_offer}"
    assert len(buyer_notifs_after_offer) >= 1, (
        f"Expected at least 1 Offer notification for buyer, got: {buyer_notifs_after_offer}"
    )

    # === STEP 3: Buyer accepts offer and creates deal ===
    r = client.post(f"/offers/{offer_id}/accept", headers=buyer_headers)
    assert r.status_code == 200, f"Offer accept failed: {r.json()}"
    deal_id = r.json()["deal"]["id"]

    # === STEP 4: Buyer creates escrow payment ===
    r = client.post("/payments", json={
        "dealId": deal_id,
        "amount": 1000,
        "currency": "RUB",
        "fxQuoteId": None,
    }, headers=buyer_headers)
    assert r.status_code == 201, f"Payment create failed: {r.json()}"
    payment_id = r.json()["id"]

    # Supplier should see at least one unread notification about payment
    r = client.get("/notifications?unreadOnly=true", headers=supplier_headers)
    assert r.status_code == 200, f"Supplier notifications (after Payment) failed: {r.json()}"
    supplier_notifs_after_payment = r.json()
    assert isinstance(supplier_notifs_after_payment, list), f"Expected list, got: {supplier_notifs_after_payment}"
    assert len(supplier_notifs_after_payment) >= 1, (
        f"Expected at least 1 Payment notification for supplier, got: {supplier_notifs_after_payment}"
    )

    # Найдём хотя бы одно уведомление по платежу
    payment_notif = None
    for n in supplier_notifs_after_payment:
        if n.get("entityType") == "payment" and n.get("entityId") == payment_id:
            payment_notif = n
            break

    assert payment_notif is not None, (
        f"Expected payment notification with entityId={payment_id}, got: {supplier_notifs_after_payment}"
    )

    notif_id = payment_notif["id"]

    # === STEP 5: Mark one notification read ===
    r = client.post(f"/notifications/{notif_id}/read", headers=supplier_headers)
    assert r.status_code == 200, f"Mark notification read failed: {r.json()}"
    updated = r.json()
    assert updated["read"] is True
    assert updated["readAt"] is not None

    # === STEP 6: Unread-only now should not include this notification ===
    r = client.get("/notifications?unreadOnly=true", headers=supplier_headers)
    assert r.status_code == 200, f"Unread notifications fetch failed: {r.json()}"
    unread = r.json()
    ids = [n["id"] for n in unread]
    assert notif_id not in ids, (
        f"Notification {notif_id} should not be in unread list, got: {unread}"
    )