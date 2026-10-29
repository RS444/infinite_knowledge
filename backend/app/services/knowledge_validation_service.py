
import json
from pathlib import Path


INPUT_PATH = Path("knowledge_tree_merged.json")


def validate_knowledge_tree(data: dict) -> dict:
    errors = []
    warnings = []

    if not isinstance(data, dict):
        return {
            "valid": False,
            "errors": ["Root must be a JSON object."],
            "warnings": [],
            "topics_checked": 0,
            "concepts_checked": 0,
            "concepts_with_source_refs": 0,
        }

    topics = data.get("topics")

    if not isinstance(topics, list):
        return {
            "valid": False,
            "errors": ['"topics" must be a list.'],
            "warnings": [],
            "topics_checked": 0,
            "concepts_checked": 0,
            "concepts_with_source_refs": 0,
        }

    document_id = data.get("document_id")
    chunks_total = data.get("chunks_total")

    if not isinstance(document_id, int):
        errors.append("document_id must be an integer.")

    if not isinstance(chunks_total, int) or chunks_total < 0:
        errors.append("chunks_total must be a non-negative integer.")

    topic_names = set()
    concept_count = 0
    concepts_with_source_refs = 0

    for topic_index, topic in enumerate(topics):
        topic_location = f"topics[{topic_index}]"

        if not isinstance(topic, dict):
            errors.append(f"{topic_location} must be an object.")
            continue

        topic_name = topic.get("name")

        if not isinstance(topic_name, str) or not topic_name.strip():
            errors.append(f"{topic_location} has an invalid name.")
        else:
            topic_key = " ".join(topic_name.casefold().split())

            if topic_key in topic_names:
                warnings.append(
                    f"Duplicate topic name: {topic_name}"
                )

            topic_names.add(topic_key)

        concepts = topic.get("concepts")

        if not isinstance(concepts, list):
            errors.append(
                f"{topic_location}.concepts must be a list."
            )
            continue

        concept_names = set()

        for concept_index, concept in enumerate(concepts):
            concept_count += 1
            location = (
                f"{topic_location}.concepts[{concept_index}]"
            )

            if not isinstance(concept, dict):
                errors.append(f"{location} must be an object.")
                continue

            for field in (
                "name",
                "summary",
                "learning_objective",
            ):
                value = concept.get(field)

                if not isinstance(value, str) or not value.strip():
                    errors.append(
                        f"{location}.{field} must be a non-empty string."
                    )

            keywords = concept.get("keywords")

            if not isinstance(keywords, list):
                errors.append(f"{location}.keywords must be a list.")
            elif not all(
                isinstance(keyword, str) for keyword in keywords
            ):
                errors.append(
                    f"{location}.keywords must contain only strings."
                )

            concept_name = concept.get("name")

            if isinstance(concept_name, str) and concept_name.strip():
                concept_key = " ".join(
                    concept_name.casefold().split()
                )

                if concept_key in concept_names:
                    warnings.append(
                        f"Duplicate concept '{concept_name}' "
                        f"inside topic '{topic_name}'."
                    )

                concept_names.add(concept_key)

            source_refs = concept.get("source_refs")

            if not isinstance(source_refs, list) or not source_refs:
                errors.append(
                    f"{location} has no source references."
                )
                continue

            concepts_with_source_refs += 1

            for ref_index, source in enumerate(source_refs):
                ref_location = (
                    f"{location}.source_refs[{ref_index}]"
                )

                if not isinstance(source, dict):
                    errors.append(
                        f"{ref_location} must be an object."
                    )
                    continue

                ref_document_id = source.get("document_id")
                chunk_index = source.get("chunk_index")
                start_char = source.get("start_char")
                end_char = source.get("end_char")

                if ref_document_id != document_id:
                    errors.append(
                        f"{ref_location} references the wrong document."
                    )

                if (
                    not isinstance(chunk_index, int)
                    or isinstance(chunk_index, bool)
                    or not isinstance(chunks_total, int)
                    or isinstance(chunks_total, bool)
                    or not 0 <= chunk_index < chunks_total
                ):
                    errors.append(
                        f"{ref_location} has an invalid chunk_index."
                    )

                if (
                    not isinstance(start_char, int)
                    or isinstance(start_char, bool)
                    or not isinstance(end_char, int)
                    or isinstance(end_char, bool)
                    or start_char < 0
                    or end_char <= start_char
                ):
                    errors.append(
                        f"{ref_location} has invalid character offsets."
                    )

    if data.get("chunks_failed", 0) != 0:
        warnings.append(
            "The extraction metadata reports failed chunks."
        )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "topics_checked": len(topics),
        "concepts_checked": concept_count,
        "concepts_with_source_refs": concepts_with_source_refs,
    }


def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"File not found: {INPUT_PATH.resolve()}"
        )

    data = json.loads(
        INPUT_PATH.read_text(encoding="utf-8")
    )

    report = validate_knowledge_tree(data)

    print("\nKnowledge Tree Validation Report")
    print("--------------------------------")
    print(f"Valid: {report['valid']}")
    print(f"Topics checked: {report['topics_checked']}")
    print(f"Concepts checked: {report['concepts_checked']}")
    print(
        "Concepts with source references: "
        f"{report['concepts_with_source_refs']}"
    )

    if report["errors"]:
        print("\nErrors:")
        for error in report["errors"]:
            print(f"- {error}")

    if report["warnings"]:
        print("\nWarnings:")
        for warning in report["warnings"]:
            print(f"- {warning}")

    if report["valid"]:
        print("\nSchema and basic source-reference checks passed.")
    else:
        print("\nValidation failed. Fix the errors before proceeding.")


if __name__ == "__main__":
    main()
