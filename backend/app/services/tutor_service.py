from datetime import datetime, timezone
import json
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ollama import chat

from ..models.concept import Concept
from ..models.topic import Topic
from ..models.subject import Subject
from ..models.document import Document
from ..models.source_reference import SourceReference
from ..models.tutor import ConceptProgress, TutorMessage

MODEL_NAME = "qwen3:4b"


def get_concept_source_text(concept_id: int, db: Session) -> list[dict[str, Any]]:
    """
    Safely retrieve all grounded source text excerpts for a concept
    using its stored SourceReferences and the parent Document's extracted_text.
    """
    refs = db.scalars(
        select(SourceReference)
        .where(SourceReference.concept_id == concept_id)
        .order_by(SourceReference.chunk_index, SourceReference.start_char)
    ).all()

    excerpts = []
    # Cache document texts to prevent redundant lookups
    doc_cache: dict[int, str] = {}

    for ref in refs:
        if ref.document_id not in doc_cache:
            doc = db.get(Document, ref.document_id)
            doc_cache[ref.document_id] = doc.extracted_text if (doc and doc.extracted_text) else ""

        full_text = doc_cache[ref.document_id]
        start = max(0, ref.start_char)
        end = min(len(full_text), ref.end_char)

        snippet = full_text[start:end].strip() if full_text else ""

        # If snippet is short or offsets were slightly narrow, provide surrounding context
        if len(snippet) < 30 and full_text:
            context_start = max(0, start - 150)
            context_end = min(len(full_text), end + 250)
            snippet = full_text[context_start:context_end].strip()

        excerpts.append({
            "document_id": ref.document_id,
            "chunk_index": ref.chunk_index,
            "start_char": ref.start_char,
            "end_char": ref.end_char,
            "excerpt": snippet,
        })

    return excerpts


def get_concept_details_for_tutor(concept_id: int, db: Session) -> dict[str, Any] | None:
    """Retrieve full concept, topic, and subject metadata alongside source excerpts."""
    concept = db.get(Concept, concept_id)
    if not concept:
        return None

    topic = db.get(Topic, concept.topic_id)
    subject = db.get(Subject, topic.subject_id) if topic else None
    source_excerpts = get_concept_source_text(concept_id, db)

    return {
        "concept": {
            "id": concept.id,
            "name": concept.name,
            "summary": concept.summary,
            "keywords": concept.keywords or [],
            "learning_objective": concept.learning_objective,
            "topic_id": concept.topic_id,
        },
        "topic": {
            "id": topic.id if topic else None,
            "name": topic.name if topic else "General",
            "description": topic.description if topic else None,
        },
        "subject": {
            "id": subject.id if subject else None,
            "name": subject.name if subject else "General Subject",
        },
        "source_excerpts": source_excerpts,
    }


def get_tutor_messages(concept_id: int, db: Session) -> list[dict[str, Any]]:
    """Fetch stored conversation history for a concept in chronological order."""
    messages = db.scalars(
        select(TutorMessage)
        .where(TutorMessage.concept_id == concept_id)
        .order_by(TutorMessage.created_at.asc(), TutorMessage.id.asc())
    ).all()

    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
        for msg in messages
    ]


def clear_tutor_messages(concept_id: int, db: Session) -> int:
    """Clear conversation history for a concept."""
    deleted_count = db.query(TutorMessage).filter(TutorMessage.concept_id == concept_id).delete()
    db.commit()
    return deleted_count


def generate_tutor_response(
    concept_id: int,
    student_message: str,
    db: Session,
) -> dict[str, Any]:
    """
    Generate an interactive, Socratic tutor response grounded in the concept's source references.
    Persists student message and AI response to PostgreSQL.
    """
    details = get_concept_details_for_tutor(concept_id, db)
    if not details:
        raise ValueError(f"Concept #{concept_id} not found.")

    concept_data = details["concept"]
    topic_data = details["topic"]
    subject_data = details["subject"]
    source_excerpts = details["source_excerpts"]

    # Format grounded material text
    grounded_texts = []
    for i, item in enumerate(source_excerpts, start=1):
        if item["excerpt"]:
            grounded_texts.append(f"[Excerpt {i} from Chunk #{item['chunk_index']}]:\n\"{item['excerpt']}\"")

    source_context_block = (
        "\n\n".join(grounded_texts)
        if grounded_texts
        else "No direct text excerpts available in database for this concept."
    )

    system_prompt = f"""You are the Infinite Knowledge interactive AI Tutor.
You are tutoring a student on the concept: "{concept_data['name']}".
Subject: "{subject_data['name']}"
Topic: "{topic_data['name']}"
Learning Objective: "{concept_data['learning_objective']}"
Concept Summary: "{concept_data['summary']}"
Key Terms: {', '.join(concept_data['keywords']) if concept_data['keywords'] else 'None'}

Ground-Truth Learning Material Excerpts:
---
{source_context_block}
---

CRITICAL TUTORING RULES:
1. Interactive Socratic Teaching Sequence:
   - Teach interactively in short, bite-sized steps. Do NOT dump the entire lesson in one monolithic message.
   - If this is the start of the conversation, warmly introduce the concept and its learning objective, explain the foundational idea in 2-3 sentences, and ask the student a quick check question to see where they want to start or if they have prior intuition.
   - When answering questions, give clear, real-world examples grounded in the source material excerpts above.
   - Conclude your explanation with a friendly question to check the student's understanding.
   - When the student replies, evaluate their answer constructively, acknowledge what they got right, gently correct any mistakes, and offer a short recap when they master it.
2. Source Grounding & Honesty:
   - Base your explanations strictly on the learning material excerpts and concept summary provided.
   - Do NOT invent or hallucinate facts or citations.
   - If the uploaded source material is insufficient to answer a deep question, honestly inform the student: "Our uploaded material doesn't cover this specific detail, but based on general principles..."
3. Tone & Formatting:
   - Warm, encouraging, and structured with clean markdown.
   - Deliver clear explanations, grounded examples, and always complete your thoughts. Never stop mid-sentence.
   - Keep answers focused on "{concept_data['name']}" while allowing relevant student inquiries.
"""

    # Fetch existing conversation history from database
    history = db.scalars(
        select(TutorMessage)
        .where(TutorMessage.concept_id == concept_id)
        .order_by(TutorMessage.created_at.asc(), TutorMessage.id.asc())
    ).all()

    ollama_messages = [{"role": "system", "content": system_prompt}]

    for msg in history:
        ollama_messages.append({"role": msg.role, "content": msg.content})

    # Append current student message
    ollama_messages.append({"role": "user", "content": student_message})

    # Query Ollama
    try:
        response = chat(
            model=MODEL_NAME,
            messages=ollama_messages,
            options={
                "temperature": 0.2,
                "repeat_penalty": 1.1,
                "num_predict": 1500,
            },
        )
        assistant_content = (
            response.message.content
            or "I'm here to help you learn this concept. What would you like to explore first?"
        )
    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Ollama generation failed: {exc}")

    # Save both student message and tutor response in DB atomically on success
    user_record = TutorMessage(
        concept_id=concept_id,
        role="user",
        content=student_message,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user_record)

    assistant_record = TutorMessage(
        concept_id=concept_id,
        role="assistant",
        content=assistant_content,
        created_at=datetime.now(timezone.utc),
    )
    db.add(assistant_record)
    db.commit()
    db.refresh(assistant_record)

    return {
        "id": assistant_record.id,
        "concept_id": concept_id,
        "role": "assistant",
        "content": assistant_content,
        "created_at": assistant_record.created_at.isoformat() if assistant_record.created_at else None,
    }


def get_concept_progress(concept_id: int, db: Session) -> dict[str, Any]:
    """Fetch concept completion status from PostgreSQL."""
    progress = db.scalar(
        select(ConceptProgress).where(ConceptProgress.concept_id == concept_id)
    )

    if not progress:
        return {
            "concept_id": concept_id,
            "completed": False,
            "completed_at": None,
        }

    return {
        "concept_id": concept_id,
        "completed": bool(progress.completed),
        "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
    }


def set_concept_progress(concept_id: int, completed: bool, db: Session) -> dict[str, Any]:
    """Persist concept completion state in PostgreSQL."""
    concept = db.get(Concept, concept_id)
    if not concept:
        raise ValueError(f"Concept #{concept_id} not found.")

    progress = db.scalar(
        select(ConceptProgress).where(ConceptProgress.concept_id == concept_id)
    )

    now = datetime.now(timezone.utc)

    if progress is None:
        progress = ConceptProgress(
            concept_id=concept_id,
            completed=completed,
            completed_at=now if completed else None,
        )
        db.add(progress)
    else:
        progress.completed = completed
        progress.completed_at = now if completed else None

    db.commit()
    db.refresh(progress)

    return {
        "concept_id": concept_id,
        "completed": progress.completed,
        "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
    }


def get_subject_progress(subject_id: int, db: Session) -> dict[str, Any]:
    """
    Calculate and return topic-by-topic and overall subject learning progress
    derived directly from PostgreSQL concept_progress records.
    """
    subject = db.get(Subject, subject_id)
    if not subject:
        raise ValueError(f"Subject #{subject_id} not found.")

    topics = db.scalars(
        select(Topic).where(Topic.subject_id == subject_id).order_by(Topic.id)
    ).all()

    # Query all concept IDs under this subject
    concept_rows = db.execute(
        select(Concept.id, Concept.topic_id)
        .join(Topic, Concept.topic_id == Topic.id)
        .where(Topic.subject_id == subject_id)
    ).all()

    all_concept_ids = [row[0] for row in concept_rows]

    # Query completed concept IDs from concept_progress
    completed_ids_query = db.scalars(
        select(ConceptProgress.concept_id)
        .where(
            ConceptProgress.concept_id.in_(all_concept_ids),
            ConceptProgress.completed.is_(True),
        )
    ).all() if all_concept_ids else []

    completed_set = set(completed_ids_query)

    # Calculate per-topic progress
    topic_progress: dict[int, dict[str, Any]] = {}
    for topic in topics:
        topic_concept_ids = [row[0] for row in concept_rows if row[1] == topic.id]
        total = len(topic_concept_ids)
        completed = sum(1 for cid in topic_concept_ids if cid in completed_set)
        percentage = round((completed / total) * 100, 1) if total > 0 else 0.0

        topic_progress[topic.id] = {
            "topic_id": topic.id,
            "topic_name": topic.name,
            "total_concepts": total,
            "completed_concepts": completed,
            "completion_percentage": percentage,
        }

    total_concepts = len(all_concept_ids)
    completed_concepts = len(completed_set)
    subject_percentage = round((completed_concepts / total_concepts) * 100, 1) if total_concepts > 0 else 0.0

    return {
        "subject_id": subject_id,
        "total_concepts": total_concepts,
        "completed_concepts": completed_concepts,
        "completion_percentage": subject_percentage,
        "completed_concept_ids": sorted(list(completed_set)),
        "topic_progress": topic_progress,
    }
