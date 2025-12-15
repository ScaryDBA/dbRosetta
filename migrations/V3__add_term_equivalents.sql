-- =============================================================================
-- Flyway Migration V3: Add Term Equivalents Table
-- =============================================================================
-- Description: Create term_equivalents table for cross-platform term mappings
-- Author: dbRosetta API
-- Date: December 15, 2025
-- 
-- This migration adds:
-- - term_equivalents table to map equivalent terms across database platforms
-- - Foreign key relationship to terms table
-- - Unique constraint on term_id + platform combination
-- - Indexes for efficient lookups
-- 
-- Example: WAL (PostgreSQL) → Transaction Log (SQL Server) → Redo Log (Oracle)
-- =============================================================================

-- Create term_equivalents table
CREATE TABLE dbrosetta.term_equivalents (
    id SERIAL PRIMARY KEY,
    term_id INTEGER NOT NULL,
    platform VARCHAR(100) NOT NULL,
    equivalent_term VARCHAR(200) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to terms table
    CONSTRAINT fk_term_equivalents_term 
        FOREIGN KEY (term_id) 
        REFERENCES dbrosetta.terms(id) 
        ON DELETE CASCADE,
    
    -- Ensure unique term-platform combinations
    CONSTRAINT uq_term_equivalents_term_platform 
        UNIQUE (term_id, platform)
);

-- Create indexes for efficient queries
CREATE INDEX idx_term_equivalents_term ON dbrosetta.term_equivalents(term_id);
CREATE INDEX idx_term_equivalents_platform ON dbrosetta.term_equivalents(platform);

-- Add comment to table
COMMENT ON TABLE dbrosetta.term_equivalents IS 
    'Stores equivalent terminology for database concepts across different platforms (e.g., WAL in PostgreSQL vs Transaction Log in SQL Server)';

-- Add column comments
COMMENT ON COLUMN dbrosetta.term_equivalents.term_id IS 
    'Reference to the canonical term in the terms table';
COMMENT ON COLUMN dbrosetta.term_equivalents.platform IS 
    'Database platform name (e.g., PostgreSQL, SQL Server, Oracle, MySQL, SQLite)';
COMMENT ON COLUMN dbrosetta.term_equivalents.equivalent_term IS 
    'The equivalent term used in this specific platform';
COMMENT ON COLUMN dbrosetta.term_equivalents.notes IS 
    'Optional clarifications about usage differences or caveats';
