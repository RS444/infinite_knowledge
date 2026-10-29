"""
Integration tests for Subject Renaming and Deletion API endpoints.
Verifies PATCH /subjects/{id} and DELETE /subjects/{id} behavior,
cascading tree cleanup, document retention, validation, and error codes.
"""

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.document import Document
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.concept import Concept
from backend.app.models.source_reference import SourceReference


class TestSubjectManagement(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_rename_subject_success(self):
        """
        PATCH /subjects/{id} must successfully rename an existing subject,
        preserve document ID, and persist across queries.
        """
        # Fetch an existing subject
        subject = self.db.scalars(select(Subject)).first()
        self.assertIsNotNone(subject, "At least one subject must exist for testing")
        original_doc_id = subject.document_id
        original_name = subject.name

        new_name = "Machine Learning Core Fundamentals"
        response = self.client.patch(
            f"/subjects/{subject.id}",
            json={"name": new_name},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], subject.id)
        self.assertEqual(data["name"], new_name)
        self.assertEqual(data["document_id"], original_doc_id)

        # Verify DB persistence
        self.db.expire_all()
        updated_subject = self.db.get(Subject, subject.id)
        self.assertEqual(updated_subject.name, new_name)
        self.assertEqual(updated_subject.document_id, original_doc_id)

        # Verify associated document was not changed
        doc = self.db.get(Document, original_doc_id)
        self.assertIsNotNone(doc)
        self.assertEqual(doc.id, original_doc_id)

        # Restore original name
        self.client.patch(
            f"/subjects/{subject.id}",
            json={"name": original_name},
        )

    def test_rename_subject_whitespace_trimming(self):
        """
        Surrounding whitespace must be trimmed automatically.
        """
        subject = self.db.scalars(select(Subject)).first()
        self.assertIsNotNone(subject)
        original_name = subject.name

        response = self.client.patch(
            f"/subjects/{subject.id}",
            json={"name": "   Machine Learning Trimmed   "},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Machine Learning Trimmed")

        # Restore original name
        self.client.patch(
            f"/subjects/{subject.id}",
            json={"name": original_name},
        )

    def test_rename_subject_validation_rejections(self):
        """
        Empty strings, whitespace only, or missing fields must return HTTP 422.
        """
        subject = self.db.scalars(select(Subject)).first()
        self.assertIsNotNone(subject)

        # Empty string
        res_empty = self.client.patch(f"/subjects/{subject.id}", json={"name": ""})
        self.assertEqual(res_empty.status_code, 422)

        # Whitespace only
        res_whitespace = self.client.patch(
            f"/subjects/{subject.id}", json={"name": "     "}
        )
        self.assertEqual(res_whitespace.status_code, 422)

        # Missing name key
        res_missing = self.client.patch(f"/subjects/{subject.id}", json={})
        self.assertEqual(res_missing.status_code, 422)

    def test_rename_nonexistent_subject_returns_404(self):
        """
        PATCH /subjects/{nonexistent_id} must return HTTP 404 with clear detail.
        """
        response = self.client.patch(
            "/subjects/999999",
            json={"name": "Ghost Subject"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertIn("Subject #999999 not found.", response.json()["detail"])

    def test_delete_nonexistent_subject_returns_404(self):
        """
        DELETE /subjects/{nonexistent_id} must return HTTP 404 with clear detail.
        """
        response = self.client.delete("/subjects/999999")
        self.assertEqual(response.status_code, 404)
        self.assertIn("Subject #999999 not found.", response.json()["detail"])

    def test_delete_subject_cascades_tree_and_preserves_document(self):
        """
        DELETE /subjects/{id} must:
        1. Remove the subject record.
        2. Clean up associated topics, concepts, and source references.
        3. PRESERVE the document in the documents table along with its extracted text.
        """
        # Create a dedicated temporary subject, topic, concept, and source reference
        # linked to Document #1 to test complete cascade without losing existing test data
        doc = self.db.get(Document, 1)
        self.assertIsNotNone(doc)

        # Create a test document specifically for deletion testing
        test_doc = Document(
            filename="temporary_delete_test.pdf",
            file_type="pdf",
            status="processed",
            extracted_text="Temporary text for deletion test verification.",
        )
        self.db.add(test_doc)
        self.db.commit()
        self.db.refresh(test_doc)

        test_subject = Subject(
            name="Temporary Deletion Test Subject",
            document_id=test_doc.id,
        )
        self.db.add(test_subject)
        self.db.commit()
        self.db.refresh(test_subject)

        test_topic = Topic(
            subject_id=test_subject.id,
            name="Temporary Topic",
            description="Testing cascade delete",
        )
        self.db.add(test_topic)
        self.db.commit()
        self.db.refresh(test_topic)

        test_concept = Concept(
            topic_id=test_topic.id,
            name="Temporary Concept",
            summary="A test concept",
            keywords=["test", "delete"],
            learning_objective="Verify cascading deletion",
        )
        self.db.add(test_concept)
        self.db.commit()
        self.db.refresh(test_concept)

        test_source_ref = SourceReference(
            concept_id=test_concept.id,
            document_id=test_doc.id,
            chunk_index=0,
            start_char=0,
            end_char=20,
        )
        self.db.add(test_source_ref)
        self.db.commit()

        subject_id = test_subject.id
        topic_id = test_topic.id
        concept_id = test_concept.id
        doc_id = test_doc.id

        # Execute DELETE via API client
        response = self.client.delete(f"/subjects/{subject_id}")
        self.assertEqual(response.status_code, 204)

        # Verify subject is gone
        self.db.expire_all()
        self.assertIsNone(self.db.get(Subject, subject_id))

        # Verify topic, concept, and source reference are deleted
        self.assertIsNone(self.db.get(Topic, topic_id))
        self.assertIsNone(self.db.get(Concept, concept_id))
        remaining_refs = self.db.scalars(
            select(SourceReference).where(SourceReference.concept_id == concept_id)
        ).all()
        self.assertEqual(len(remaining_refs), 0)

        # CRITICAL CONSTRAINT: Verify Document STILL EXISTS in documents table!
        preserved_doc = self.db.get(Document, doc_id)
        self.assertIsNotNone(preserved_doc)
        self.assertEqual(preserved_doc.filename, "temporary_delete_test.pdf")
        self.assertEqual(
            preserved_doc.extracted_text,
            "Temporary text for deletion test verification.",
        )

        # Clean up temporary document row
        self.db.delete(preserved_doc)
        self.db.commit()


if __name__ == "__main__":
    unittest.main()
