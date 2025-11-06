-- =============================================================================
-- dbRosetta Schema Initialization (revised)
-- =============================================================================
-- ASSUMPTIONS:
-- - PostgreSQL version 11+ (Azure Database for PostgreSQL compatible)
-- - UTF-8 encoding
-- - Target database already exists
-- - Schema owner placeholder: replace 'dbrosetta_owner' with actual role
-- - Non-destructive: no DROP statements in this file
-- =============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS dbrosetta AUTHORIZATION current_user;

-- Use explicit schema qualification where helpful; set session search_path for convenience
SET search_path TO dbrosetta, public;

-- =============================================================================
-- TABLE: dialects
-- Stores SQL dialect definitions and metadata
-- =============================================================================
CREATE TABLE dbrosetta.dialects (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    version VARCHAR(20),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for dialects table
CREATE INDEX IF NOT EXISTS idx_dialects_name ON dbrosetta.dialects (name);
CREATE INDEX IF NOT EXISTS idx_dialects_active ON dbrosetta.dialects (is_active);
CREATE INDEX IF NOT EXISTS idx_dialects_metadata ON dbrosetta.dialects USING GIN (metadata);

-- Comments for dialects table
COMMENT ON TABLE dbrosetta.dialects IS 'SQL dialect definitions and metadata for translation system';
COMMENT ON COLUMN dbrosetta.dialects.name IS 'Unique identifier for the dialect (lowercase, no spaces)';
COMMENT ON COLUMN dbrosetta.dialects.display_name IS 'Human-readable name for the dialect';
COMMENT ON COLUMN dbrosetta.dialects.version IS 'Version identifier for the dialect';
COMMENT ON COLUMN dbrosetta.dialects.is_active IS 'Flag to enable/disable dialect for translations';
COMMENT ON COLUMN dbrosetta.dialects.metadata IS 'Additional dialect configuration and features as JSON';

-- =============================================================================
-- TABLE: terms
-- Stores canonical SQL terms and their definitions
-- =============================================================================
CREATE TABLE dbrosetta.terms (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canonical_term VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    usage_context TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for terms table
CREATE INDEX IF NOT EXISTS idx_terms_canonical ON dbrosetta.terms (canonical_term);
CREATE UNIQUE INDEX IF NOT EXISTS uq_terms_canonical_lower ON dbrosetta.terms (lower(canonical_term));
CREATE INDEX IF NOT EXISTS idx_terms_category ON dbrosetta.terms (category);
CREATE INDEX IF NOT EXISTS idx_terms_active ON dbrosetta.terms (is_active);
CREATE INDEX IF NOT EXISTS idx_terms_category_sub ON dbrosetta.terms (category, subcategory);
CREATE INDEX IF NOT EXISTS idx_terms_metadata ON dbrosetta.terms USING GIN (metadata);

-- Comments for terms table
COMMENT ON TABLE dbrosetta.terms IS 'Canonical SQL terms and definitions for cross-dialect translation';
COMMENT ON COLUMN dbrosetta.terms.canonical_term IS 'Standardized term identifier (case-insensitive uniqueness enforced via index)';
COMMENT ON COLUMN dbrosetta.terms.category IS 'Primary classification of the term (e.g., function, operator, keyword)';
COMMENT ON COLUMN dbrosetta.terms.subcategory IS 'Secondary classification for more specific grouping';
COMMENT ON COLUMN dbrosetta.terms.usage_context IS 'Additional context about when and how to use this term';
COMMENT ON COLUMN dbrosetta.terms.metadata IS 'Additional term properties and configuration as JSON';

-- =============================================================================
-- TABLE: translations
-- Stores dialect-specific translations for canonical terms
-- =============================================================================
CREATE TABLE dbrosetta.translations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    term_id INTEGER NOT NULL,
    dialect_id INTEGER NOT NULL,
    translated_term TEXT NOT NULL,
    syntax_pattern TEXT,
    examples TEXT,
    notes TEXT,
    confidence_level INTEGER DEFAULT 100 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_translations_term FOREIGN KEY (term_id) REFERENCES dbrosetta.terms(id) ON DELETE CASCADE,
    CONSTRAINT fk_translations_dialect FOREIGN KEY (dialect_id) REFERENCES dbrosetta.dialects(id) ON DELETE CASCADE,
    CONSTRAINT uq_translations_term_dialect UNIQUE (term_id, dialect_id)
);

-- Indexes for translations table
CREATE INDEX IF NOT EXISTS idx_translations_term ON dbrosetta.translations (term_id);
CREATE INDEX IF NOT EXISTS idx_translations_dialect ON dbrosetta.translations (dialect_id);
CREATE INDEX IF NOT EXISTS idx_translations_active ON dbrosetta.translations (is_active);
CREATE INDEX IF NOT EXISTS idx_translations_confidence ON dbrosetta.translations (confidence_level);
CREATE INDEX IF NOT EXISTS idx_translations_term_dialect ON dbrosetta.translations (term_id, dialect_id);
CREATE INDEX IF NOT EXISTS idx_translations_metadata ON dbrosetta.translations USING GIN (metadata);

-- Comments for translations table
COMMENT ON TABLE dbrosetta.translations IS 'Dialect-specific translations for canonical terms with caching support';
COMMENT ON COLUMN dbrosetta.translations.translated_term IS 'The dialect-specific equivalent of the canonical term';
COMMENT ON COLUMN dbrosetta.translations.syntax_pattern IS 'Template or pattern showing how to use the translated term';
COMMENT ON COLUMN dbrosetta.translations.examples IS 'Example usage in the target dialect';
COMMENT ON COLUMN dbrosetta.translations.confidence_level IS 'Translation accuracy confidence (0-100)';
COMMENT ON COLUMN dbrosetta.translations.metadata IS 'Additional translation properties and caching hints as JSON';

-- =============================================================================
-- TABLE: artifacts
-- Stores generated SQL artifacts and their metadata
-- =============================================================================
CREATE TABLE dbrosetta.artifacts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    artifact_type VARCHAR(50) NOT NULL,
    source_dialect_id INTEGER REFERENCES dbrosetta.dialects(id) ON DELETE SET NULL,
    target_dialect_id INTEGER REFERENCES dbrosetta.dialects(id) ON DELETE SET NULL,
    original_sql TEXT,
    translated_sql TEXT,
    translation_summary TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for artifacts table
CREATE INDEX IF NOT EXISTS idx_artifacts_name ON dbrosetta.artifacts (name);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON dbrosetta.artifacts (artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_source_dialect ON dbrosetta.artifacts (source_dialect_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_target_dialect ON dbrosetta.artifacts (target_dialect_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON dbrosetta.artifacts (status);
CREATE INDEX IF NOT EXISTS idx_artifacts_created ON dbrosetta.artifacts (created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_metadata ON dbrosetta.artifacts USING GIN (metadata);

-- Comments for artifacts table
COMMENT ON TABLE dbrosetta.artifacts IS 'Generated SQL artifacts from translation processes';
COMMENT ON COLUMN dbrosetta.artifacts.name IS 'User-friendly name for the artifact';
COMMENT ON COLUMN dbrosetta.artifacts.artifact_type IS 'Type of artifact (e.g., script, procedure, schema)';
COMMENT ON COLUMN dbrosetta.artifacts.original_sql IS 'Source SQL before translation';
COMMENT ON COLUMN dbrosetta.artifacts.translated_sql IS 'SQL after dialect translation';
COMMENT ON COLUMN dbrosetta.artifacts.translation_summary IS 'Summary of changes made during translation';
COMMENT ON COLUMN dbrosetta.artifacts.status IS 'Artifact status (draft, validated, deployed, etc.)';
COMMENT ON COLUMN dbrosetta.artifacts.metadata IS 'Additional artifact properties and processing metadata as JSON';

-- =============================================================================
-- EXAMPLE DATA
-- Sample dialects and basic term translations
-- =============================================================================

-- Insert sample dialects (replace with controlled upserts if rerunning)
INSERT INTO dbrosetta.dialects (name, display_name, version, description, metadata) VALUES
('postgresql', 'PostgreSQL', '13+', 'PostgreSQL database system', '{"features": ["arrays", "jsonb", "cte"], "url": "https://postgresql.org"}'),
('sqlserver', 'Microsoft SQL Server', '2019+', 'Microsoft SQL Server database system', '{"features": ["cte", "windowing", "xml"], "url": "https://microsoft.com/sql"}'),
('mysql', 'MySQL', '8.0+', 'MySQL database system', '{"features": ["json", "cte"], "url": "https://mysql.com"}');

-- Insert sample terms
INSERT INTO dbrosetta.terms (canonical_term, category, subcategory, description, usage_context) VALUES
('CONCAT', 'function', 'string', 'Concatenates two or more strings together', 'String manipulation and formatting'),
('ISNULL', 'function', 'conditional', 'Tests if a value is NULL and returns alternative', 'NULL handling and conditional logic'),
('LIMIT', 'clause', 'query', 'Limits the number of rows returned by a query', 'Result set pagination and performance');

-- Insert sample translations
-- Note: term_id and dialect_id assume the sample inserts above produced sequential IDs starting at 1.
-- If rerunning against an existing DB, use explicit lookups or UPSERT logic in application layer.
INSERT INTO dbrosetta.translations (term_id, dialect_id, translated_term, syntax_pattern, examples, confidence_level) VALUES
-- CONCAT translations
(1, 1, 'CONCAT', 'CONCAT(string1, string2, ...)', 'SELECT CONCAT(''Hello'', '' '', ''World'');', 100),
(1, 2, 'CONCAT', 'CONCAT(string1, string2, ...)', 'SELECT CONCAT(''Hello'', '' '', ''World'');', 100),
(1, 3, 'CONCAT', 'CONCAT(string1, string2, ...)', 'SELECT CONCAT(''Hello'', '' '', ''World'');', 100),

-- ISNULL translations
(2, 1, 'COALESCE', 'COALESCE(value, replacement)', 'SELECT COALESCE(column, ''N/A'') FROM table;', 95),
(2, 2, 'ISNULL', 'ISNULL(value, replacement)', 'SELECT ISNULL(column, ''N/A'') FROM table;', 100),
(2, 3, 'IFNULL', 'IFNULL(value, replacement)', 'SELECT IFNULL(column, ''N/A'') FROM table;', 100),

-- LIMIT translations
(3, 1, 'LIMIT', 'LIMIT count [OFFSET offset]', 'SELECT * FROM table LIMIT 10 OFFSET 20;', 100),
(3, 2, 'TOP', 'TOP (count)', 'SELECT TOP (10) * FROM table ORDER BY id OFFSET 20 ROWS;', 90),
(3, 3, 'LIMIT', 'LIMIT [offset,] count', 'SELECT * FROM table LIMIT 20, 10;', 100);

-- =============================================================================
-- GRANTS AND PERMISSIONS (commented; replace role and uncomment as appropriate)
-- =============================================================================
-- GRANT USAGE ON SCHEMA dbrosetta TO dbrosetta_owner;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dbrosetta TO dbrosetta_owner;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dbrosetta TO dbrosetta_owner;

-- =============================================================================
-- NOTES
-- - This file purposefully omits interactive verification SELECTs to keep CI behavior predictable.
-- - updated_at is set by default on insert; update semantics should be handled by application code.
-- - If you need strict DB-level enforcement for metadata keys (prompt_version, model_settings), enforce in application or add CHECK constraints here.
-- - For idempotent re-runs, wrap INSERTs with UPSERT logic in application or transform these to INSERT ... ON CONFLICT DO NOTHING with explicit unique keys.
-- =============================================================================
