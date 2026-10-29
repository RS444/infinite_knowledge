from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class SourceReference(Base):
    __tablename__ = "source_references"

    __table_args__ = (
        UniqueConstraint(
            "concept_id",
            "document_id",
            "chunk_index",
            "start_char",
            "end_char",
            name="uq_concept_source_location",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    concept_id: Mapped[int] = mapped_column(
        ForeignKey("concepts.id"),
        nullable=False,
        index=True,
    )

    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id"),
        nullable=False,
    )

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_char: Mapped[int] = mapped_column(Integer, nullable=False)
    end_char: Mapped[int] = mapped_column(Integer, nullable=False)