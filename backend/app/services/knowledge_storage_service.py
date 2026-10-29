
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..db.session import SessionLocal
from ..models.document import Document
from ..models.subject import Subject
from ..models.topic import Topic
from ..models.concept import Concept
from ..models.source_reference import SourceReference


INPUT_PATH = Path("knowledge_tree_merged.json")


def store_knowledge_tree(
    data: dict | None = None,
    db: Session | None = None,
    custom_subject_name: str | None = None,
) -> dict:
    if data is None:
        if not INPUT_PATH.exists():
            raise FileNotFoundError(
                f"Knowledge tree not found: {INPUT_PATH.resolve()}"
            )
        data = json.loads(
            INPUT_PATH.read_text(encoding="utf-8")
        )

    document_id = data.get("document_id")
    topics_data = data.get("topics")

    if not isinstance(document_id, int) or isinstance(document_id, bool):
        raise ValueError("The knowledge tree has an invalid document_id.")

    if not isinstance(topics_data, list):
        raise ValueError("The knowledge tree must contain a topics list.")

    managed_db = False
    if db is None:
        db = SessionLocal()
        managed_db = True

    try:
        document = db.get(Document, document_id)

        if document is None:
            raise ValueError(
                f"Document {document_id} does not exist in PostgreSQL."
            )

        # Validate the tree before writing anything.
        for topic_data in topics_data:
            if not isinstance(topic_data, dict):
                raise ValueError("Every topic must be an object.")

            if not isinstance(topic_data.get("name"), str):
                raise ValueError("Every topic must have a name.")

            if not isinstance(topic_data.get("concepts"), list):
                raise ValueError(
                    f"Topic '{topic_data['name']}' must have a concepts list."
                )

            for concept_data in topic_data["concepts"]:
                if not isinstance(concept_data, dict):
                    raise ValueError("Every concept must be an object.")

                for field in (
                    "name",
                    "summary",
                    "learning_objective",
                ):
                    if not isinstance(concept_data.get(field), str):
                        raise ValueError(
                            f"Concept in '{topic_data['name']}' "
                            f"has an invalid {field}."
                        )

                if not isinstance(concept_data.get("keywords"), list):
                    raise ValueError(
                        f"Concept '{concept_data['name']}' "
                        "must have a keywords list."
                    )

                source_refs = concept_data.get("source_refs")

                if not isinstance(source_refs, list) or not source_refs:
                    raise ValueError(
                        f"Concept '{concept_data['name']}' "
                        "has no source references."
                    )

                for source in source_refs:
                    if not isinstance(source, dict):
                        raise ValueError("A source reference must be an object.")

                    if source.get("document_id") != document_id:
                        raise ValueError(
                            f"Concept '{concept_data['name']}' "
                            "references a different document."
                        )

                    chunk_index = source.get("chunk_index")
                    start_char = source.get("start_char")
                    end_char = source.get("end_char")

                    if (
                        not isinstance(chunk_index, int)
                        or isinstance(chunk_index, bool)
                        or chunk_index < 0
                        or not isinstance(start_char, int)
                        or isinstance(start_char, bool)
                        or start_char < 0
                        or not isinstance(end_char, int)
                        or isinstance(end_char, bool)
                        or end_char <= start_char
                    ):
                        raise ValueError(
                            f"Concept '{concept_data['name']}' "
                            "has an invalid source location."
                        )

        # Determine canonical subject name
        candidate_name = None
        if custom_subject_name and custom_subject_name.strip():
            candidate_name = custom_subject_name.strip()
        elif data and data.get("subject_name") and str(data["subject_name"]).strip():
            candidate_name = str(data["subject_name"]).strip()
        elif getattr(document, "custom_subject_name", None) and document.custom_subject_name.strip():
            candidate_name = document.custom_subject_name.strip()

        # One subject per uploaded document for this initial MVP.
        subject = db.scalar(
            select(Subject).where(
                Subject.document_id == document_id
            )
        )

        if subject is None:
            final_name = candidate_name or Path(document.filename).stem
            subject = Subject(
                name=final_name,
                document_id=document_id,
            )
            db.add(subject)
            db.flush()
        else:
            # If subject already exists: update ONLY if a custom candidate name is provided.
            # Never overwrite an existing custom name with the filename stem!
            if candidate_name:
                subject.name = candidate_name
                db.flush()

        # Replace this subject's existing tree in one transaction.
        existing_topics = db.scalars(
            select(Topic).where(
                Topic.subject_id == subject.id
            )
        ).all()

        existing_topic_ids = [
            topic.id for topic in existing_topics
        ]

        if existing_topic_ids:
            existing_concepts = db.scalars(
                select(Concept).where(
                    Concept.topic_id.in_(existing_topic_ids)
                )
            ).all()

            existing_concept_ids = [
                concept.id for concept in existing_concepts
            ]

            if existing_concept_ids:
                db.query(SourceReference).filter(
                    SourceReference.concept_id.in_(
                        existing_concept_ids
                    )
                ).delete(synchronize_session=False)

                db.query(Concept).filter(
                    Concept.id.in_(existing_concept_ids)
                ).delete(synchronize_session=False)

            db.query(Topic).filter(
                Topic.id.in_(existing_topic_ids)
            ).delete(synchronize_session=False)

        topics_saved = 0
        concepts_saved = 0
        references_saved = 0

        for topic_data in topics_data:
            topic = Topic(
                subject_id=subject.id,
                name=topic_data["name"].strip(),
                description=topic_data.get("description"),
            )
            db.add(topic)
            db.flush()
            topics_saved += 1

            for concept_data in topic_data["concepts"]:
                concept = Concept(
                    topic_id=topic.id,
                    name=concept_data["name"].strip(),
                    summary=concept_data["summary"].strip(),
                    keywords=concept_data["keywords"],
                    learning_objective=(
                        concept_data["learning_objective"].strip()
                    ),
                )
                db.add(concept)
                db.flush()
                concepts_saved += 1

                for source in concept_data["source_refs"]:
                    reference = SourceReference(
                        concept_id=concept.id,
                        document_id=source["document_id"],
                        chunk_index=source["chunk_index"],
                        start_char=source["start_char"],
                        end_char=source["end_char"],
                    )
                    db.add(reference)
                    references_saved += 1

        db.commit()

        return {
            "status": "success",
            "document_id": document_id,
            "subject_id": subject.id,
            "subject_name": subject.name,
            "topics_saved": topics_saved,
            "concepts_saved": concepts_saved,
            "source_references_saved": references_saved,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        if managed_db:
            db.close()


if __name__ == "__main__":
    try:
        result = store_knowledge_tree()

        print("\nKnowledge tree stored successfully.")
        print(f"Document ID: {result['document_id']}")
        print(f"Subject ID: {result['subject_id']}")
        print(f"Topics saved: {result['topics_saved']}")
        print(f"Concepts saved: {result['concepts_saved']}")
        print(
            "Source references saved: "
            f"{result['source_references_saved']}"
        )

    except (ValueError, FileNotFoundError, SQLAlchemyError) as exc:
        print(f"\nStorage failed: {exc}")
        raise
