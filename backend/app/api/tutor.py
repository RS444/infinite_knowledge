from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..api.knowledge import get_db
from ..services.tutor_service import (
    get_concept_details_for_tutor,
    get_tutor_messages,
    clear_tutor_messages,
    generate_tutor_response,
    get_concept_progress,
    set_concept_progress,
    get_subject_progress,
)

router = APIRouter(tags=["AI Tutor & Progress"])


class TutorChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Student's message or prompt to the AI tutor")


class ConceptProgressUpdateRequest(BaseModel):
    completed: bool = Field(..., description="Whether the concept is marked as completed")


@router.get("/concepts/{concept_id}/tutor")
def get_concept_tutor_context(
    concept_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve concept metadata, grounded source excerpts, and previous conversation history
    for the interactive AI tutor interface.
    """
    details = get_concept_details_for_tutor(concept_id, db)
    if not details:
        raise HTTPException(
            status_code=404,
            detail=f"Concept #{concept_id} not found.",
        )

    messages = get_tutor_messages(concept_id, db)
    progress = get_concept_progress(concept_id, db)

    return {
        **details,
        "messages": messages,
        "progress": progress,
    }


@router.post("/concepts/{concept_id}/tutor/chat")
def chat_with_tutor(
    concept_id: int,
    request: TutorChatRequest,
    db: Session = Depends(get_db),
):
    """
    Send a message to the AI tutor. The response is grounded in the concept's source references
    and stored in PostgreSQL conversation history.
    """
    cleaned_message = request.message.strip()
    if not cleaned_message:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty or whitespace only.",
        )

    try:
        response = generate_tutor_response(
            concept_id=concept_id,
            student_message=cleaned_message,
            db=db,
        )
        return response
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Tutor generation failed: {exc}",
        )


@router.post("/concepts/{concept_id}/tutor/reset")
def reset_tutor_conversation(
    concept_id: int,
    db: Session = Depends(get_db),
):
    """Reset and clear conversation history for a concept."""
    clear_tutor_messages(concept_id, db)
    return {"message": "Conversation history reset successfully.", "concept_id": concept_id}


@router.get("/concepts/{concept_id}/progress")
def get_progress(
    concept_id: int,
    db: Session = Depends(get_db),
):
    """Fetch persistent completion state for a concept."""
    return get_concept_progress(concept_id, db)


@router.post("/concepts/{concept_id}/progress")
def update_progress(
    concept_id: int,
    request: ConceptProgressUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update and persist completion state for a concept."""
    try:
        return set_concept_progress(concept_id, request.completed, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/subjects/{subject_id}/progress")
def get_subject_learning_progress(
    subject_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve aggregated topic and subject learning progress derived from
    database concept completion records.
    """
    try:
        return get_subject_progress(subject_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
