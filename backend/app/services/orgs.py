# app/services/orgs.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

from app.schemas.orgs import (
    KYBProfile,
    KYBDocument,
    KYBDocumentType,
    KYBSubmitRequest,
    KybStatus,
    Organization,
)
from app.services import auth as auth_service


kyb_profiles: Dict[str, KYBProfile] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_or_create_kyb_profile(org_id: str) -> KYBProfile:
    profile = kyb_profiles.get(org_id)
    if profile:
        return profile

    required = [
        KYBDocumentType.registration_certificate,
        KYBDocumentType.tax_certificate,
        KYBDocumentType.director_id,
    ]

    profile = KYBProfile(
        orgId=org_id,
        status=KybStatus.not_started,
        requiredDocs=required,
        submittedDocs=[],
        lastReviewedAt=None,
        reviewerComment=None,
    )
    kyb_profiles[org_id] = profile
    return profile


def submit_kyb(org_id: str, payload: KYBSubmitRequest) -> KYBProfile:
    profile = get_or_create_kyb_profile(org_id)

    now = _now()

    # добавляем новые документы в профиль
    for doc in payload.documents or []:
        kyb_doc = KYBDocument(
            id=str(uuid4()),
            type=doc.type,
            fileId=doc.fileId,
            uploadedAt=now,
        )
        profile.submittedDocs.append(kyb_doc)

    # проверяем, все ли обязательные типы документов загружены
    submitted_types = {d.type for d in profile.submittedDocs}
    all_required_submitted = all(req in submitted_types for req in profile.requiredDocs)

    if all_required_submitted:
        profile.status = KybStatus.verified
        profile.lastReviewedAt = now
    else:
        profile.status = KybStatus.pending
        profile.lastReviewedAt = None

    kyb_profiles[org_id] = profile

    # синхронизируем статус в Organization,
    # чтобы /orgs/suppliers отдавал актуальный kybStatus
    org = auth_service.orgs.get(org_id)
    if org:
        updated = Organization(**{**org.dict(), "kybStatus": profile.status})
        auth_service.orgs[org_id] = updated

    return profile