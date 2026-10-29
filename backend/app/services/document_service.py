
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from ..models.document import Document


ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def save_document(
    db: Session,
    file: UploadFile,
    extracted_text: str,
    custom_subject_name: str | None = None,
) -> Document:
    filename = Path(file.filename or "document").name
    extension = Path(filename).suffix.lower()

    clean_subject_name = (
        custom_subject_name.strip()
        if custom_subject_name and custom_subject_name.strip()
        else None
    )

    document = Document(
        filename=filename,
        file_type=extension.lstrip("."),
        status="uploaded",
        extracted_text=extracted_text,
        custom_subject_name=clean_subject_name,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document
