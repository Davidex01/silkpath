# backend/tests/test_chat.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _create_deal_and_headers(client: TestClient) -> tuple[str, dict]:
    # Register org+user
    r = client.post("/auth/register", json={
        "email": "chat@example.com",
        "password": "123456",
        "name": "Chat User",
        "orgName": "ChatOrg",
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
                "name": "Chat Item",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "chat-test"
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
                "name": "Chat Item",
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


def test_chat_flow_with_translation(client: TestClient):
    deal_id, headers = _create_deal_and_headers(client)

    # 1. GET /chats?dealId=... -> auto-create chat
    r = client.get(f"/chats?dealId={deal_id}", headers=headers)
    assert r.status_code == 200
    chats = r.json()
    assert len(chats) == 1
    chat_id = chats[0]["id"]

    # 2. POST message
    r = client.post(f"/chats/{chat_id}/messages", json={
        "text": "Привет, проверка автоперевода",
        "lang": "ru"
    }, headers=headers)
    assert r.status_code == 201
    msg = r.json()
    msg_id = msg["id"]
    assert msg["originalLang"] == "ru"

    # 3. GET messages
    r = client.get(f"/chats/{chat_id}/messages", headers=headers)
    assert r.status_code == 200
    msgs = r.json()
    assert len(msgs) == 1
    assert msgs[0]["id"] == msg_id

    # 4. Translate to Chinese
    r = client.post(
        f"/chats/{chat_id}/messages/{msg_id}/translate",
        json={"targetLang": "zh-CN"},
        headers=headers,
    )
    assert r.status_code == 200
    tr = r.json()
    assert tr["targetLang"] == "zh-CN"
    assert tr["text"].startswith("[CN auto]")