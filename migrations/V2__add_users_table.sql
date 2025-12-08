-- =============================================================================
-- Flyway Migration V2: Add Users Table
-- =============================================================================
-- Description: Create users table for authentication
-- Author: dbRosetta API
-- Date: December 8, 2025
-- 
-- This migration adds:
-- - users table with authentication fields
-- - Indexes for email, role, and active status lookups
-- - Check constraint for valid roles
-- =============================================================================

-- Create users table
CREATE TABLE dbrosetta.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_users_role CHECK (role IN ('user', 'admin'))
);

-- Create indexes
CREATE INDEX idx_users_email ON dbrosetta.users(email);
CREATE INDEX idx_users_role ON dbrosetta.users(role);
CREATE INDEX idx_users_active ON dbrosetta.users(is_active);

-- Add comments
COMMENT ON TABLE dbrosetta.users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN dbrosetta.users.id IS 'Primary key';
COMMENT ON COLUMN dbrosetta.users.email IS 'User email address (unique, used for login)';
COMMENT ON COLUMN dbrosetta.users.password IS 'Bcrypt hashed password';
COMMENT ON COLUMN dbrosetta.users.name IS 'Optional display name';
COMMENT ON COLUMN dbrosetta.users.role IS 'User role: user or admin';
COMMENT ON COLUMN dbrosetta.users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN dbrosetta.users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN dbrosetta.users.updated_at IS 'Last update timestamp';
