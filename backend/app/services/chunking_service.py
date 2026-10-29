
from dataclasses import dataclass


@dataclass
class TextChunk:
    chunk_index: int
    text: str
    start_char: int
    end_char: int


def chunk_text(
    text: str,
    chunk_size: int = 3000,
    overlap: int = 300,
) -> list[TextChunk]:
    """
    Split text into overlapping chunks.

    Character offsets refer to positions in the original text.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be >= 0 and smaller than chunk_size")

    chunks: list[TextChunk] = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        # Prefer a nearby paragraph or sentence boundary.
        if end < len(text):
            boundary = max(
                text.rfind("\n\n", start, end),
                text.rfind(". ", start, end),
                text.rfind("\n", start, end),
            )

            if boundary > start + chunk_size // 2:
                end = boundary + 1

        chunk_content = text[start:end].strip()

        if chunk_content:
            chunks.append(
                TextChunk(
                    chunk_index=chunk_index,
                    text=chunk_content,
                    start_char=start,
                    end_char=end,
                )
            )
            chunk_index += 1

        if end >= len(text):
            break

        start = max(end - overlap, start + 1)

    return chunks
