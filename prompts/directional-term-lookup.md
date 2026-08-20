Title: "Directional Term Lookup: Source Platform to Target Platform(s)"
Version: "1.0.0"
Author: "@ScaryDBA"
Date: "2026-08-20"
ModelSettings: { temperature: 0.0, max_tokens: 4096, top_p: 1.0, seed: null }

## Intent
Replace dbRosetta's generic keyword search with a directional lookup: the user names a term as they know it on one source database platform, chooses one or more target platforms (or "all"), and the app returns the equivalent term(s) on those target platforms.

## Context
dbRosetta is a WordPress plugin (`wordpress-plugin/dbrosetta/`) calling a Fastify + Prisma + PostgreSQL API (`services/dbrosetta-api/`), with schema changes tracked in Flyway migrations (`migrations/V{n}__*.sql`) and mirrored by hand in `services/dbrosetta-api/prisma/schema.prisma`. A prior pass (`prompts/iterate-the-design-first-pass.md`) added a `term_equivalents` table (migration `V3__add_term_equivalents.sql`) keyed by a free-text `platform` VARCHAR, and seeded one example: WAL (PostgreSQL) / Transaction Log (SQL Server) / Redo Log (Oracle) / Binary Log (MySQL) / WAL (SQLite). The `dialects` table already holds the four platforms this app manages: `postgresql`, `mysql`, `sqlserver`, `oracle` (see `prisma/seed.ts`). SQLite exists only as a legacy free-text `platform` value on the WAL rows; it is not a row in `dialects` and is out of scope for this change — leave its existing `term_equivalents` rows alone, but do not surface SQLite as a selectable platform anywhere in the UI or new API.

Today's search form (`templates/search-form.php`) takes a free-text term plus one optional "Filter by Database" dropdown, and posts to `class-dbrosetta-client.php::search_terms()`, which does a `canonicalTerm` contains-match with no real use of the platform filter. Results (`templates/search-results.php`) show the matched term(s), a full equivalents table (all platforms, unfiltered), and a separate SQL-syntax translations grid (from the unrelated `translations`/`Translation` table, used for keyword syntax like `SELECT`/`JOIN`). This change fully replaces that search form and results flow with the new directional lookup. The SQL-syntax translations feature (the `translations` table and its rendering) is untouched structurally, but is no longer shown on this page — that's an accepted, intentional scope cut, not a bug.

Confirmed product decisions for this change (do not re-litigate these):
1. The directional lookup **replaces** the old generic search entirely — one form, one flow.
2. When the user selects "All platforms" as the target, the results **exclude** the source platform (they already told us the term for it).

## Input Contract

- name: `term`; type: string; required: true; description: the term text as the user knows it on the source platform (e.g. "transaction log"). Matching must be case-insensitive and whitespace-trimmed.
- name: `sourceDialect`; type: string; required: true; description: the `dialects.name` slug the user knows the term in (`postgresql`, `mysql`, `sqlserver`, `oracle`). Must be validated against active dialects.
- name: `targetDialects`; type: array<string>; required: false; description: zero or more `dialects.name` slugs to translate into. Empty array or omitted means "all platforms except `sourceDialect`" per decision #2 above. Each value must be validated against active dialects.

## Output Contract

- name: `POST /api/v1/terms/lookup` response (200); type: json; format: `{ term: { id, canonicalTerm, category, subcategory, description }, sourceDialect: { id, name, displayName }, matchedEquivalent: { dialect: { id, name, displayName }, equivalentTerm, notes }, results: [ { dialect: { id, name, displayName }, equivalentTerm, notes } ] }`; validation: `results` sorted by `dialect.displayName` ascending; `results` never includes `sourceDialect` when the request's `targetDialects` was empty/omitted (the "all" case); when `targetDialects` was explicitly provided, `results` contains exactly those dialects (in the order requested is not required, but all must be present or the request is a 400).
- name: `POST /api/v1/terms/lookup` response (400); type: json; format: `{ error: "invalid_dialect", message: string, invalidValues: string[] }`; validation: returned when `sourceDialect` or any `targetDialects` entry is not an active dialect name.
- name: `POST /api/v1/terms/lookup` response (404); type: json; format: `{ error: "not_found", message: string }`; validation: returned when no term/equivalent matches `term` for the given `sourceDialect` (see matching rule in Guardrails).
- name: WordPress form output; type: html fragment; format: rendered by `templates/search-form.php` + `templates/search-results.php`; validation: form has exactly one term text input, one required single-select "source platform" dropdown, and one target-platform control that supports selecting one, several, or all of the four dialects (checkboxes + an "All platforms" checkbox, or equivalent — no native `<select multiple>` without labels/checkbox affordance). Options for both platform controls are sourced from `DBRosetta_Client::get_dialects()`, never hardcoded in the template.

## Acceptance Criteria

1. Submitting term="transaction log", source=SQL Server, target=PostgreSQL returns exactly one result row: PostgreSQL → "WAL".
2. Submitting term="TRANSACTION LOG" (any case/whitespace) with no target selection (or "All platforms" checked) returns 3 results — PostgreSQL, Oracle, MySQL — and does **not** include SQL Server.
3. Submitting a term with a source dialect for which no equivalent row exists, but which matches `terms.canonicalTerm` case-insensitively, still resolves successfully via the canonical-term fallback (see Guardrails).
4. Submitting an unknown term returns HTTP 404 with `error: "not_found"`, and the WordPress UI renders the existing "no results" style block with a message naming the term and source platform.
5. Submitting an invalid `sourceDialect` or `targetDialects` value returns HTTP 400 with `error: "invalid_dialect"`, and the API never 500s on bad platform input.
6. The `V4` Flyway migration is additive only (no dropped columns, no data loss) and existing `term_equivalents` rows (including the SQLite ones) still exist and pass their unique constraints after migration.
7. All 8 new seeded concept terms (below) are retrievable through the new endpoint for every one of the 4 dialects as both source and target.
8. Existing admin CRUD endpoints under `/terms/:termId/equivalents` (`term-equivalents.ts`) and `GET /terms/:id` continue to work unmodified.

## Guardrails

- Do not fabricate technical facts for the 8 new seed terms — use exactly the terms, platform names, and notes specified in this document's "Seed Data" section below, verbatim.
- Matching rule, in order, stop at first hit: (1) case-insensitive, trimmed match of `term` against `term_equivalents.equivalent_term` where `dialect_id` = the resolved `sourceDialect`; (2) if no row exists for that specific dialect, case-insensitive match of `term` against `terms.canonical_term` (ignoring dialect), then use that term's id going forward. If neither matches, return 404 — do not guess or fuzzy-match.
- Never drop or rename the existing `term_equivalents.platform` VARCHAR column; add `dialect_id` alongside it, additive only, so any external consumer relying on `platform` keeps working.
- `sourceDialect` and every entry in `targetDialects` must be validated against `dialects` where `is_active = true` before querying `term_equivalents`; invalid input is a 400, never a silent empty result or a 500.
- The "all platforms" case (empty/omitted `targetDialects`) must exclude the source dialect from `results` — this was a deliberate product decision, not an oversight to "fix" later.
- Keep the admin-only `POST/PUT/DELETE /terms/:termId/equivalents` routes and their auth requirements exactly as they are; this change only adds a new public read endpoint and changes the public-facing search UI.
- The WordPress form must degrade sanely with no JavaScript: server-side handling of submitted checkboxes must not assume any client-side script ran. Any JS added (e.g., to visually disable individual checkboxes when "All platforms" is checked) is a progressive enhancement only.
- Return only the Output Contract shapes above from the new endpoint; no extra top-level fields, no debug data, no stack traces in responses.

## Template Prompt (literal to send to Claude Code)

SYSTEM: You are a senior full-stack engineer working in the existing dbRosetta repository (Fastify + Prisma + PostgreSQL API, Flyway migrations, and a WordPress plugin front end). Make minimal, additive, well-tested changes that match the existing code style in each file you touch. Do not invent database facts; use only the seed data given to you verbatim.

USER: Implement a directional term-lookup feature that replaces dbRosetta's current keyword search. The user provides a `term` and the `sourceDialect` platform they already know it in (`postgresql`, `mysql`, `sqlserver`, or `oracle`), then chooses `targetDialects` — one, several, or all of the remaining platforms — and gets back the equivalent term(s) on those platforms.

1. **Migration** — Add `migrations/V4__add_term_equivalents_dialect_fk.sql`:
   - Add nullable `dialect_id INTEGER` to `dbrosetta.term_equivalents`, with `FOREIGN KEY (dialect_id) REFERENCES dbrosetta.dialects(id)`.
   - Backfill `dialect_id` by matching existing `platform` values to `dialects.name` or `dialects.display_name` case-insensitively (e.g. `'SQL Server'` → the `sqlserver` dialect). Rows with no match (the SQLite rows) keep `dialect_id` NULL.
   - Add index `idx_term_equivalents_dialect` on `dialect_id`.
   - Add a partial unique constraint on `(term_id, dialect_id)` where `dialect_id IS NOT NULL`.
   - Do not drop the `platform` column or the existing `uq_term_equivalents_term_platform` constraint.

2. **Prisma schema** (`services/dbrosetta-api/prisma/schema.prisma`) — mirror the migration exactly: add optional `dialectId Int?` and a `dialect Dialect?` relation on `TermEquivalent`, add the reverse relation on `Dialect`, add the index. Regenerate the client as part of your work.

3. **New API route** — Add `POST /api/v1/terms/lookup` (new file `services/dbrosetta-api/src/routes/v1/term-lookup.ts`, registered in `routes/v1/index.ts`). Validate `sourceDialect`/`targetDialects` with zod against active dialects (400 with `error: "invalid_dialect"` on failure). Implement the two-step matching rule from the Guardrails section, and shape the response exactly per the Output Contract. Return 404 with `error: "not_found"` when nothing matches. Add unit tests in `src/__tests__` covering: successful single-target lookup, successful "all platforms" lookup (source excluded), the canonical-term fallback path, invalid dialect (400), and unknown term (404).

4. **Seed data** — Update `services/dbrosetta-api/prisma/seed.ts` to add the 8 new terms and their per-platform equivalents listed in "Seed Data" below, using the same `upsert`/`createMany` pattern already used for the WAL term. Keep it idempotent (safe to re-run).

5. **WordPress plugin**:
   - `includes/class-dbrosetta-client.php`: add `lookup_term_equivalents(string $term, string $sourceDialect, array $targetDialects = [])` that POSTs `{ term, sourceDialect, targetDialects }` to `/terms/lookup` and returns the decoded response or a `WP_Error`. Keep the existing `get_dialects()` method — use it to drive both dropdowns/checkboxes instead of any hardcoded option list.
   - `templates/search-form.php`: replace the current form with: a term text input (required); a required single-select "I know this term in" dropdown built from `get_dialects()`; a "Translate to" control offering an "All platforms" checkbox plus one checkbox per dialect (also built from `get_dialects()`), letting the user pick one, several, or all.
   - `dbrosetta.php`: update the shortcode handler to read `term`, `source_dialect`, and `target_dialects[]` from `$_POST`, sanitize each, require `term` and `source_dialect`, and call the new client method instead of `search_terms()`.
   - `templates/search-results.php`: replace the current results block with rendering for the new response shape — the term's description, the confirmed source-platform equivalent, and a Platform | Equivalent Term | Notes table for the returned `results`. Reuse the existing `.dbrosetta-equivalents` / `.dbrosetta-table` CSS classes where they fit; add only the minimal new CSS needed for the "All platforms" + checkbox control in `assets/dbrosetta.css`. On 404, reuse the existing "no results" block style with a message naming the term and source platform.

## Seed Data (use verbatim — do not alter or invent facts)

For each concept below, create one `Term` (canonicalTerm/category/subcategory/description as given) and one `TermEquivalent` row per platform (platform string + notes as given; `dialectId` resolved from the matching dialect).

1. **Buffer Pool / Buffer Cache** — category `System`, subcategory `Memory` — description: "The in-memory cache of recently used data pages that reduces physical disk I/O."
   - SQL Server: `Buffer Pool` — "Managed as part of sys.dm_os_buffer_descriptors; sized via 'max server memory'."
   - PostgreSQL: `Shared Buffers` — "Configured via the shared_buffers setting; PostgreSQL also relies heavily on the OS page cache."
   - Oracle: `Database Buffer Cache` — "Part of the SGA; sized via DB_CACHE_SIZE or automatic memory management."
   - MySQL: `InnoDB Buffer Pool` — "Configured via innodb_buffer_pool_size; caches both data and indexes for InnoDB tables."

2. **Row Versioning / MVCC Mechanism** — category `System`, subcategory `Concurrency` — description: "The mechanism that lets readers see a consistent snapshot of data without blocking writers, by keeping prior versions of changed rows."
   - SQL Server: `Version Store` — "Lives in tempdb; used by snapshot isolation and read-committed snapshot isolation (RCSI)."
   - PostgreSQL: `MVCC` — "Multiversion Concurrency Control; old row versions are retained until vacuumed, and changes are protected by the WAL."
   - Oracle: `Undo Segments` — "Undo tablespace stores before-images used for read consistency and rollback."
   - MySQL: `InnoDB Undo Logs` — "InnoDB's MVCC implementation; undo logs support both rollback and consistent non-locking reads."

3. **Clustered Table Storage** — category `System`, subcategory `Storage` — description: "Whether and how a table's data rows are physically ordered on disk according to a key."
   - SQL Server: `Clustered Index` — "A table has at most one; data rows are stored in key order in the index's leaf level."
   - PostgreSQL: `Heap Table (no persistent clustering)` — "Tables are unordered heaps by default; CLUSTER reorders rows once but does not maintain order on later writes."
   - Oracle: `Index-Organized Table (IOT)` — "An alternative to a normal heap table where the table itself is stored as a B-tree index on its primary key."
   - MySQL: `Clustered Index (InnoDB Primary Key)` — "InnoDB always clusters the table by its primary key; a table without an explicit primary key gets a hidden one."

4. **Identity / Auto-Increment Column** — category `DDL`, subcategory `Schema` — description: "A column that automatically generates a unique, incrementing value for new rows."
   - SQL Server: `IDENTITY` — "IDENTITY(seed, increment) property on a column."
   - PostgreSQL: `GENERATED ALWAYS AS IDENTITY / SERIAL` — "SQL-standard IDENTITY columns (preferred) or the legacy SERIAL pseudo-type backed by a sequence."
   - Oracle: `IDENTITY Column` — "Native IDENTITY columns since 12c; earlier versions combine a SEQUENCE with a trigger."
   - MySQL: `AUTO_INCREMENT` — "AUTO_INCREMENT column attribute; only one per table, and it must be indexed."

5. **Temporary Workspace for Sorts/Spills** — category `System`, subcategory `Storage` — description: "The storage area the database engine uses for sort operations, hash joins, and other data that spills to disk."
   - SQL Server: `tempdb` — "A shared system database used for temp tables, sort/hash spills, and the version store."
   - PostgreSQL: `temp_tablespaces / Temporary Files` — "Configured via temp_tablespaces; spill files are written under the pgsql_tmp directory."
   - Oracle: `TEMP Tablespace` — "A dedicated temporary tablespace used for sorts, hash joins, and global temporary tables."
   - MySQL: `tmpdir / Internal Temporary Tables` — "Controlled by the tmpdir setting; internal temp tables may be in-memory or on-disk depending on size and engine."

6. **Deadlock Diagnostic Artifact** — category `System`, subcategory `Concurrency` — description: "The information the engine records when it detects and breaks a deadlock, used to diagnose the conflicting transactions."
   - SQL Server: `Deadlock Graph` — "An XML deadlock graph captured via Extended Events (or the older trace flag 1222)."
   - PostgreSQL: `Deadlock Detected Log Entry` — "Logged to the server log when log_lock_waits/deadlock_timeout trigger detection; no XML graph, just structured log text."
   - Oracle: `ORA-00060 Deadlock Trace File` — "Oracle raises ORA-00060 and writes a trace file to the diagnostic destination describing the waiters."
   - MySQL: `LATEST DETECTED DEADLOCK` — "Found in the output of SHOW ENGINE INNODB STATUS, describing the transactions and locks involved."

7. **Query Execution Plan** — category `DQL`, subcategory `Query` — description: "The plan the optimizer chooses to physically execute a query, showing operators, order, and estimated/actual cost."
   - SQL Server: `Execution Plan` — "Viewable as estimated or actual plans, graphically or as XML, via SSMS or SET SHOWPLAN options."
   - PostgreSQL: `Query Plan (EXPLAIN)` — "Produced by EXPLAIN [ANALYZE]; text-based tree of plan nodes with costs and, with ANALYZE, actual timings."
   - Oracle: `Explain Plan` — "Produced by EXPLAIN PLAN FOR or the SQL*Plus AUTOTRACE/DBMS_XPLAN utilities."
   - MySQL: `EXPLAIN Output` — "Produced by EXPLAIN [ANALYZE] or the optimizer trace; tabular by default, tree-style with EXPLAIN FORMAT=TREE."

8. **Optimizer Statistics** — category `System`, subcategory `Query Optimization` — description: "The metadata about data distribution and cardinality that the query optimizer uses to choose a plan."
   - SQL Server: `Statistics` — "Objects visible in sys.stats; maintained automatically via AUTO_CREATE_STATISTICS/AUTO_UPDATE_STATISTICS."
   - PostgreSQL: `Planner Statistics` — "Collected by ANALYZE (often via autovacuum) and stored in pg_statistic; consumed by the planner via pg_stats."
   - Oracle: `Optimizer Statistics` — "Gathered and managed via the DBMS_STATS package, typically on an automated maintenance job."
   - MySQL: `Index/Table Statistics` — "InnoDB persistent optimizer statistics (innodb_stats_persistent) refreshed by ANALYZE TABLE or background sampling."

## Examples (minimum required)

- `prompts/examples/directional-term-lookup/fixtures/minimal/input.json` -> `prompts/examples/directional-term-lookup/expected/minimal/output.json` (happy path: single target platform)
- `prompts/examples/directional-term-lookup/fixtures/edge/input.json` -> `prompts/examples/directional-term-lookup/expected/edge/output.json` (all-platforms, source excluded, case-insensitive input)
- `prompts/examples/directional-term-lookup/fixtures/no-match/input.json` -> `prompts/examples/directional-term-lookup/expected/no-match/output.json` (unknown term, 404)

## Post Processing

- Run `npx prisma generate` and `npx prisma migrate diff` (or equivalent) to confirm the Prisma schema matches migration `V4` before committing.
- Run `flyway validate` and `flyway migrate` against a local/dev database to confirm `V4` applies cleanly on top of `V1`–`V3`.
- Run `npm test` in `services/dbrosetta-api` (unit tests, including the new `term-lookup` tests) and `npm run seed` to confirm the seed script is idempotent (run it twice, diff row counts).
- Manually smoke-test the three fixtures below against the running API with `curl`/Postman and diff the response against the expected output (ignoring timestamps/ids).
- Load the WordPress shortcode locally (or in a staging environment) and visually confirm: the source dropdown and target checkboxes are populated from `/dialects`, "All platforms" excludes the source platform from results, and the 404 case renders the existing no-results styling.
- Artifact persistence: write run artifacts (test output, migration output, screenshots if applicable) to `artifacts/<run_id>/`.

## Telemetry keys to record

prompt_version, model_settings, fixtures_hash, run_id, timestamp

## Notes

This supersedes the search behavior originally specified in `prompts/iterate-the-design-first-pass.md`. The SQL-syntax translation feature (the `translations` table, `Translation` Prisma model, and its grid in the old `search-results.php`) is intentionally left in place structurally but removed from this page's UI — it may get its own shortcode/page in a future pass, but that is out of scope here. SQLite remains only as legacy free-text data in `term_equivalents` and should not be added to `dialects` or exposed in the UI as part of this change.

Location for fixtures: `prompts/examples/directional-term-lookup/`
