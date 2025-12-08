-- =============================================================================
-- Flyway Baseline Migration V1
-- =============================================================================
-- Description: Initial baseline schema for dbRosetta
-- Generated from: Azure PostgreSQL 18.0 using pg_dump 18.1
-- Date: December 3, 2025
-- 
-- This migration captures the complete dbRosetta schema including:
-- - Schema: dbrosetta
-- - Tables: dialects, terms, translations, artifacts
-- - Indexes: All GIN and B-tree indexes for performance
-- - Constraints: Primary keys, foreign keys, check constraints
-- - Comments: Table and column documentation
--
-- Prerequisites:
-- - Target database must exist
-- - Flyway user must have CREATE SCHEMA privileges
-- - This is a baseline migration - do not modify existing deployments
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dbrosetta; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA dbrosetta;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artifacts; Type: TABLE; Schema: dbrosetta; Owner: -
--

CREATE TABLE dbrosetta.artifacts (
    id bigint NOT NULL,
    name character varying(200) NOT NULL,
    artifact_type character varying(50) NOT NULL,
    source_dialect_id integer,
    target_dialect_id integer,
    original_sql text,
    translated_sql text,
    translation_summary text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE artifacts; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON TABLE dbrosetta.artifacts IS 'Generated SQL artifacts from translation processes';


--
-- Name: COLUMN artifacts.name; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.name IS 'User-friendly name for the artifact';


--
-- Name: COLUMN artifacts.artifact_type; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.artifact_type IS 'Type of artifact (e.g., script, procedure, schema)';


--
-- Name: COLUMN artifacts.original_sql; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.original_sql IS 'Source SQL before translation';


--
-- Name: COLUMN artifacts.translated_sql; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.translated_sql IS 'SQL after dialect translation';


--
-- Name: COLUMN artifacts.translation_summary; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.translation_summary IS 'Summary of changes made during translation';


--
-- Name: COLUMN artifacts.status; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.status IS 'Artifact status (draft, validated, deployed, etc.)';


--
-- Name: COLUMN artifacts.metadata; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.artifacts.metadata IS 'Additional artifact properties and processing metadata as JSON';


--
-- Name: artifacts_id_seq; Type: SEQUENCE; Schema: dbrosetta; Owner: -
--

ALTER TABLE dbrosetta.artifacts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dbrosetta.artifacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dialects; Type: TABLE; Schema: dbrosetta; Owner: -
--

CREATE TABLE dbrosetta.dialects (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    version character varying(20),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE dialects; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON TABLE dbrosetta.dialects IS 'SQL dialect definitions and metadata for translation system';


--
-- Name: COLUMN dialects.name; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.dialects.name IS 'Unique identifier for the dialect (lowercase, no spaces)';


--
-- Name: COLUMN dialects.display_name; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.dialects.display_name IS 'Human-readable name for the dialect';


--
-- Name: COLUMN dialects.version; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.dialects.version IS 'Version identifier for the dialect';


--
-- Name: COLUMN dialects.is_active; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.dialects.is_active IS 'Flag to enable/disable dialect for translations';


--
-- Name: COLUMN dialects.metadata; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.dialects.metadata IS 'Additional dialect configuration and features as JSON';


--
-- Name: dialects_id_seq; Type: SEQUENCE; Schema: dbrosetta; Owner: -
--

ALTER TABLE dbrosetta.dialects ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dbrosetta.dialects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: terms; Type: TABLE; Schema: dbrosetta; Owner: -
--

CREATE TABLE dbrosetta.terms (
    id integer NOT NULL,
    canonical_term character varying(200) NOT NULL,
    category character varying(50) NOT NULL,
    subcategory character varying(50),
    description text NOT NULL,
    usage_context text,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE terms; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON TABLE dbrosetta.terms IS 'Canonical SQL terms and definitions for cross-dialect translation';


--
-- Name: COLUMN terms.canonical_term; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.terms.canonical_term IS 'Standardized term identifier (case-insensitive uniqueness enforced via index)';


--
-- Name: COLUMN terms.category; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.terms.category IS 'Primary classification of the term (e.g., function, operator, keyword)';


--
-- Name: COLUMN terms.subcategory; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.terms.subcategory IS 'Secondary classification for more specific grouping';


--
-- Name: COLUMN terms.usage_context; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.terms.usage_context IS 'Additional context about when and how to use this term';


--
-- Name: COLUMN terms.metadata; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.terms.metadata IS 'Additional term properties and configuration as JSON';


--
-- Name: terms_id_seq; Type: SEQUENCE; Schema: dbrosetta; Owner: -
--

ALTER TABLE dbrosetta.terms ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dbrosetta.terms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: translations; Type: TABLE; Schema: dbrosetta; Owner: -
--

CREATE TABLE dbrosetta.translations (
    id bigint NOT NULL,
    term_id integer NOT NULL,
    dialect_id integer NOT NULL,
    translated_term text NOT NULL,
    syntax_pattern text,
    examples text,
    notes text,
    confidence_level integer DEFAULT 100,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT translations_confidence_level_check CHECK (((confidence_level >= 0) AND (confidence_level <= 100)))
);


--
-- Name: TABLE translations; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON TABLE dbrosetta.translations IS 'Dialect-specific translations for canonical terms with caching support';


--
-- Name: COLUMN translations.translated_term; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.translations.translated_term IS 'The dialect-specific equivalent of the canonical term';


--
-- Name: COLUMN translations.syntax_pattern; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.translations.syntax_pattern IS 'Template or pattern showing how to use the translated term';


--
-- Name: COLUMN translations.examples; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.translations.examples IS 'Example usage in the target dialect';


--
-- Name: COLUMN translations.confidence_level; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.translations.confidence_level IS 'Translation accuracy confidence (0-100)';


--
-- Name: COLUMN translations.metadata; Type: COMMENT; Schema: dbrosetta; Owner: -
--

COMMENT ON COLUMN dbrosetta.translations.metadata IS 'Additional translation properties and caching hints as JSON';


--
-- Name: translations_id_seq; Type: SEQUENCE; Schema: dbrosetta; Owner: -
--

ALTER TABLE dbrosetta.translations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dbrosetta.translations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: artifacts artifacts_pkey; Type: CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.artifacts
    ADD CONSTRAINT artifacts_pkey PRIMARY KEY (id);


--
-- Name: dialects dialects_name_key; Type: CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.dialects
    ADD CONSTRAINT dialects_name_key UNIQUE (name);


--
-- Name: dialects dialects_pkey; Type: CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.dialects
    ADD CONSTRAINT dialects_pkey PRIMARY KEY (id);


--
-- Name: terms terms_pkey; Type: CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);


--
-- Name: translations translations_pkey; Type: CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.translations
    ADD CONSTRAINT translations_pkey PRIMARY KEY (id);


--
-- Name: translations uq_translations_term_dialect; Type: CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.translations
    ADD CONSTRAINT uq_translations_term_dialect UNIQUE (term_id, dialect_id);


--
-- Name: idx_artifacts_created; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_created ON dbrosetta.artifacts USING btree (created_at);


--
-- Name: idx_artifacts_metadata; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_metadata ON dbrosetta.artifacts USING gin (metadata);


--
-- Name: idx_artifacts_name; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_name ON dbrosetta.artifacts USING btree (name);


--
-- Name: idx_artifacts_source_dialect; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_source_dialect ON dbrosetta.artifacts USING btree (source_dialect_id);


--
-- Name: idx_artifacts_status; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_status ON dbrosetta.artifacts USING btree (status);


--
-- Name: idx_artifacts_target_dialect; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_target_dialect ON dbrosetta.artifacts USING btree (target_dialect_id);


--
-- Name: idx_artifacts_type; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_artifacts_type ON dbrosetta.artifacts USING btree (artifact_type);


--
-- Name: idx_dialects_active; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_dialects_active ON dbrosetta.dialects USING btree (is_active);


--
-- Name: idx_dialects_metadata; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_dialects_metadata ON dbrosetta.dialects USING gin (metadata);


--
-- Name: idx_dialects_name; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_dialects_name ON dbrosetta.dialects USING btree (name);


--
-- Name: idx_terms_active; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_terms_active ON dbrosetta.terms USING btree (is_active);


--
-- Name: idx_terms_canonical; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_terms_canonical ON dbrosetta.terms USING btree (canonical_term);


--
-- Name: idx_terms_category; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_terms_category ON dbrosetta.terms USING btree (category);


--
-- Name: idx_terms_category_sub; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_terms_category_sub ON dbrosetta.terms USING btree (category, subcategory);


--
-- Name: idx_terms_metadata; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_terms_metadata ON dbrosetta.terms USING gin (metadata);


--
-- Name: idx_translations_active; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_translations_active ON dbrosetta.translations USING btree (is_active);


--
-- Name: idx_translations_confidence; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_translations_confidence ON dbrosetta.translations USING btree (confidence_level);


--
-- Name: idx_translations_dialect; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_translations_dialect ON dbrosetta.translations USING btree (dialect_id);


--
-- Name: idx_translations_metadata; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_translations_metadata ON dbrosetta.translations USING gin (metadata);


--
-- Name: idx_translations_term; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_translations_term ON dbrosetta.translations USING btree (term_id);


--
-- Name: idx_translations_term_dialect; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE INDEX idx_translations_term_dialect ON dbrosetta.translations USING btree (term_id, dialect_id);


--
-- Name: uq_terms_canonical_lower; Type: INDEX; Schema: dbrosetta; Owner: -
--

CREATE UNIQUE INDEX uq_terms_canonical_lower ON dbrosetta.terms USING btree (lower((canonical_term)::text));


--
-- Name: artifacts artifacts_source_dialect_id_fkey; Type: FK CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.artifacts
    ADD CONSTRAINT artifacts_source_dialect_id_fkey FOREIGN KEY (source_dialect_id) REFERENCES dbrosetta.dialects(id) ON DELETE SET NULL;


--
-- Name: artifacts artifacts_target_dialect_id_fkey; Type: FK CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.artifacts
    ADD CONSTRAINT artifacts_target_dialect_id_fkey FOREIGN KEY (target_dialect_id) REFERENCES dbrosetta.dialects(id) ON DELETE SET NULL;


--
-- Name: translations fk_translations_dialect; Type: FK CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.translations
    ADD CONSTRAINT fk_translations_dialect FOREIGN KEY (dialect_id) REFERENCES dbrosetta.dialects(id) ON DELETE CASCADE;


--
-- Name: translations fk_translations_term; Type: FK CONSTRAINT; Schema: dbrosetta; Owner: -
--

ALTER TABLE ONLY dbrosetta.translations
    ADD CONSTRAINT fk_translations_term FOREIGN KEY (term_id) REFERENCES dbrosetta.terms(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict TKSQTIfcjNPZfKWxHXhyhwmXArG1YtRsnYn3dW1zcCwckfIOMLQVqGaNPtDhh8s

