# app/api/v1/files.py
from __future__ import annotations

from fastapi import APIRouter, File as FastAPIFile, HTTPException, UploadFile

from app.schemas.files_docs import File as FileSchema
from app.services import files as files_service

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("", response_model=FileSchema, status_code=201)
async def upload_file(file: UploadFile = FastAPIFile(...)):
    """Upload a file and return its metadata (MVP, content not persisted)."""
    stored = await files_service.save_upload(file)
    return stored


@router.get("/{file_id}", response_model=FileSchema)
def get_file(file_id: str):
    f = files_service.get_file(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f