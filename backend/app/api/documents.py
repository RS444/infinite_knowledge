
from io import BytesIO
from pathlib import Path

from docx import Document as DocxDocument
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from ..db.session import SessionLocal
from ..services.document_service import save_document

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class ProcessDocumentRequest(BaseModel):
    subject_name: str | None = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_docx_text(content: bytes) -> str:
    doc = DocxDocument(BytesIO(content))
    return "\n".join(
        paragraph.text
        for paragraph in doc.paragraphs
        if paragraph.text.strip()
    )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject_name: str | None = Form(None),
    db: Session = Depends(get_db),
):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if extension not in {".pdf", ".docx"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(status_code=400, detail="The file is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size must not exceed 10 MB.",
        )

    try:
        if extension == ".pdf":
            extracted_text = extract_pdf_text(content)
        else:
            extracted_text = extract_docx_text(content)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read the file. Check that it is a valid PDF or DOCX.",
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text found. Scanned PDFs may require OCR.",
        )

    clean_subject_name = (
        subject_name.strip()
        if subject_name and subject_name.strip()
        else None
    )

    document = save_document(
        db,
        file,
        extracted_text,
        custom_subject_name=clean_subject_name,
    )

    return {
        "message": "Document uploaded and processed successfully",
        "document_id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "status": document.status,
        "extracted_characters": len(extracted_text),
        "custom_subject_name": document.custom_subject_name,
    }


@router.post("/{document_id}/process")
def process_document(
    document_id: int,
    request: ProcessDocumentRequest | None = None,
    db: Session = Depends(get_db),
):
    """
    Process an uploaded document through the complete knowledge extraction,
    merging, validation, and storage pipeline to generate a structured Subject and Knowledge Tree.
    """
    from ..services.knowledge_orchestration_service import (
        orchestrate_knowledge_extraction,
        DocumentNotFoundError,
        EmptyDocumentError,
        PipelineExtractionError,
        PipelineValidationError,
    )

    clean_name = (
        request.subject_name.strip()
        if request and request.subject_name and request.subject_name.strip()
        else None
    )

    try:
        result = orchestrate_knowledge_extraction(
            document_id=document_id,
            db=db,
            custom_subject_name=clean_name,
        )
        return result

    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except EmptyDocumentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except PipelineExtractionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI extraction service error: {exc}",
        )

    except PipelineValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Knowledge tree validation error: {exc}",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while processing document #{document_id}: {exc}",
        )
