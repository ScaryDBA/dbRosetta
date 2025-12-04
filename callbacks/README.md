# Flyway Callbacks

This directory contains SQL callbacks that execute at specific points in the Flyway migration lifecycle.

## Callback Types

- `beforeMigrate.sql` - Runs before all migrations
- `afterMigrate.sql` - Runs after all migrations  
- `beforeEachMigrate.sql` - Runs before each migration
- `afterEachMigrate.sql` - Runs after each migration
- `beforeValidate.sql` - Runs before validation
- `afterValidate.sql` - Runs after validation

## Usage

Place callback SQL files in this directory following the naming convention above.
Callbacks are executed in the context of the configured schema.
