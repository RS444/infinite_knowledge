"""
Integration and Unit tests for AI Tutor and Learning Progress endpoints.
Verifies context retrieval, grounded excerpts, chat generation, conversation persistence,
reset functionality, concept completion persistence, and subject/topic progress calculations.
"""

import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.subject import Subject
from backend.app.models.topic import Topic
from backend.app.models.concept import Concept
from backend.app.models.tutor import ConceptProgress, TutorMessage


class TestAITutorAndProgress(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Find or ensure an existing concept and subject for testing
        self.concept = self.db.scalars(select(Concept)).first()
        self.assertIsNotNone(self.concept, "A concept must exist in DB for testing.")
        self.topic = self.db.get(Topic, self.concept.topic_id)
        self.assertIsNotNone(self.topic, "Topic must exist for the concept.")
        self.subject = self.db.get(Subject, self.topic.subject_id)
        self.assertIsNotNone(self.subject, "Subject must exist for the topic.")

    def tearDown(self):
        self.db.close()

    def test_get_concept_tutor_context(self):
        """
        GET /concepts/{id}/tutor must return complete concept metadata,
        topic/subject context, source excerpts, message history, and progress.
        """
        response = self.client.get(f"/concepts/{self.concept.id}/tutor")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("concept", data)
        self.assertEqual(data["concept"]["id"], self.concept.id)
        self.assertEqual(data["concept"]["name"], self.concept.name)

        self.assertIn("topic", data)
        self.assertEqual(data["topic"]["id"], self.topic.id)

        self.assertIn("subject", data)
        self.assertEqual(data["subject"]["id"], self.subject.id)

        self.assertIn("source_excerpts", data)
        self.assertIsInstance(data["source_excerpts"], list)

        self.assertIn("messages", data)
        self.assertIsInstance(data["messages"], list)

        self.assertIn("progress", data)
        self.assertEqual(data["progress"]["concept_id"], self.concept.id)

    def test_concept_progress_lifecycle(self):
        """
        POST and GET /concepts/{id}/progress must persist completion state
        in PostgreSQL across queries.
        """
        # Step 1: Mark as completed
        post_resp = self.client.post(
            f"/concepts/{self.concept.id}/progress",
            json={"completed": True},
        )
        self.assertEqual(post_resp.status_code, 200)
        post_data = post_resp.json()
        self.assertEqual(post_data["concept_id"], self.concept.id)
        self.assertTrue(post_data["completed"])
        self.assertIsNotNone(post_data["completed_at"])

        # Step 2: Fetch progress directly via GET
        get_resp = self.client.get(f"/concepts/{self.concept.id}/progress")
        self.assertEqual(get_resp.status_code, 200)
        get_data = get_resp.json()
        self.assertEqual(get_data["concept_id"], self.concept.id)
        self.assertTrue(get_data["completed"])

        # Step 3: Toggle back to incomplete
        post_resp2 = self.client.post(
            f"/concepts/{self.concept.id}/progress",
            json={"completed": False},
        )
        self.assertEqual(post_resp2.status_code, 200)
        post_data2 = post_resp2.json()
        self.assertFalse(post_data2["completed"])
        self.assertIsNone(post_data2["completed_at"])

    def test_subject_and_topic_progress_aggregation(self):
        """
        GET /subjects/{id}/progress must accurately calculate completion ratios
        and percentages across topics and the entire subject.
        """
        # Reset progress for testing
        self.client.post(f"/concepts/{self.concept.id}/progress", json={"completed": False})

        initial_resp = self.client.get(f"/subjects/{self.subject.id}/progress")
        self.assertEqual(initial_resp.status_code, 200)
        initial_data = initial_resp.json()
        self.assertIn("total_concepts", initial_data)
        self.assertIn("completed_concepts", initial_data)
        self.assertIn("topic_progress", initial_data)

        initial_completed = initial_data["completed_concepts"]

        # Mark concept completed
        self.client.post(f"/concepts/{self.concept.id}/progress", json={"completed": True})

        updated_resp = self.client.get(f"/subjects/{self.subject.id}/progress")
        self.assertEqual(updated_resp.status_code, 200)
        updated_data = updated_resp.json()

        self.assertEqual(updated_data["completed_concepts"], initial_completed + 1)
        self.assertIn(self.concept.id, updated_data["completed_concept_ids"])

        # Verify topic level progress
        topic_prog = updated_data["topic_progress"].get(str(self.topic.id))
        self.assertIsNotNone(topic_prog)
        self.assertGreaterEqual(topic_prog["completed_concepts"], 1)
        self.assertGreater(topic_prog["completion_percentage"], 0.0)

        # Cleanup
        self.client.post(f"/concepts/{self.concept.id}/progress", json={"completed": False})

    @patch("backend.app.services.tutor_service.chat")
    def test_tutor_chat_generation_and_persistence(self, mock_ollama_chat):
        """
        POST /concepts/{id}/tutor/chat must generate Socratic guidance,
        ground in sources, and store messages in PostgreSQL.
        """
        mock_response = MagicMock()
        mock_response.message.content = "SQL stands for Structured Query Language used to interact with relational databases."
        mock_ollama_chat.return_value = mock_response

        # Send student prompt
        student_prompt = "What does SQL stand for?"
        resp = self.client.post(
            f"/concepts/{self.concept.id}/tutor/chat",
            json={"message": student_prompt},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["role"], "assistant")
        self.assertIn("SQL stands for", data["content"])
        self.assertEqual(data["concept_id"], self.concept.id)

        # Verify persistence in tutor_messages
        messages_resp = self.client.get(f"/concepts/{self.concept.id}/tutor")
        messages = messages_resp.json()["messages"]

        student_msgs = [
            m for m in messages if m["role"] in ("user", "student") and m["content"] == student_prompt
        ]
        assistant_msgs = [
            m for m in messages if m["role"] == "assistant" and "SQL stands for" in m["content"]
        ]

        self.assertGreaterEqual(len(student_msgs), 1)
        self.assertGreaterEqual(len(assistant_msgs), 1)

    def test_tutor_reset_conversation(self):
        """
        POST /concepts/{id}/tutor/reset must clear conversation history
        for the given concept without deleting progress.
        """
        # Insert a dummy message directly
        msg = TutorMessage(concept_id=self.concept.id, role="student", content="Temporary question")
        self.db.add(msg)
        self.db.commit()

        reset_resp = self.client.post(f"/concepts/{self.concept.id}/tutor/reset")
        self.assertEqual(reset_resp.status_code, 200)

        # Verify history is now empty
        tutor_data = self.client.get(f"/concepts/{self.concept.id}/tutor").json()
        self.assertEqual(len(tutor_data["messages"]), 0)

    def test_validation_and_not_found_handling(self):
        """
        Ensure non-existent IDs return 404 and empty messages return 422.
        """
        # Concept 404
        resp = self.client.get("/concepts/9999999/tutor")
        self.assertEqual(resp.status_code, 404)

        # Empty chat message 422
        resp = self.client.post(
            f"/concepts/{self.concept.id}/tutor/chat",
            json={"message": "    "},
        )
        self.assertEqual(resp.status_code, 422)

        # Subject 404
        resp = self.client.get("/subjects/9999999/progress")
        self.assertEqual(resp.status_code, 404)
