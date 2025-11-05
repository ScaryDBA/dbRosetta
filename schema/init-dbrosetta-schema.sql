-- =============================================================================
-- dbRosetta Schema Initialization
-- =============================================================================
-- ASSUMPTIONS:
-- - PostgreSQL version 11+ (Azure Database for PostgreSQL compatible)
-- - UTF-8 encoding
-- - Database owner/admin privileges required for schema creation
-- - Target database already exists
-- - Schema owner placeholder: replace 'dbrosetta_owner' with actual role
-- =============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS dbrosetta;

-- Set search path for this session
SET search_path TO dbrosetta, public;

-- =============================================================================
-- TABLE: dialects
-- Stores SQL dialect definitions and metadata
-- =============================================================================
CREATE TABLE dialects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    version VARCHAR(20),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for dialects table
CREATE INDEX idx_dialects_name ON dialects (name);
CREATE INDEX idx_dialects_active ON dialects (is_active);
CREATE INDEX idx_dialects_metadata ON dialects USING GIN (metadata);

-- Comments for dialects table
COMMENT ON TABLE dialects IS 'SQL dialect definitions and metadata for translation system';
COMMENT ON COLUMN dialects.name IS 'Unique identifier for the dialect (lowercase, no spaces)';
COMMENT ON COLUMN dialects.display_name IS 'Human-readable name for the dialect';
COMMENT ON COLUMN dialects.version IS 'Version identifier for the dialect';
COMMENT ON COLUMN dialects.is_active IS 'Flag to enable/disable dialect for translations';
COMMENT ON COLUMN dialects.metadata IS 'Additional dialect configuration and features as JSON';

-- =============================================================================
-- TABLE: terms
-- Stores canonical SQL terms and their definitions
-- =============================================================================
CREATE TABLE terms (
    id SERIAL PRIMARY KEY,
    canonical_term VARCHAR(200) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    usage_context TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for terms table
CREATE INDEX idx_terms_canonical ON terms (canonical_term);
CREATE INDEX idx_terms_category ON terms (category);
CREATE INDEX idx_terms_active ON terms (is_active);
CREATE INDEX idx_terms_category_sub ON terms (category, subcategory);
CREATE INDEX idx_terms_metadata ON terms USING GIN (metadata);

-- Comments for terms table
COMMENT ON TABLE terms IS 'Canonical SQL terms and definitions for cross-dialect translation';
COMMENT ON COLUMN terms.canonical_term IS 'Standardized term identifier (case-sensitive)';
COMMENT ON COLUMN terms.category IS 'Primary classification of the term (e.g., function, operator, keyword)';
COMMENT ON COLUMN terms.subcategory IS 'Secondary classification for more specific grouping';
COMMENT ON COLUMN terms.usage_context IS 'Additional context about when and how to use this term';
COMMENT ON COLUMN terms.metadata IS 'Additional term properties and configuration as JSON';

-- =============================================================================
-- TABLE: translations
-- Stores dialect-specific translations for canonical terms
-- =============================================================================
CREATE TABLE translations (
    id SERIAL PRIMARY KEY,
    term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    dialect_id INTEGER NOT NULL REFERENCES dialects(id) ON DELETE CASCADE,
    translated_term VARCHAR(500) NOT NULL,
    syntax_pattern TEXT,
    examples TEXT,
    notes TEXT,
    confidence_level INTEGER DEFAULT 100 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(term_id, dialect_id)
);

-- Indexes for translations table
CREATE INDEX idx_translations_term ON translations (term_id);
CREATE INDEX idx_translations_dialect ON translations (dialect_id);
CREATE INDEX idx_translations_active ON translations (is_active);
CREATE INDEX idx_translations_confidence ON translations (confidence_level);
CREATE INDEX idx_translations_term_dialect ON translations (term_id, dialect_id);
CREATE INDEX idx_translations_metadata ON translations USING GIN (metadata);

-- Comments for translations table
COMMENT ON TABLE translations IS 'Dialect-specific translations for canonical terms with caching support';
COMMENT ON COLUMN translations.translated_term IS 'The dialect-specific equivalent of the canonical term';
COMMENT ON COLUMN translations.syntax_pattern IS 'Template or pattern showing how to use the translated term';
COMMENT ON COLUMN translations.examples IS 'Example usage in the target dialect';
COMMENT ON COLUMN translations.confidence_level IS 'Translation accuracy confidence (0-100)';
COMMENT ON COLUMN translations.metadata IS 'Additional translation properties and caching hints as JSON';

-- =============================================================================
-- TABLE: artifacts
-- Stores generated SQL artifacts and their metadata
-- =============================================================================
CREATE TABLE artifacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    artifact_type VARCHAR(50) NOT NULL,
    source_dialect_id INTEGER REFERENCES dialects(id) ON DELETE SET NULL,
    target_dialect_id INTEGER REFERENCES dialects(id) ON DELETE SET NULL,
    original_sql TEXT,
    translated_sql TEXT,
    translation_summary TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for artifacts table
CREATE INDEX idx_artifacts_name ON artifacts (name);
CREATE INDEX idx_artifacts_type ON artifacts (artifact_type);
CREATE INDEX idx_artifacts_source_dialect ON artifacts (source_dialect_id);
CREATE INDEX idx_artifacts_target_dialect ON artifacts (target_dialect_id);
CREATE INDEX idx_artifacts_status ON artifacts (status);
CREATE INDEX idx_artifacts_created ON artifacts (created_at);
CREATE INDEX idx_artifacts_metadata ON artifacts USING GIN (metadata);

-- Comments for artifacts table
COMMENT ON TABLE artifacts IS 'Generated SQL artifacts from translation processes';
COMMENT ON COLUMN artifacts.name IS 'User-friendly name for the artifact';
COMMENT ON COLUMN artifacts.artifact_type IS 'Type of artifact (e.g., script, procedure, schema)';
COMMENT ON COLUMN artifacts.original_sql IS 'Source SQL before translation';
COMMENT ON COLUMN artifacts.translated_sql IS 'SQL after dialect translation';
COMMENT ON COLUMN artifacts.translation_summary IS 'Summary of changes made during translation';
COMMENT ON COLUMN artifacts.status IS 'Artifact status (draft, validated, deployed, etc.)';
COMMENT ON COLUMN artifacts.metadata IS 'Additional artifact properties and processing metadata as JSON';

-- =============================================================================
-- EXAMPLE DATA
-- Sample dialects and basic term translations
-- =============================================================================

-- Insert sample dialects
INSERT INTO dialects (name, display_name, version, description, metadata) VALUES
('postgresql', 'PostgreSQL', '13+', 'PostgreSQL database system', '{"features": ["arrays", "jsonb", "cte"], "url": "https://postgresql.org"}'),
('sqlserver', 'Microsoft SQL Server', '2019+', 'Microsoft SQL Server database system', '{"features": ["cte", "windowing", "xml"], "url": "https://microsoft.com/sql"}'),
('mysql', 'MySQL', '8.0+', 'MySQL database system', '{"features": ["json", "cte"], "url": "https://mysql.com"}');

-- Insert sample terms
INSERT INTO terms (canonical_term, category, subcategory, description, usage_context) VALUES
('CONCAT', 'function', 'string', 'Concatenates two or more strings together', 'String manipulation and formatting'),
('ISNULL', 'function', 'conditional', 'Tests if a value is NULL and returns alternative', 'NULL handling and conditional logic'),
('LIMIT', 'clause', 'query', 'Limits the number of rows returned by a query', 'Result set pagination and performance');

-- Insert sample translations
INSERT INTO translations (term_id, dialect_id, translated_term, syntax_pattern, examples, confidence_level) VALUES
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
-- GRANTS AND PERMISSIONS
-- =============================================================================
-- Grant schema usage (replace 'dbrosetta_owner' with actual role)
-- GRANT USAGE ON SCHEMA dbrosetta TO dbrosetta_owner;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dbrosetta TO dbrosetta_owner;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dbrosetta TO dbrosetta_owner;

-- =============================================================================
-- SCHEMA VALIDATION
-- =============================================================================
-- Verify schema creation
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'dbrosetta'
ORDER BY tablename;

-- Verify sample data
SELECT 
    d.name as dialect,
    t.canonical_term,
    tr.translated_term,
    tr.confidence_level
FROM dialects d
JOIN translations tr ON d.id = tr.dialect_id
JOIN terms t ON tr.term_id = t.id
ORDER BY t.canonical_term, d.name;