
import json
from ollama import chat

prompt = """
Extract SQL knowledge and return JSON using this structure:
{
  "topics": [
    {
      "name": "SQL Basics",
      "concepts": [
        {
          "name": "Primary Keys",
          "summary": "Uniquely identify rows",
          "keywords": ["primary key", "uniqueness"],
          "learning_objective": "Explain primary keys"
        }
      ]
    }
  ]
}

Use the supplied structure, but extract knowledge from this text:
SQL databases use primary keys to uniquely identify rows.
Foreign keys connect related tables.
Return JSON only.
"""

response = chat(
    model="qwen3:4b",
    messages=[{"role": "user", "content": prompt}],
    format="json",
    think=False,
    options={"temperature": 0, "num_predict": 1000},
)

raw = response.message.content or ""

print("RAW RESPONSE:")
print(raw)

try:
    data = json.loads(raw)
    print("\nJSON parsed successfully.")

    if isinstance(data.get("topics"), list):
        print("Topics is a list.")
        for topic in data["topics"]:
            print("Topic:", topic.get("name", "(missing name)"))
            print("Concepts:", len(topic.get("concepts", [])))
    else:
        print('ERROR: "topics" is not a list.')

except json.JSONDecodeError as exc:
    print("INVALID JSON:", exc)
