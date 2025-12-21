# app/services/orgs.py
from __future__ import annotations

from datetime import datetime
from typing import Dict
from uuid import uuid4

from app.schemas.orgs import (
    KYBProfile,
    KYBDocument,
    KYBDocumentType,
    KYBSubmitRequest,
    KybStatus,
)


kyb_profiles: Dict[str, KYBProfile] = {}


def _now() -> datetime:
    return datetime.utcnow()


def get_or_create_kyb_profile(org_id: str) -> KYBProfile:
    profile = kyb_profiles.get(org_id)
    if profile:
        return profile

    # Minimal required docs set for RU buyer orgs
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
    new_docs = []
    for doc in payload.documents or []:
        kyb_doc = KYBDocument(
            id=str(uuid4()),
            type=doc.type,
            fileId=doc.fileId,
            uploadedAt=now,
        )
        profile.submittedDocs.append(kyb_doc)
        new_docs.append(kyb_doc)

    # check if all required types are present
    submitted_types = {d.type for d in profile.submittedDocs}
    if all(req in submitted_types for req in profile.requiredDocs):
        profile.status = KybStatus.pending  # or verified later by manual review
    else:
        profile.status = KybStatus.pending

    profile.lastReviewedAt = None
    kyb_profiles[org_id] = profile
    return profile