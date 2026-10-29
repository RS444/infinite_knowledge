
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..db.session import SessionLocal
from ..models.subject import Subject
from ..models.topic import Topic
from ..models.concept import Concept
from ..models.source_reference import SourceReference


router = APIRouter(tags=["Knowledge Tree"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SubjectRenameRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Subject name must be a string.")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Subject name cannot be empty or whitespace only.")
        return trimmed


@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.scalars(
        select(Subject).order_by(Subject.id)
    ).all()

    # Query topic and concept counts per subject
    topic_counts = dict(
        db.execute(
            select(Topic.subject_id, func.count(Topic.id)).group_by(Topic.subject_id)
        ).all()
    )

    concept_counts = dict(
        db.execute(
            select(Topic.subject_id, func.count(Concept.id))
            .join(Concept, Concept.topic_id == Topic.id)
            .group_by(Topic.subject_id)
        ).all()
    )

    return {
        "count": len(subjects),
        "subjects": [
            {
                "id": subject.id,
                "name": subject.name,
                "document_id": subject.document_id,
                "created_at": subject.created_at,
                "topic_count": topic_counts.get(subject.id, 0),
                "concept_count": concept_counts.get(subject.id, 0),
            }
            for subject in subjects
        ],
    }


@router.patch("/subjects/{subject_id}")
def rename_subject(
    subject_id: int,
    request: SubjectRenameRequest,
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(
            status_code=404,
            detail=f"Subject #{subject_id} not found.",
        )

    clean_name = request.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=422,
            detail="Subject name cannot be empty.",
        )

    try:
        subject.name = clean_name
        db.commit()
        db.refresh(subject)

        return {
            "id": subject.id,
            "name": subject.name,
            "document_id": subject.document_id,
            "created_at": subject.created_at,
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database error while renaming subject #{subject_id}: {exc}",
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update subject name: {exc}",
        )


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(
            status_code=404,
            detail=f"Subject #{subject_id} not found.",
        )

    try:
        # 1. Fetch topics belonging to this subject
        topics = db.scalars(
            select(Topic).where(Topic.subject_id == subject_id)
        ).all()
        topic_ids = [t.id for t in topics]

        if topic_ids:
            # 2. Fetch concepts belonging to these topics
            concepts = db.scalars(
                select(Concept).where(Concept.topic_id.in_(topic_ids))
            ).all()
            concept_ids = [c.id for c in concepts]

            if concept_ids:
                # 3. Delete source references referencing these concepts
                db.query(SourceReference).filter(
                    SourceReference.concept_id.in_(concept_ids)
                ).delete(synchronize_session=False)

                # 4. Delete concepts
                db.query(Concept).filter(
                    Concept.id.in_(concept_ids)
                ).delete(synchronize_session=False)

            # 5. Delete topics
            db.query(Topic).filter(
                Topic.id.in_(topic_ids)
            ).delete(synchronize_session=False)

        # 6. Delete the subject itself (preserves associated Document in documents table)
        db.delete(subject)
        db.commit()

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database error while deleting subject #{subject_id}: {exc}",
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error while deleting subject #{subject_id}: {exc}",
        )


@router.get("/subjects/{subject_id}/knowledge-tree")
def get_knowledge_tree(
    subject_id: int,
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, subject_id)

    if subject is None:
        raise HTTPException(
            status_code=404,
            detail="Subject not found.",
        )

    topics = db.scalars(
        select(Topic)
        .where(Topic.subject_id == subject_id)
        .order_by(Topic.id)
    ).all()

    tree_topics = []

    for topic in topics:
        concepts = db.scalars(
            select(Concept)
            .where(Concept.topic_id == topic.id)
            .order_by(Concept.id)
        ).all()

        tree_concepts = []

        for concept in concepts:
            references = db.scalars(
                select(SourceReference)
                .where(SourceReference.concept_id == concept.id)
                .order_by(SourceReference.id)
            ).all()

            tree_concepts.append(
                {
                    "id": concept.id,
                    "name": concept.name,
                    "summary": concept.summary,
                    "keywords": concept.keywords,
                    "learning_objective": concept.learning_objective,
                    "source_refs": [
                        {
                            "document_id": ref.document_id,
                            "chunk_index": ref.chunk_index,
                            "start_char": ref.start_char,
                            "end_char": ref.end_char,
                        }
                        for ref in references
                    ],
                }
            )

        tree_topics.append(
            {
                "id": topic.id,
                "name": topic.name,
                "description": topic.description,
                "concepts": tree_concepts,
            }
        )

    return {
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "document_id": subject.document_id,
        },
        "topic_count": len(tree_topics),
        "concept_count": sum(
            len(topic["concepts"]) for topic in tree_topics
        ),
        "topics": tree_topics,
    }


@router.get("/concepts/{concept_id}")
def get_concept(
    concept_id: int,
    db: Session = Depends(get_db),
):
    concept = db.get(Concept, concept_id)

    if concept is None:
        raise HTTPException(
            status_code=404,
            detail="Concept not found.",
        )

    references = db.scalars(
        select(SourceReference)
        .where(SourceReference.concept_id == concept_id)
        .order_by(SourceReference.id)
    ).all()

    return {
        "id": concept.id,
        "topic_id": concept.topic_id,
        "name": concept.name,
        "summary": concept.summary,
        "keywords": concept.keywords,
        "learning_objective": concept.learning_objective,
        "source_refs": [
            {
                "document_id": ref.document_id,
                "chunk_index": ref.chunk_index,
                "start_char": ref.start_char,
                "end_char": ref.end_char,
            }
            for ref in references
        ],
    }
