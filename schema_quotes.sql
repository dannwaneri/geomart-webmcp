-- Additive migration: run separately from schema.sql so re-running it
-- never risks the DROP TABLE IF EXISTS products at the top of schema.sql
-- wiping already-seeded catalog data.
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  reasoning_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
