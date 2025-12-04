# Goal
Create a Flyway Enterprise baseline and initial set of migrations by reverse engineering the existing database (previously created via Flyway CLI), using Flyway Compare technology. The output should capture the current schema state as a reproducible baseline plus forward-compatible migration scripts.

# Context
- Database: PostgreSQL (existing instance created earlier with dialects, terms, translations seeded).
- Tooling: Flyway Enterprise with Flyway Compare enabled.
- Environment: CI/CD pipeline target, baseline must be versioned and reusable.
- Workflow: Reverse engineer schema → baseline → generate initial migrations → validate.

# Constraints
- Baseline must be non-destructive and idempotent.
- Migration scripts should follow Flyway’s versioned naming convention (e.g., `V1__baseline.sql`, `V2__init_migrations.sql`).
- Ensure compatibility with CI/CD automation (no environment-specific hardcoding).
- Scripts must be checked into Git for reproducibility.

# Deliverable
- A Flyway Enterprise baseline script capturing the current schema.
- An initial set of migration scripts generated via Flyway Compare.
- Output should be ready for inclusion in the dbRosetta repo as reference artifacts.

# Steps
1. Connect Flyway Enterprise to the target PostgreSQL database.
2. Run `flyway compare` against an empty reference schema to detect differences.
3. Generate baseline script (`V1__baseline.sql`) from the existing schema.
4. Generate initial migration scripts (`V2__init_migrations.sql`) for any detected changes.
5. Validate scripts by running `flyway info` and `flyway validate`.
6. Commit artifacts to Git under `/migrations` with clear version tags.

# Output Format
- SQL migration files with Flyway naming convention.
- Console log of Flyway Compare results (for validation).
- Documentation snippet summarizing baseline + migrations for contributor onboarding.
