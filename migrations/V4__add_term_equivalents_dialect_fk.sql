-- =============================================================================
-- Flyway Migration V4: Add Dialect FK to Term Equivalents
-- =============================================================================
-- Description: Add a structured dialect_id foreign key to term_equivalents
-- Author: dbRosetta API
-- Date: August 20, 2026
--
-- This migration adds:
-- - Nullable dialect_id column on term_equivalents, referencing dialects(id)
-- - A backfill of dialect_id by matching existing platform values to
--   dialects.name or dialects.display_name (case-insensitive)
-- - An index on dialect_id
-- - A partial unique constraint on (term_id, dialect_id) where dialect_id
--   is not null
--
-- This is additive only: the existing platform VARCHAR column and the
-- uq_term_equivalents_term_platform constraint are left in place unchanged.
-- Legacy free-text rows with no matching dialect (e.g. the SQLite rows)
-- keep dialect_id NULL.
-- =============================================================================

-- Add the new nullable column
ALTER TABLE dbrosetta.term_equivalents
    ADD COLUMN dialect_id INTEGER;

-- Foreign key to dialects
ALTER TABLE dbrosetta.term_equivalents
    ADD CONSTRAINT fk_term_equivalents_dialect
        FOREIGN KEY (dialect_id)
        REFERENCES dbrosetta.dialects(id);

-- Backfill dialect_id by case-insensitive match against name or display_name
UPDATE dbrosetta.term_equivalents te
SET dialect_id = d.id
FROM dbrosetta.dialects d
WHERE te.dialect_id IS NULL
  AND (
        lower(te.platform) = lower(d.name)
        OR lower(te.platform) = lower(d.display_name)
      );

-- Index for lookups by dialect
CREATE INDEX idx_term_equivalents_dialect ON dbrosetta.term_equivalents(dialect_id);

-- Partial unique constraint: only one equivalent per term per structured dialect
CREATE UNIQUE INDEX uq_term_equivalents_term_dialect
    ON dbrosetta.term_equivalents (term_id, dialect_id)
    WHERE dialect_id IS NOT NULL;

-- Documentation
COMMENT ON COLUMN dbrosetta.term_equivalents.dialect_id IS
    'Reference to the structured dialect for this platform; NULL for legacy free-text platforms not modeled in dialects (e.g. SQLite)';
