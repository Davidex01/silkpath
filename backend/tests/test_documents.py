# backend/tests/test_documents.py
from __future__ import annotations

from fastapi.testclient import TestClient


def _create_deal(client: TestClient) -> str:
    # Register org+user
    r = client.post("/auth/register", json={
        "email": "docs@example.com",
        "password": "123456",
        "name": "Docs User",
        "orgName": "DocsOrg",
        "orgCountry": "RU",
        "orgRole": "both"
    })
    assert r.status_code == 201
    org_id = r.json()["org"]["id"]

    # Create RFQ
    r = client.post("/rfqs", json={
        "supplierOrgId": org_id,
        "items": [
            {
                "productId": None,
                "name": "Docs Item",
                "qty": 10,
                "unit": "piece",
                "targetPrice": 100,
                "notes": "docs-test"
            }
        ]
    })
    assert r.status_code == 201
    rfq_id = r.json()["id"]

    # Send RFQ
    r = client.post(f"/rfqs/{rfq_id}/send")
    assert r.status_code == 200

    # Create offer
    r = client.post(f"/rfqs/{rfq_id}/offers", json={
        "currency": "CNY",
        "items": [
            {
                "rfqItemIndex": 0,
                "productId": None,
                "name": "Docs Item",
                "qty": 10,
                "unit": "piece",
                "price": 100,
                "subtotal": 1000
            }
        ],
        "incoterms": "FOB Shenzhen",
        "paymentTerms": "100% prepayment",
        "validUntil": None
    })
    assert r.status_code == 201
    offer_id = r.json()["id"]

    # Accept offer -> get deal
    r = client.post(f"/offers/{offer_id}/accept")
    assert r.status_code == 200
    deal_id = r.json()["deal"]["id"]
    return deal_id


def test_deal_documents_flow(client: TestClient):
    deal_id = _create_deal(client)

    # Upload file to link as document
    files = {"file": ("contract.pdf", b"fake pdf content", "application/pdf")}
    r = client.post("/files", files=files)
    assert r.status_code == 201
    file_id = r.json()["id"]

    # Create document for deal
    r = client.post(f"/deals/{deal_id}/documents", json={
        "type": "contract",
        "title": "Main contract v1",
        "fileId": file_id
    })
    assert r.status_code == 201
    doc = r.json()
    doc_id = doc["id"]
    assert doc["dealId"] == deal_id
    assert doc["type"] == "contract"
    assert doc["fileId"] == file_id

    # List documents for deal
    r = client.get(f"/deals/{deal_id}/documents")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) == 1
    assert docs[0]["id"] == doc_id

    # Get document by id
    r = client.get(f"/documents/{doc_id}")
    assert r.status_code == 200
    got = r.json()
    assert got["id"] == doc_id
    assert got["dealId"] == deal_id

    # Delete document
    r = client.delete(f"/documents/{doc_id}")
    assert r.status_code == 204

    # Check that list for deal is now empty
    r = client.get(f"/deals/{deal_id}/documents")
    assert r.status_code == 200
    assert r.json() == []