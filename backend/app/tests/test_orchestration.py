"""
Focused integration tests for knowledge extraction orchestration.
Tests in-memory execution, duplicate prevention, and error handling.
"""

import unittest
from sqlalchemy import select, func

from backend.app.db.session import SessionLocal
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.concept import Concept
from backend.app.models.source_reference import SourceReference
from backend.app.services.knowledge_orchestration_service import (
    orchestrate_knowledge_extraction,
    DocumentNotFoundError,
    EmptyDocumentError,
    PipelineValidationError,
)
from backend.app.services.knowledge_validation_service import validate_knowledge_tree


class TestKnowledgeOrchestration(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_duplicate_prevention_on_document_5(self):
        """
        Processing an already processed document must return status 'already_processed'
        without creating duplicate subjects or modifying existing trees.
        """
        initial_subject_count = self.db.scalar(select(func.count(Subject.id)))
        
        result = orchestrate_knowledge_extraction(
            document_id=5,
            db=self.db,
            allow_reprocess=False,
        )

        self.assertEqual(result["status"], "already_processed")
        self.assertTrue(result["is_duplicate"])
        self.assertEqual(result["document_id"], 5)
        self.assertGreater(result["topic_count"], 0)
        self.assertGreater(result["concept_count"], 0)

        final_subject_count = self.db.scalar(select(func.count(Subject.id)))
        self.assertEqual(initial_subject_count, final_subject_count)

    def test_missing_document_raises_error(self):
        """
        Non-existent document IDs must raise DocumentNotFoundError cleanly.
        """
        with self.assertRaises(DocumentNotFoundError):
            orchestrate_knowledge_extraction(
                document_id=999999,
                db=self.db,
            )

    def test_stored_source_references_integrity(self):
        """
        Verify that concepts stored for Document #5 have valid source references
        pointing to Document #5 with non-negative character offsets.
        """
        subject = self.db.scalar(
            select(Subject).where(Subject.document_id == 5)
        )
        self.assertIsNotNone(subject)

        topics = self.db.scalars(
            select(Topic).where(Topic.subject_id == subject.id)
        ).all()
        self.assertGreater(len(topics), 0)

        topic_ids = [t.id for t in topics]
        concepts = self.db.scalars(
            select(Concept).where(Concept.topic_id.in_(topic_ids))
        ).all()
        self.assertGreater(len(concepts), 0)

        concept_ids = [c.id for c in concepts]
        refs = self.db.scalars(
            select(SourceReference).where(
                SourceReference.concept_id.in_(concept_ids)
            )
        ).all()
        self.assertGreater(len(refs), 0)

        for ref in refs:
            self.assertEqual(ref.document_id, 5)
            self.assertGreaterEqual(ref.chunk_index, 0)
            self.assertGreaterEqual(ref.start_char, 0)
            self.assertGreater(ref.end_char, ref.start_char)

    def test_validation_rejects_empty_topics(self):
        """
        validate_knowledge_tree must fail when topics list is empty or invalid.
        """
        bad_data = {
            "document_id": 5,
            "chunks_total": 2,
            "topics": "not-a-list"
        }
        report = validate_knowledge_tree(bad_data)
        self.assertFalse(report["valid"])


if __name__ == "__main__":
    unittest.main()
