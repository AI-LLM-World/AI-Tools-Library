AI tools seed data

Format
- data/ai_tools.json is an array of objects. Each object contains:
  - id: stable unique string id
  - name: human-friendly name
  - category: one of high-level categories (NLP, Vision, Speech, Data, Agents, Search, Analytics, Security, DevTools, Design, Finance, Productivy, Robotics, Healthcare, etc.)
  - short_description: one-line summary
  - website: example or vendor URL
  - tags: array of short tags
  - example_use: short example of how the tool is used

Suggested next steps
1. If you have an app that persists tools, write a small loader script that reads this JSON and upserts into your DB using your application's data model. Ensure you validate required fields and deduplicate by `id`.
2. If you need SQL seeds instead, convert this file to INSERT statements or a migration.
3. If you want this as fixtures for tests, import the JSON into your test setup and use factories to create DB records.

Notes
- Keep ids stable across runs to avoid creating duplicate entities. The sample dataset contains 52 entries across multiple categories.
