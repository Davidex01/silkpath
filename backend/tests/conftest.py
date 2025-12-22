# backend/tests/conftest.py
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import auth, orgs, products, rfq_deals, wallets_fx, files as files_service, documents as docs_service


@pytest.fixture(autouse=True)
def reset_state():
    """
    Reset all in-memory storages before each test.
    """
    auth.users.clear()
    auth.orgs.clear()
    auth.passwords.clear()

    orgs.kyb_profiles.clear()

    products.products.clear()

    rfq_deals.rfqs.clear()
    rfq_deals.offers.clear()
    rfq_deals.orders.clear()
    rfq_deals.deals.clear()

    wallets_fx.wallets.clear()
    wallets_fx.payments.clear()
    wallets_fx.fx_quotes.clear()

    files_service.files.clear()
    docs_service.documents.clear()

    yield
    # nothing after test
    # (если потом появятся глобальные ресурсы, можно закрывать здесь)


@pytest.fixture
def client() -> TestClient:
    """
    FastAPI TestClient for API tests.
    """
    return TestClient(app)