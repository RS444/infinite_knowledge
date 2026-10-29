import unittest
from backend.app.services.knowledge_extraction_service import validate_result


class TestExtractionResilience(unittest.TestCase):
    def test_markdown_code_fences(self):
        content = """```json
{
  "topics": [
    {
      "name": "Artificial Intelligence",
      "concepts": [
        {
          "name": "Neural Networks",
          "summary": "Deep learning computational model",
          "keywords": ["deep", "learning"],
          "learning_objective": "Learn neural network basics"
        }
      ]
    }
  ]
}
```"""
        result = validate_result(content)
        self.assertEqual(len(result["topics"]), 1)
        self.assertEqual(result["topics"][0]["name"], "Artificial Intelligence")

    def test_think_tags_and_synonyms(self):
        content = """<think>Internal reasoning step</think>
{
  "topics": [
    {
      "title": "Calculus",
      "concepts": [
        {
          "title": "Derivatives",
          "description": "Rate of change calculation",
          "keywords": "tangent, rate, slope",
          "objective": "Compute basic derivatives"
        }
      ]
    }
  ]
}"""
        result = validate_result(content)
        self.assertEqual(len(result["topics"]), 1)
        topic = result["topics"][0]
        self.assertEqual(topic["name"], "Calculus")
        concept = topic["concepts"][0]
        self.assertEqual(concept["name"], "Derivatives")
        self.assertEqual(concept["summary"], "Rate of change calculation")
        self.assertEqual(concept["keywords"], ["tangent", "rate", "slope"])
        self.assertEqual(concept["learning_objective"], "Compute basic derivatives")

    def test_trailing_commas_and_prose_wrapping(self):
        content = """Here is the extracted knowledge:
{
  "topics": [
    {
      "name": "Databases",
      "concepts": [
        {
          "name": "ACID",
          "summary": "Atomicity, Consistency, Isolation, Durability",
          "keywords": ["transactions",],
          "learning_objective": "Explain ACID principles",
        },
      ],
    },
  ],
}
Hope this helps!"""
        result = validate_result(content)
        self.assertEqual(len(result["topics"]), 1)
        self.assertEqual(result["topics"][0]["name"], "Databases")
        self.assertEqual(result["topics"][0]["concepts"][0]["name"], "ACID")

