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
    for doc in payload.documents or []:
        kyb_doc = KYBDocument(
            id=str(uuid4()),
            type=doc.type,
            fileId=doc.fileId,
            uploadedAt=now,
        )
        profile.submittedDocs.append(kyb_doc)

    # Check if all required docs are present
    submitted_types = {d.type for d in profile.submittedDocs}
    has_all_required = all(req in submitted_types for req in profile.requiredDocs)

    if has_all_required:
        profile.status = KybStatus.verified
        # Sync Organization.kybStatus
        org = auth_service.orgs.get(org_id)
        if org:
            updated_data = org.model_dump()
            updated_data["kybStatus"] = KybStatus.verified
            auth_service.orgs[org_id] = type(org)(**updated_data)
    else:
        profile.status = KybStatus.pending

    profile.lastReviewedAt = None
    kyb_profiles[org_id] = profile
    return profile