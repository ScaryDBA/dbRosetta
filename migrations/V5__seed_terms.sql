-- Adds the "WAL" term plus the 8 directional-lookup concept terms, and their
-- per-dialect equivalents. Ported from services/dbrosetta-api/prisma/seed.ts,
-- which is ORM-only and must not be the thing that writes schema/data to the
-- database -- Flyway is the single source of truth for that.
--
-- The 10 baseline terms (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE,
-- ALTER TABLE, DROP TABLE, JOIN, WHERE, GROUP BY) and their translations
-- already exist from an earlier load, so this migration only adds what's
-- missing. ON CONFLICT DO NOTHING makes it safe to re-run by hand if needed.

INSERT INTO dbrosetta.terms (canonical_term, category, subcategory, description, usage_context) VALUES
  ('WAL', 'System', 'Logging', 'Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database', 'Used for crash recovery, replication, and point-in-time recovery'),
  ('Buffer Pool / Buffer Cache', 'System', 'Memory', 'The in-memory cache of recently used data pages that reduces physical disk I/O.', NULL),
  ('Row Versioning / MVCC Mechanism', 'System', 'Concurrency', 'The mechanism that lets readers see a consistent snapshot of data without blocking writers, by keeping prior versions of changed rows.', NULL),
  ('Clustered Table Storage', 'System', 'Storage', 'Whether and how a table''s data rows are physically ordered on disk according to a key.', NULL),
  ('Identity / Auto-Increment Column', 'DDL', 'Schema', 'A column that automatically generates a unique, incrementing value for new rows.', NULL),
  ('Temporary Workspace for Sorts/Spills', 'System', 'Storage', 'The storage area the database engine uses for sort operations, hash joins, and other data that spills to disk.', NULL),
  ('Deadlock Diagnostic Artifact', 'System', 'Concurrency', 'The information the engine records when it detects and breaks a deadlock, used to diagnose the conflicting transactions.', NULL),
  ('Query Execution Plan', 'DQL', 'Query', 'The plan the optimizer chooses to physically execute a query, showing operators, order, and estimated/actual cost.', NULL),
  ('Optimizer Statistics', 'System', 'Query Optimization', 'The metadata about data distribution and cardinality that the query optimizer uses to choose a plan.', NULL)
ON CONFLICT ((lower(canonical_term))) DO NOTHING;

INSERT INTO dbrosetta.term_equivalents (term_id, dialect_id, platform, equivalent_term, notes)
SELECT t.id, d.id, v.platform, v.equivalent_term, v.notes
FROM (VALUES
  ('WAL', 'postgresql', 'PostgreSQL', 'WAL', 'Native implementation'),
  ('WAL', 'sqlserver', 'SQL Server', 'Transaction Log', 'Similar concept, different name'),
  ('WAL', 'oracle', 'Oracle', 'Redo Log', 'Equivalent mechanism'),
  ('WAL', 'mysql', 'MySQL', 'Binary Log', 'Used for replication and recovery'),
  ('WAL', NULL, 'SQLite', 'WAL', 'Same terminology'),

  ('Buffer Pool / Buffer Cache', 'sqlserver', 'SQL Server', 'Buffer Pool', 'Managed as part of sys.dm_os_buffer_descriptors; sized via ''max server memory''.'),
  ('Buffer Pool / Buffer Cache', 'postgresql', 'PostgreSQL', 'Shared Buffers', 'Configured via the shared_buffers setting; PostgreSQL also relies heavily on the OS page cache.'),
  ('Buffer Pool / Buffer Cache', 'oracle', 'Oracle', 'Database Buffer Cache', 'Part of the SGA; sized via DB_CACHE_SIZE or automatic memory management.'),
  ('Buffer Pool / Buffer Cache', 'mysql', 'MySQL', 'InnoDB Buffer Pool', 'Configured via innodb_buffer_pool_size; caches both data and indexes for InnoDB tables.'),

  ('Row Versioning / MVCC Mechanism', 'sqlserver', 'SQL Server', 'Version Store', 'Lives in tempdb; used by snapshot isolation and read-committed snapshot isolation (RCSI).'),
  ('Row Versioning / MVCC Mechanism', 'postgresql', 'PostgreSQL', 'MVCC', 'Multiversion Concurrency Control; old row versions are retained until vacuumed, and changes are protected by the WAL.'),
  ('Row Versioning / MVCC Mechanism', 'oracle', 'Oracle', 'Undo Segments', 'Undo tablespace stores before-images used for read consistency and rollback.'),
  ('Row Versioning / MVCC Mechanism', 'mysql', 'MySQL', 'InnoDB Undo Logs', 'InnoDB''s MVCC implementation; undo logs support both rollback and consistent non-locking reads.'),

  ('Clustered Table Storage', 'sqlserver', 'SQL Server', 'Clustered Index', 'A table has at most one; data rows are stored in key order in the index''s leaf level.'),
  ('Clustered Table Storage', 'postgresql', 'PostgreSQL', 'Heap Table (no persistent clustering)', 'Tables are unordered heaps by default; CLUSTER reorders rows once but does not maintain order on later writes.'),
  ('Clustered Table Storage', 'oracle', 'Oracle', 'Index-Organized Table (IOT)', 'An alternative to a normal heap table where the table itself is stored as a B-tree index on its primary key.'),
  ('Clustered Table Storage', 'mysql', 'MySQL', 'Clustered Index (InnoDB Primary Key)', 'InnoDB always clusters the table by its primary key; a table without an explicit primary key gets a hidden one.'),

  ('Identity / Auto-Increment Column', 'sqlserver', 'SQL Server', 'IDENTITY', 'IDENTITY(seed, increment) property on a column.'),
  ('Identity / Auto-Increment Column', 'postgresql', 'PostgreSQL', 'GENERATED ALWAYS AS IDENTITY / SERIAL', 'SQL-standard IDENTITY columns (preferred) or the legacy SERIAL pseudo-type backed by a sequence.'),
  ('Identity / Auto-Increment Column', 'oracle', 'Oracle', 'IDENTITY Column', 'Native IDENTITY columns since 12c; earlier versions combine a SEQUENCE with a trigger.'),
  ('Identity / Auto-Increment Column', 'mysql', 'MySQL', 'AUTO_INCREMENT', 'AUTO_INCREMENT column attribute; only one per table, and it must be indexed.'),

  ('Temporary Workspace for Sorts/Spills', 'sqlserver', 'SQL Server', 'tempdb', 'A shared system database used for temp tables, sort/hash spills, and the version store.'),
  ('Temporary Workspace for Sorts/Spills', 'postgresql', 'PostgreSQL', 'temp_tablespaces / Temporary Files', 'Configured via temp_tablespaces; spill files are written under the pgsql_tmp directory.'),
  ('Temporary Workspace for Sorts/Spills', 'oracle', 'Oracle', 'TEMP Tablespace', 'A dedicated temporary tablespace used for sorts, hash joins, and global temporary tables.'),
  ('Temporary Workspace for Sorts/Spills', 'mysql', 'MySQL', 'tmpdir / Internal Temporary Tables', 'Controlled by the tmpdir setting; internal temp tables may be in-memory or on-disk depending on size and engine.'),

  ('Deadlock Diagnostic Artifact', 'sqlserver', 'SQL Server', 'Deadlock Graph', 'An XML deadlock graph captured via Extended Events (or the older trace flag 1222).'),
  ('Deadlock Diagnostic Artifact', 'postgresql', 'PostgreSQL', 'Deadlock Detected Log Entry', 'Logged to the server log when log_lock_waits/deadlock_timeout trigger detection; no XML graph, just structured log text.'),
  ('Deadlock Diagnostic Artifact', 'oracle', 'Oracle', 'ORA-00060 Deadlock Trace File', 'Oracle raises ORA-00060 and writes a trace file to the diagnostic destination describing the waiters.'),
  ('Deadlock Diagnostic Artifact', 'mysql', 'MySQL', 'LATEST DETECTED DEADLOCK', 'Found in the output of SHOW ENGINE INNODB STATUS, describing the transactions and locks involved.'),

  ('Query Execution Plan', 'sqlserver', 'SQL Server', 'Execution Plan', 'Viewable as estimated or actual plans, graphically or as XML, via SSMS or SET SHOWPLAN options.'),
  ('Query Execution Plan', 'postgresql', 'PostgreSQL', 'Query Plan (EXPLAIN)', 'Produced by EXPLAIN [ANALYZE]; text-based tree of plan nodes with costs and, with ANALYZE, actual timings.'),
  ('Query Execution Plan', 'oracle', 'Oracle', 'Explain Plan', 'Produced by EXPLAIN PLAN FOR or the SQL*Plus AUTOTRACE/DBMS_XPLAN utilities.'),
  ('Query Execution Plan', 'mysql', 'MySQL', 'EXPLAIN Output', 'Produced by EXPLAIN [ANALYZE] or the optimizer trace; tabular by default, tree-style with EXPLAIN FORMAT=TREE.'),

  ('Optimizer Statistics', 'sqlserver', 'SQL Server', 'Statistics', 'Objects visible in sys.stats; maintained automatically via AUTO_CREATE_STATISTICS/AUTO_UPDATE_STATISTICS.'),
  ('Optimizer Statistics', 'postgresql', 'PostgreSQL', 'Planner Statistics', 'Collected by ANALYZE (often via autovacuum) and stored in pg_statistic; consumed by the planner via pg_stats.'),
  ('Optimizer Statistics', 'oracle', 'Oracle', 'Optimizer Statistics', 'Gathered and managed via the DBMS_STATS package, typically on an automated maintenance job.'),
  ('Optimizer Statistics', 'mysql', 'MySQL', 'Index/Table Statistics', 'InnoDB persistent optimizer statistics (innodb_stats_persistent) refreshed by ANALYZE TABLE or background sampling.')
) AS v(canonical_term, dialect_name, platform, equivalent_term, notes)
JOIN dbrosetta.terms t ON t.canonical_term = v.canonical_term
LEFT JOIN dbrosetta.dialects d ON d.name = v.dialect_name
ON CONFLICT ON CONSTRAINT uq_term_equivalents_term_platform DO NOTHING;
