
import json
from pathlib import Path

from ..db.session import SessionLocal
from ..models.document import Document
from .chunking_service import chunk_text
from .knowledge_extraction_service import extract_knowledge


INPUT_PATH = Path("knowledge_tree.json")
OUTPUT_PATH = Path("knowledge_tree.json")


def attach_source_refs(topics: list, document_id: int, chunk) -> None:
    """Attach source metadata to every extracted concept."""
    for topic in topics:
        for concept in topic.get("concepts", []):
            concept["source_refs"] = [
                {
                    "document_id": document_id,
                    "chunk_index": chunk.chunk_index,
                    "start_char": chunk.start_char,
                    "end_char": chunk.end_char,
                }
            ]


def extract_document_knowledge(document_id: int, text: str) -> dict:
    """
    Split extracted text into overlapping chunks, extract topics & concepts
    using local Ollama LLM, and attach verifiable source references.
    Operates completely in-memory without shared file side-effects.
    """
    if not text or not text.strip():
        raise ValueError("Cannot extract knowledge from empty text.")

    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("Text chunking produced zero chunks.")

    all_topics = []
    failed_chunks = []

    for chunk in chunks:
        chunk_number = chunk.chunk_index + 1
        print(
            f"Extracting knowledge from chunk {chunk_number}/{len(chunks)} (Doc #{document_id})...",
            flush=True,
        )

        try:
            result = extract_knowledge(chunk.text)
            new_topics = result.get("topics", [])

            attach_source_refs(
                new_topics,
                document_id,
                chunk,
            )

            all_topics.extend(new_topics)
            print(
                f"Chunk {chunk_number} processed: {len(new_topics)} topics extracted.",
                flush=True,
            )

        except Exception as exc:
            failed_chunks.append({
                "chunk_index": chunk.chunk_index,
                "error": str(exc),
            })
            print(f"Chunk {chunk_number} failed: {exc}", flush=True)

    if not all_topics and failed_chunks:
        raise RuntimeError(
            f"Knowledge extraction failed on all {len(chunks)} chunks: {failed_chunks[0]['error']}"
        )

    return {
        "document_id": document_id,
        "chunks_total": len(chunks),
        "chunks_succeeded": len(chunks) - len(failed_chunks),
        "chunks_failed": len(failed_chunks),
        "failed_chunks": failed_chunks,
        "topics": all_topics,
        "topics_extracted": len(all_topics),
    }


def retry_failed_chunks(document_id: int) -> dict:
    """Retry only failed chunks and preserve successful extraction results."""

    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Existing extraction file not found: {INPUT_PATH.resolve()}"
        )

    data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))

    if data.get("document_id") != document_id:
        raise ValueError(
            "The document ID in knowledge_tree.json does not match "
            "the requested document ID."
        )

    failed_chunks = data.get("failed_chunks", [])

    if not failed_chunks:
        print("There are no failed chunks to retry.")
        return data

    failed_indices = {
        item["chunk_index"]
        for item in failed_chunks
    }

    db = SessionLocal()

    try:
        document = db.get(Document, document_id)

        if document is None:
            raise ValueError(f"Document {document_id} was not found.")

        if not document.extracted_text:
            raise ValueError("The document has no extracted text.")

        chunks = chunk_text(document.extracted_text)

        # Validate indices before attempting retries.
        invalid_indices = failed_indices - {
            chunk.chunk_index for chunk in chunks
        }

        if invalid_indices:
            raise ValueError(
                f"Failed chunk indices are not present in the current "
                f"chunking output: {sorted(invalid_indices)}. "
                "Check that chunking settings have not changed."
            )

        remaining_failures = []
        recovered_chunks = 0

        for chunk in chunks:
            if chunk.chunk_index not in failed_indices:
                continue

            chunk_number = chunk.chunk_index + 1

            print(
                f"Retrying failed chunk {chunk_number}/{len(chunks)}...",
                flush=True,
            )

            try:
                result = extract_knowledge(chunk.text)
                new_topics = result["topics"]

                attach_source_refs(
                    new_topics,
                    document.id,
                    chunk,
                )

                data.setdefault("topics", []).extend(new_topics)
                recovered_chunks += 1

                print(
                    f"Chunk {chunk_number} recovered: "
                    f"{len(new_topics)} topics",
                    flush=True,
                )

            except Exception as exc:
                remaining_failures.append(
                    {
                        "chunk_index": chunk.chunk_index,
                        "error": str(exc),
                    }
                )

                print(
                    f"Chunk {chunk_number} still failed: {exc}",
                    flush=True,
                )

        data["failed_chunks"] = remaining_failures
        data["chunks_total"] = len(chunks)
        data["chunks_failed"] = len(remaining_failures)
        data["chunks_succeeded"] = len(chunks) - len(remaining_failures)
        data["topics_extracted"] = len(data.get("topics", []))

        OUTPUT_PATH.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        print("\nFailed-chunk retry finished.")
        print(f"Chunks recovered this run: {recovered_chunks}")
        print(f"Chunks still failed: {len(remaining_failures)}")
        print(f"Topics currently extracted: {data['topics_extracted']}")
        print(f"Saved to: {OUTPUT_PATH.resolve()}")

        return data

    finally:
        db.close()


if __name__ == "__main__":
    retry_failed_chunks(1)
