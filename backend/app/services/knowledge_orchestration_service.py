from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.concept import Concept
from ..models.document import Document
from ..models.subject import Subject
from ..models.topic import Topic
from .knowledge_merge_service import merge_knowledge_tree
from .knowledge_pipeline_service import extract_document_knowledge
from .knowledge_storage_service import store_knowledge_tree
from .knowledge_validation_service import validate_knowledge_tree


class DocumentNotFoundError(Exception):
    """Raised when the specified document ID does not exist in PostgreSQL."""
    pass


class EmptyDocumentError(Exception):
    """Raised when the document has no extracted text to process."""
    pass


class PipelineExtractionError(Exception):
    """Raised when LLM extraction fails on all chunks."""
    pass


class PipelineValidationError(Exception):
    """Raised when the merged knowledge tree fails schema validation."""
    pass


def orchestrate_knowledge_extraction(
    document_id: int,
    db: Session,
    allow_reprocess: bool = False,
    custom_subject_name: str | None = None,
) -> dict:
    """
    Orchestrates the complete knowledge extraction pipeline in-memory:
    1. Retrieval of extracted text from PostgreSQL Document record.
    2. Prevention of duplicate subjects/trees if document is already processed.
    3. Text chunking & local Ollama LLM extraction with source reference attachment.
    4. Deduplication and merging of topics and concepts.
    5. Schema and citation offset validation.
    6. Transactional storage into PostgreSQL (Subject, Topic, Concept, SourceReference).
    7. Updates document status to 'processed'.
    """
    # 1. Retrieve document from PostgreSQL
    document = db.get(Document, document_id)
    if document is None:
        raise DocumentNotFoundError(f"Document {document_id} was not found.")

    if not document.extracted_text or not document.extracted_text.strip():
        raise EmptyDocumentError(
            f"Document {document_id} has no extracted text to process."
        )

    clean_custom_name = (
        custom_subject_name.strip()
        if custom_subject_name and custom_subject_name.strip()
        else None
    )

    if clean_custom_name:
        document.custom_subject_name = clean_custom_name
        db.flush()

    effective_subject_name = (
        clean_custom_name
        or getattr(document, "custom_subject_name", None)
    )

    # 2. Check for duplicate processing (Requirement 12)
    existing_subject = db.scalar(
        select(Subject).where(Subject.document_id == document_id)
    )

    if existing_subject is not None and not allow_reprocess:
        if effective_subject_name and existing_subject.name != effective_subject_name:
            existing_subject.name = effective_subject_name
            db.commit()

        topic_count = (
            db.scalar(
                select(func.count(Topic.id)).where(
                    Topic.subject_id == existing_subject.id
                )
            )
            or 0
        )
        concept_count = (
            db.scalar(
                select(func.count(Concept.id))
                .join(Topic, Concept.topic_id == Topic.id)
                .where(Topic.subject_id == existing_subject.id)
            )
            or 0
        )

        return {
            "status": "already_processed",
            "is_duplicate": True,
            "document_id": document_id,
            "subject_id": existing_subject.id,
            "subject_name": existing_subject.name,
            "topic_count": topic_count,
            "concept_count": concept_count,
            "message": (
                f"Document #{document_id} has already been processed into "
                f"Subject #{existing_subject.id} ({topic_count} topics, {concept_count} concepts)."
            ),
        }

    try:
        # 3. Chunk text & extract topics/concepts via Ollama
        raw_tree = extract_document_knowledge(
            document_id=document.id,
            text=document.extracted_text,
        )

        if effective_subject_name:
            raw_tree["subject_name"] = effective_subject_name

        if not raw_tree.get("topics"):
            raise PipelineExtractionError(
                f"Knowledge extraction returned zero topics for Document #{document_id}."
            )

        # 4. Merge duplicate topics and concepts without losing source references
        merged_tree = merge_knowledge_tree(raw_tree)

        # 5. Validate merged knowledge tree before storage
        validation_report = validate_knowledge_tree(merged_tree)
        if not validation_report["valid"]:
            error_details = "; ".join(validation_report["errors"])
            raise PipelineValidationError(
                f"Knowledge tree validation failed: {error_details}"
            )

        # 6. Store in PostgreSQL within the active transaction
        storage_result = store_knowledge_tree(
            data=merged_tree,
            db=db,
            custom_subject_name=effective_subject_name,
        )

        # 7. Update document status
        document.status = "processed"
        db.commit()

        return {
            "status": "success",
            "is_duplicate": False,
            "document_id": document_id,
            "subject_id": storage_result["subject_id"],
            "subject_name": storage_result.get("subject_name", effective_subject_name),
            "topic_count": storage_result["topics_saved"],
            "concept_count": storage_result["concepts_saved"],
            "source_references_saved": storage_result["source_references_saved"],
            "message": (
                f"Successfully processed Document #{document_id} into Subject "
                f"#{storage_result['subject_id']} with {storage_result['topics_saved']} "
                f"topics and {storage_result['concepts_saved']} concepts."
            ),
        }

    except Exception:
        db.rollback()
        raise
