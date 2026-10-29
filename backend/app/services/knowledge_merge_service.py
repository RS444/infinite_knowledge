
import json
import re
from pathlib import Path


INPUT_PATH = Path("knowledge_tree.json")
OUTPUT_PATH = Path("knowledge_tree_merged.json")


def normalize_name(name: str) -> str:
    """Normalize names for duplicate matching."""
    return re.sub(r"\s+", " ", name).strip().casefold()


def merge_keywords(existing: list, incoming: list) -> list:
    """Combine unique keywords while preserving original spelling."""
    merged = []
    seen = set()

    for keyword in existing + incoming:
        if not isinstance(keyword, str):
            continue

        cleaned = keyword.strip()
        key = normalize_name(cleaned)

        if key and key not in seen:
            merged.append(cleaned)
            seen.add(key)

    return merged


def merge_source_refs(existing: list, incoming: list) -> list:
    """Combine unique source references."""
    merged = []
    seen = set()

    for source in existing + incoming:
        if not isinstance(source, dict):
            continue

        key = (
            source.get("document_id"),
            source.get("chunk_index"),
            source.get("start_char"),
            source.get("end_char"),
        )

        if key not in seen:
            merged.append(source)
            seen.add(key)

    return merged


def merge_knowledge_tree(data: dict) -> dict:
    merged_topics = {}
    original_topics = data.get("topics", [])

    for topic in original_topics:
        topic_name = topic.get("name", "").strip()

        if not topic_name:
            continue

        topic_key = normalize_name(topic_name)

        if topic_key not in merged_topics:
            merged_topics[topic_key] = {
                **topic,
                "name": topic_name,
                "concepts": [],
            }

        target_topic = merged_topics[topic_key]

        concepts_by_name = {
            normalize_name(concept.get("name", "")): concept
            for concept in target_topic["concepts"]
        }

        for concept in topic.get("concepts", []):
            concept_name = concept.get("name", "").strip()

            if not concept_name:
                continue

            concept_key = normalize_name(concept_name)

            if concept_key in concepts_by_name:
                existing = concepts_by_name[concept_key]

                existing["keywords"] = merge_keywords(
                    existing.get("keywords", []),
                    concept.get("keywords", []),
                )

                existing["source_refs"] = merge_source_refs(
                    existing.get("source_refs", []),
                    concept.get("source_refs", []),
                )

            else:
                new_concept = {
                    **concept,
                    "name": concept_name,
                    "keywords": merge_keywords(
                        [],
                        concept.get("keywords", []),
                    ),
                    "source_refs": merge_source_refs(
                        [],
                        concept.get("source_refs", []),
                    ),
                }

                target_topic["concepts"].append(new_concept)
                concepts_by_name[concept_key] = new_concept

    result = {
        **data,
        "topics": list(merged_topics.values()),
    }

    result["topics_extracted"] = len(result["topics"])
    result["concepts_after_merge"] = sum(
        len(topic["concepts"])
        for topic in result["topics"]
    )

    # Count concepts with at least one source reference.
    all_concepts = [
        concept
        for topic in result["topics"]
        for concept in topic["concepts"]
    ]

    result["concepts_with_source_refs"] = sum(
        bool(concept.get("source_refs"))
        for concept in all_concepts
    )

    result["concepts_without_source_refs"] = (
        len(all_concepts) - result["concepts_with_source_refs"]
    )

    return result


def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_PATH.resolve()}"
        )

    data = json.loads(
        INPUT_PATH.read_text(encoding="utf-8")
    )

    merged_data = merge_knowledge_tree(data)

    OUTPUT_PATH.write_text(
        json.dumps(merged_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("Knowledge tree merging completed.")
    print(f"Original topics: {len(data.get('topics', []))}")
    print(f"Merged topics: {len(merged_data['topics'])}")
    print(
        f"Concepts after merging: "
        f"{merged_data['concepts_after_merge']}"
    )
    print(
        f"Concepts with source references: "
        f"{merged_data['concepts_with_source_refs']}"
    )
    print(
        f"Concepts without source references: "
        f"{merged_data['concepts_without_source_refs']}"
    )
    print(
        f"Failed chunks retained: "
        f"{merged_data.get('chunks_failed', 0)}"
    )
    print(f"Saved to: {OUTPUT_PATH.resolve()}")


if __name__ == "__main__":
    main()
