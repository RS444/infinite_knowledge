
import json
import re

from ollama import chat


MODEL_NAME = "qwen3:4b"

EXTRACTION_PROMPT = """
You are an academic knowledge extraction system.

Extract information ONLY from the supplied source text.
Do not use outside knowledge or invent facts.

Return a JSON object with exactly this structure:
{
  "topics": [
    {
      "name": "Topic name",
      "concepts": [
        {
          "name": "Concept name",
          "summary": "Explanation supported by the source",
          "keywords": ["keyword1", "keyword2"],
          "learning_objective": "What the student should learn"
        }
      ]
    }
  ]
}

Rules:
- Always include the top-level "topics" array.
- Each topic must contain a "name" and a "concepts" array.
- Each concept must contain name, summary, keywords, and learning_objective.
- Extract at most 3 topics and 3 concepts per topic.
- Keep summaries and learning objectives concise.
- Prefer the most important concepts when the source is lengthy.
- Each topic must represent a distinct subject area.
- Group related concepts under the same topic.
- Summaries must be concise and supported by the source.
- Learning objectives must be concise and student-focused.
- If no useful knowledge is present, return {"topics": []}.
- Return JSON only. Do not use Markdown fences.
"""


def clean_and_parse_json(content: str) -> dict:
    if not content or not content.strip():
        raise ValueError("The model returned empty content.")

    text = content.strip()

    # 1. Strip <think>...</think> if present
    if "<think>" in text and "</think>" in text:
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # 2. Strip markdown fences if present
    if "```" in text:
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

    # 3. If there is surrounding text, locate the outermost JSON object
    if not (text.startswith("{") and text.endswith("}")):
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]

    # 4. Attempt standard JSON parsing
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        # Fallback repair: remove trailing commas before closing braces/brackets
        cleaned_text = re.sub(r",\s*([}\]])", r"\1", text)
        try:
            data = json.loads(cleaned_text)
        except json.JSONDecodeError:
            raise ValueError(f"The model returned invalid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError("The model response must be a JSON object.")

    return data


def validate_result(content: str) -> dict:
    result = clean_and_parse_json(content)

    topics = result.get("topics")
    if not isinstance(topics, list):
        # Check if the model nested topics under an alternative key
        for alt_key in ("knowledge_tree", "data", "result", "subject"):
            alt_val = result.get(alt_key)
            if isinstance(alt_val, dict) and isinstance(alt_val.get("topics"), list):
                topics = alt_val["topics"]
                break
            elif isinstance(alt_val, list):
                topics = alt_val
                break

    if not isinstance(topics, list):
        raise ValueError('The model response must contain a "topics" list.')

    validated_topics = []

    for topic in topics:
        if not isinstance(topic, dict):
            continue

        # Support synonyms for topic name
        topic_name = (
            topic.get("name")
            or topic.get("title")
            or topic.get("topic_name")
            or ""
        )
        if not isinstance(topic_name, str) or not topic_name.strip():
            continue

        raw_concepts = topic.get("concepts") or topic.get("subtopics") or []
        if not isinstance(raw_concepts, list):
            raw_concepts = []

        validated_concepts = []
        for concept in raw_concepts:
            if not isinstance(concept, dict):
                continue

            # Support synonyms for concept name
            concept_name = (
                concept.get("name")
                or concept.get("title")
                or concept.get("concept_name")
                or ""
            )
            if not isinstance(concept_name, str) or not concept_name.strip():
                continue

            # Support synonyms for summary
            summary = (
                concept.get("summary")
                or concept.get("description")
                or concept.get("explanation")
                or concept.get("content")
                or ""
            )
            if not isinstance(summary, str) or not summary.strip():
                summary = f"Overview of {concept_name}."

            # Support synonyms for learning objective
            learning_obj = (
                concept.get("learning_objective")
                or concept.get("objective")
                or concept.get("goal")
                or f"Understand the core principles and applications of {concept_name}."
            )
            if not isinstance(learning_obj, str) or not learning_obj.strip():
                learning_obj = f"Understand {concept_name}."

            # Normalize keywords to list of strings
            raw_keywords = concept.get("keywords") or concept.get("tags") or []
            if isinstance(raw_keywords, str):
                keywords = [k.strip() for k in raw_keywords.split(",") if k.strip()]
            elif isinstance(raw_keywords, list):
                keywords = [str(k).strip() for k in raw_keywords if str(k).strip()]
            else:
                keywords = []

            if not keywords:
                keywords = [concept_name.lower()]

            validated_concepts.append(
                {
                    "name": concept_name.strip(),
                    "summary": summary.strip(),
                    "keywords": keywords,
                    "learning_objective": learning_obj.strip(),
                }
            )

        if validated_concepts:
            validated_topics.append(
                {
                    "name": topic_name.strip(),
                    "concepts": validated_concepts,
                }
            )

    result["topics"] = validated_topics
    return result


def extract_knowledge(chunk_text: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": EXTRACTION_PROMPT,
        },
        {
            "role": "user",
            "content": (
                "Extract academic knowledge from the following source text. "
                "Follow the required JSON structure exactly.\n\n"
                "<source_text>\n"
                + chunk_text
                + "\n</source_text>"
            ),
        },
    ]

    last_error = None

    for attempt in range(2):
        response = chat(
            model=MODEL_NAME,
            messages=messages,
            format="json",
            think=False,
            options={
                "temperature": 0.1,
                "repeat_penalty": 1.1,
                "num_predict": 1800,
            },
        )

        content = response.message.content or ""

        try:
            return validate_result(content)

        except ValueError as exc:
            last_error = exc

            if attempt == 0:
                messages.append(
                    {
                        "role": "assistant",
                        "content": content,
                    }
                )
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Your previous response did not match the "
                            "required schema. Correct it. Return a JSON "
                            'object containing a top-level "topics" array. '
                            "Every topic needs a name and concepts array. "
                            "Every concept needs name, summary, keywords, "
                            "and learning_objective. Return JSON only."
                        ),
                    }
                )

    raise ValueError(
        f"Knowledge extraction failed after 2 attempts: {last_error}"
    )
