-- Run this in the Neon SQL Editor. Two simple tables.
CREATE TABLE IF NOT EXISTS tests (
  test_id      TEXT PRIMARY KEY,           -- the assessment ID you type, e.g. 001
  test_date    DATE NOT NULL,
  max_ib_lp    NUMERIC(10,2) NOT NULL CHECK (max_ib_lp > 0),
  max_isp_lp   NUMERIC(10,2) NOT NULL CHECK (max_isp_lp > 0),
  max_ib_doc   NUMERIC(10,2) NOT NULL CHECK (max_ib_doc > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_marks (
  test_id  TEXT NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
  teacher  TEXT NOT NULL,
  ib_lp    NUMERIC(10,2),                  -- blank (NULL) = not attempted
  isp_lp   NUMERIC(10,2),
  ib_doc   NUMERIC(10,2),
  PRIMARY KEY (test_id, teacher)
);

-- Optional: remove tables from earlier versions of this project.
-- DROP TABLE IF EXISTS marks;
-- DROP TABLE IF EXISTS scores;
-- DROP TABLE IF EXISTS assessments;
-- DROP TABLE IF EXISTS educators;
