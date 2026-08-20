import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Dialects
  console.log('Creating dialects...');
  const dialects = await Promise.all([
    prisma.dialect.upsert({
      where: { name: 'postgresql' },
      update: {},
      create: {
        name: 'postgresql',
        displayName: 'PostgreSQL',
        version: '16',
        description: 'PostgreSQL is a powerful, open source object-relational database system',
        isActive: true,
      },
    }),
    prisma.dialect.upsert({
      where: { name: 'mysql' },
      update: {},
      create: {
        name: 'mysql',
        displayName: 'MySQL',
        version: '8.0',
        description: 'MySQL is an open-source relational database management system',
        isActive: true,
      },
    }),
    prisma.dialect.upsert({
      where: { name: 'sqlserver' },
      update: {},
      create: {
        name: 'sqlserver',
        displayName: 'SQL Server',
        version: '2022',
        description: 'Microsoft SQL Server is a relational database management system',
        isActive: true,
      },
    }),
    prisma.dialect.upsert({
      where: { name: 'oracle' },
      update: {},
      create: {
        name: 'oracle',
        displayName: 'Oracle Database',
        version: '21c',
        description: 'Oracle Database is a multi-model database management system',
        isActive: true,
      },
    }),
  ]);

  const [postgresql, mysql, sqlserver, oracle] = dialects;
  console.log(`✅ Created ${dialects.length} dialects`);

  // 2. Create Terms
  console.log('Creating terms...');
  
  const selectTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'SELECT',
      category: 'DQL',
      subcategory: 'Query',
      description: 'Retrieves rows from a database table',
      usageContext: 'Used to query and retrieve data from one or more tables',
      isActive: true,
    },
  });

  const insertTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'INSERT',
      category: 'DML',
      subcategory: 'Modification',
      description: 'Inserts new rows into a table',
      usageContext: 'Used to add new records to a table',
      isActive: true,
    },
  });

  const updateTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'UPDATE',
      category: 'DML',
      subcategory: 'Modification',
      description: 'Modifies existing rows in a table',
      usageContext: 'Used to change existing data in a table',
      isActive: true,
    },
  });

  const deleteTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'DELETE',
      category: 'DML',
      subcategory: 'Modification',
      description: 'Removes rows from a table',
      usageContext: 'Used to remove existing records from a table',
      isActive: true,
    },
  });

  const createTableTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'CREATE TABLE',
      category: 'DDL',
      subcategory: 'Schema',
      description: 'Creates a new table in the database',
      usageContext: 'Used to define the structure of a new table',
      isActive: true,
    },
  });

  const alterTableTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'ALTER TABLE',
      category: 'DDL',
      subcategory: 'Schema',
      description: 'Modifies an existing table structure',
      usageContext: 'Used to add, modify, or drop columns and constraints',
      isActive: true,
    },
  });

  const dropTableTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'DROP TABLE',
      category: 'DDL',
      subcategory: 'Schema',
      description: 'Removes a table from the database',
      usageContext: 'Used to permanently delete a table and its data',
      isActive: true,
    },
  });

  const joinTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'JOIN',
      category: 'DQL',
      subcategory: 'Query',
      description: 'Combines rows from two or more tables',
      usageContext: 'Used to retrieve related data from multiple tables',
      isActive: true,
    },
  });

  const whereTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'WHERE',
      category: 'DQL',
      subcategory: 'Filter',
      description: 'Filters rows based on a condition',
      usageContext: 'Used to specify conditions for selecting or modifying data',
      isActive: true,
    },
  });

  const groupByTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'GROUP BY',
      category: 'DQL',
      subcategory: 'Aggregation',
      description: 'Groups rows that have the same values',
      usageContext: 'Used with aggregate functions to group result sets',
      isActive: true,
    },
  });

  const walTerm = await prisma.term.create({
    data: {
      canonicalTerm: 'WAL',
      category: 'System',
      subcategory: 'Logging',
      description: 'Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database',
      usageContext: 'Used for crash recovery, replication, and point-in-time recovery',
      isActive: true,
    },
  });

  async function upsertTermByCanonicalName(termData: {
    canonicalTerm: string;
    category: string;
    subcategory: string;
    description: string;
  }) {
    const existing = await prisma.term.findFirst({
      where: { canonicalTerm: termData.canonicalTerm },
    });
    if (existing) {
      return existing;
    }
    return prisma.term.create({ data: { ...termData, isActive: true } });
  }

  const bufferPoolTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Buffer Pool / Buffer Cache',
    category: 'System',
    subcategory: 'Memory',
    description: 'The in-memory cache of recently used data pages that reduces physical disk I/O.',
  });

  const mvccTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Row Versioning / MVCC Mechanism',
    category: 'System',
    subcategory: 'Concurrency',
    description: 'The mechanism that lets readers see a consistent snapshot of data without blocking writers, by keeping prior versions of changed rows.',
  });

  const clusteredStorageTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Clustered Table Storage',
    category: 'System',
    subcategory: 'Storage',
    description: "Whether and how a table's data rows are physically ordered on disk according to a key.",
  });

  const identityTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Identity / Auto-Increment Column',
    category: 'DDL',
    subcategory: 'Schema',
    description: 'A column that automatically generates a unique, incrementing value for new rows.',
  });

  const tempWorkspaceTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Temporary Workspace for Sorts/Spills',
    category: 'System',
    subcategory: 'Storage',
    description: 'The storage area the database engine uses for sort operations, hash joins, and other data that spills to disk.',
  });

  const deadlockArtifactTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Deadlock Diagnostic Artifact',
    category: 'System',
    subcategory: 'Concurrency',
    description: 'The information the engine records when it detects and breaks a deadlock, used to diagnose the conflicting transactions.',
  });

  const executionPlanTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Query Execution Plan',
    category: 'DQL',
    subcategory: 'Query',
    description: 'The plan the optimizer chooses to physically execute a query, showing operators, order, and estimated/actual cost.',
  });

  const optimizerStatsTerm = await upsertTermByCanonicalName({
    canonicalTerm: 'Optimizer Statistics',
    category: 'System',
    subcategory: 'Query Optimization',
    description: 'The metadata about data distribution and cardinality that the query optimizer uses to choose a plan.',
  });

  console.log('✅ Created 11 terms + 8 directional-lookup terms');

  // 3. Create Translations
  console.log('Creating translations...');
  
  // SELECT translations
  await prisma.translation.createMany({
    data: [
      {
        termId: selectTerm.id,
        dialectId: postgresql.id,
        translatedTerm: 'SELECT',
        syntaxPattern: 'SELECT column1, column2 FROM table_name WHERE condition',
        examples: 'SELECT id, name FROM users WHERE age > 18;',
        notes: 'PostgreSQL supports advanced features like DISTINCT ON, LATERAL joins',
        confidenceLevel: 100,
      },
      {
        termId: selectTerm.id,
        dialectId: mysql.id,
        translatedTerm: 'SELECT',
        syntaxPattern: 'SELECT column1, column2 FROM table_name WHERE condition',
        examples: 'SELECT id, name FROM users WHERE age > 18;',
        notes: 'MySQL supports LIMIT without OFFSET keyword',
        confidenceLevel: 100,
      },
      {
        termId: selectTerm.id,
        dialectId: sqlserver.id,
        translatedTerm: 'SELECT',
        syntaxPattern: 'SELECT column1, column2 FROM table_name WHERE condition',
        examples: 'SELECT id, name FROM users WHERE age > 18;',
        notes: 'SQL Server uses TOP instead of LIMIT for row limiting',
        confidenceLevel: 100,
      },
      {
        termId: selectTerm.id,
        dialectId: oracle.id,
        translatedTerm: 'SELECT',
        syntaxPattern: 'SELECT column1, column2 FROM table_name WHERE condition',
        examples: 'SELECT id, name FROM users WHERE age > 18;',
        notes: 'Oracle uses ROWNUM or FETCH FIRST for row limiting',
        confidenceLevel: 100,
      },
    ],
  });

  // INSERT translations
  await prisma.translation.createMany({
    data: [
      {
        termId: insertTerm.id,
        dialectId: postgresql.id,
        translatedTerm: 'INSERT',
        syntaxPattern: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2)',
        examples: 'INSERT INTO users (name, email) VALUES (\'John\', \'john@example.com\') RETURNING id;',
        notes: 'PostgreSQL supports RETURNING clause to get inserted values',
        confidenceLevel: 100,
      },
      {
        termId: insertTerm.id,
        dialectId: mysql.id,
        translatedTerm: 'INSERT',
        syntaxPattern: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2)',
        examples: 'INSERT INTO users (name, email) VALUES (\'John\', \'john@example.com\');',
        notes: 'MySQL supports INSERT IGNORE and REPLACE INTO',
        confidenceLevel: 100,
      },
      {
        termId: insertTerm.id,
        dialectId: sqlserver.id,
        translatedTerm: 'INSERT',
        syntaxPattern: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2)',
        examples: 'INSERT INTO users (name, email) OUTPUT INSERTED.id VALUES (\'John\', \'john@example.com\');',
        notes: 'SQL Server uses OUTPUT clause instead of RETURNING',
        confidenceLevel: 100,
      },
      {
        termId: insertTerm.id,
        dialectId: oracle.id,
        translatedTerm: 'INSERT',
        syntaxPattern: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2)',
        examples: 'INSERT INTO users (name, email) VALUES (\'John\', \'john@example.com\');',
        notes: 'Oracle supports INSERT ALL for multi-table inserts',
        confidenceLevel: 100,
      },
    ],
  });

  // UPDATE translations
  await prisma.translation.createMany({
    data: [
      {
        termId: updateTerm.id,
        dialectId: postgresql.id,
        translatedTerm: 'UPDATE',
        syntaxPattern: 'UPDATE table_name SET column1 = value1 WHERE condition',
        examples: 'UPDATE users SET name = \'Jane\' WHERE id = 1 RETURNING *;',
        notes: 'PostgreSQL supports RETURNING clause and FROM clause for joins',
        confidenceLevel: 100,
      },
      {
        termId: updateTerm.id,
        dialectId: mysql.id,
        translatedTerm: 'UPDATE',
        syntaxPattern: 'UPDATE table_name SET column1 = value1 WHERE condition',
        examples: 'UPDATE users SET name = \'Jane\' WHERE id = 1;',
        notes: 'MySQL supports LIMIT on UPDATE statements',
        confidenceLevel: 100,
      },
      {
        termId: updateTerm.id,
        dialectId: sqlserver.id,
        translatedTerm: 'UPDATE',
        syntaxPattern: 'UPDATE table_name SET column1 = value1 WHERE condition',
        examples: 'UPDATE users SET name = \'Jane\' OUTPUT INSERTED.* WHERE id = 1;',
        notes: 'SQL Server uses OUTPUT clause for returning updated values',
        confidenceLevel: 100,
      },
      {
        termId: updateTerm.id,
        dialectId: oracle.id,
        translatedTerm: 'UPDATE',
        syntaxPattern: 'UPDATE table_name SET column1 = value1 WHERE condition',
        examples: 'UPDATE users SET name = \'Jane\' WHERE id = 1;',
        notes: 'Oracle requires explicit commit for changes to persist',
        confidenceLevel: 100,
      },
    ],
  });

  // DELETE translations
  await prisma.translation.createMany({
    data: [
      {
        termId: deleteTerm.id,
        dialectId: postgresql.id,
        translatedTerm: 'DELETE',
        syntaxPattern: 'DELETE FROM table_name WHERE condition',
        examples: 'DELETE FROM users WHERE id = 1 RETURNING *;',
        notes: 'PostgreSQL supports RETURNING clause on DELETE',
        confidenceLevel: 100,
      },
      {
        termId: deleteTerm.id,
        dialectId: mysql.id,
        translatedTerm: 'DELETE',
        syntaxPattern: 'DELETE FROM table_name WHERE condition',
        examples: 'DELETE FROM users WHERE id = 1;',
        notes: 'MySQL supports LIMIT on DELETE statements',
        confidenceLevel: 100,
      },
      {
        termId: deleteTerm.id,
        dialectId: sqlserver.id,
        translatedTerm: 'DELETE',
        syntaxPattern: 'DELETE FROM table_name WHERE condition',
        examples: 'DELETE FROM users OUTPUT DELETED.* WHERE id = 1;',
        notes: 'SQL Server uses OUTPUT clause for returning deleted values',
        confidenceLevel: 100,
      },
      {
        termId: deleteTerm.id,
        dialectId: oracle.id,
        translatedTerm: 'DELETE',
        syntaxPattern: 'DELETE FROM table_name WHERE condition',
        examples: 'DELETE FROM users WHERE id = 1;',
        notes: 'Oracle requires explicit commit for changes to persist',
        confidenceLevel: 100,
      },
    ],
  });

  // CREATE TABLE translations
  await prisma.translation.createMany({
    data: [
      {
        termId: createTableTerm.id,
        dialectId: postgresql.id,
        translatedTerm: 'CREATE TABLE',
        syntaxPattern: 'CREATE TABLE table_name (column1 datatype, column2 datatype)',
        examples: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100), created_at TIMESTAMP DEFAULT NOW());',
        notes: 'PostgreSQL uses SERIAL for auto-increment, supports rich data types like JSONB, arrays',
        confidenceLevel: 100,
      },
      {
        termId: createTableTerm.id,
        dialectId: mysql.id,
        translatedTerm: 'CREATE TABLE',
        syntaxPattern: 'CREATE TABLE table_name (column1 datatype, column2 datatype)',
        examples: 'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);',
        notes: 'MySQL uses AUTO_INCREMENT, supports multiple storage engines (InnoDB, MyISAM)',
        confidenceLevel: 100,
      },
      {
        termId: createTableTerm.id,
        dialectId: sqlserver.id,
        translatedTerm: 'CREATE TABLE',
        syntaxPattern: 'CREATE TABLE table_name (column1 datatype, column2 datatype)',
        examples: 'CREATE TABLE users (id INT IDENTITY(1,1) PRIMARY KEY, name VARCHAR(100), created_at DATETIME DEFAULT GETDATE());',
        notes: 'SQL Server uses IDENTITY for auto-increment, supports computed columns',
        confidenceLevel: 100,
      },
      {
        termId: createTableTerm.id,
        dialectId: oracle.id,
        translatedTerm: 'CREATE TABLE',
        syntaxPattern: 'CREATE TABLE table_name (column1 datatype, column2 datatype)',
        examples: 'CREATE TABLE users (id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR2(100), created_at TIMESTAMP DEFAULT SYSTIMESTAMP);',
        notes: 'Oracle uses IDENTITY columns (12c+) or sequences for auto-increment',
        confidenceLevel: 100,
      },
    ],
  });

  // JOIN translations
  await prisma.translation.createMany({
    data: [
      {
        termId: joinTerm.id,
        dialectId: postgresql.id,
        translatedTerm: 'JOIN',
        syntaxPattern: 'SELECT * FROM table1 JOIN table2 ON table1.id = table2.foreign_id',
        examples: 'SELECT u.name, o.amount FROM users u INNER JOIN orders o ON u.id = o.user_id;',
        notes: 'PostgreSQL supports all join types: INNER, LEFT, RIGHT, FULL OUTER, CROSS, LATERAL',
        confidenceLevel: 100,
      },
      {
        termId: joinTerm.id,
        dialectId: mysql.id,
        translatedTerm: 'JOIN',
        syntaxPattern: 'SELECT * FROM table1 JOIN table2 ON table1.id = table2.foreign_id',
        examples: 'SELECT u.name, o.amount FROM users u INNER JOIN orders o ON u.id = o.user_id;',
        notes: 'MySQL supports INNER, LEFT, RIGHT, CROSS joins (no FULL OUTER in older versions)',
        confidenceLevel: 100,
      },
      {
        termId: joinTerm.id,
        dialectId: sqlserver.id,
        translatedTerm: 'JOIN',
        syntaxPattern: 'SELECT * FROM table1 JOIN table2 ON table1.id = table2.foreign_id',
        examples: 'SELECT u.name, o.amount FROM users u INNER JOIN orders o ON u.id = o.user_id;',
        notes: 'SQL Server supports all join types including CROSS APPLY and OUTER APPLY',
        confidenceLevel: 100,
      },
      {
        termId: joinTerm.id,
        dialectId: oracle.id,
        translatedTerm: 'JOIN',
        syntaxPattern: 'SELECT * FROM table1 JOIN table2 ON table1.id = table2.foreign_id',
        examples: 'SELECT u.name, o.amount FROM users u INNER JOIN orders o ON u.id = o.user_id;',
        notes: 'Oracle supports ANSI join syntax and legacy (+) notation for outer joins',
        confidenceLevel: 100,
      },
    ],
  });

  console.log('✅ Created translations for all terms across all dialects');

  // 4. Create Term Equivalents
  console.log('Creating term equivalents...');

  await prisma.termEquivalent.createMany({
    data: [
      {
        termId: walTerm.id,
        platform: 'PostgreSQL',
        equivalentTerm: 'WAL',
        notes: 'Native implementation',
      },
      {
        termId: walTerm.id,
        platform: 'SQL Server',
        equivalentTerm: 'Transaction Log',
        notes: 'Similar concept, different name',
      },
      {
        termId: walTerm.id,
        platform: 'Oracle',
        equivalentTerm: 'Redo Log',
        notes: 'Equivalent mechanism',
      },
      {
        termId: walTerm.id,
        platform: 'MySQL',
        equivalentTerm: 'Binary Log',
        notes: 'Used for replication and recovery',
      },
      {
        termId: walTerm.id,
        platform: 'SQLite',
        equivalentTerm: 'WAL',
        notes: 'Same terminology',
      },
    ],
  });

  console.log('✅ Created term equivalents');

  // 5. Create Term Equivalents for the 8 directional-lookup concept terms
  console.log('Creating directional-lookup term equivalents...');

  await prisma.termEquivalent.createMany({
    skipDuplicates: true,
    data: [
      // Buffer Pool / Buffer Cache
      { termId: bufferPoolTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'Buffer Pool', notes: "Managed as part of sys.dm_os_buffer_descriptors; sized via 'max server memory'." },
      { termId: bufferPoolTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'Shared Buffers', notes: 'Configured via the shared_buffers setting; PostgreSQL also relies heavily on the OS page cache.' },
      { termId: bufferPoolTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'Database Buffer Cache', notes: 'Part of the SGA; sized via DB_CACHE_SIZE or automatic memory management.' },
      { termId: bufferPoolTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'InnoDB Buffer Pool', notes: 'Configured via innodb_buffer_pool_size; caches both data and indexes for InnoDB tables.' },

      // Row Versioning / MVCC Mechanism
      { termId: mvccTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'Version Store', notes: 'Lives in tempdb; used by snapshot isolation and read-committed snapshot isolation (RCSI).' },
      { termId: mvccTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'MVCC', notes: 'Multiversion Concurrency Control; old row versions are retained until vacuumed, and changes are protected by the WAL.' },
      { termId: mvccTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'Undo Segments', notes: 'Undo tablespace stores before-images used for read consistency and rollback.' },
      { termId: mvccTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'InnoDB Undo Logs', notes: "InnoDB's MVCC implementation; undo logs support both rollback and consistent non-locking reads." },

      // Clustered Table Storage
      { termId: clusteredStorageTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'Clustered Index', notes: "A table has at most one; data rows are stored in key order in the index's leaf level." },
      { termId: clusteredStorageTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'Heap Table (no persistent clustering)', notes: 'Tables are unordered heaps by default; CLUSTER reorders rows once but does not maintain order on later writes.' },
      { termId: clusteredStorageTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'Index-Organized Table (IOT)', notes: 'An alternative to a normal heap table where the table itself is stored as a B-tree index on its primary key.' },
      { termId: clusteredStorageTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'Clustered Index (InnoDB Primary Key)', notes: 'InnoDB always clusters the table by its primary key; a table without an explicit primary key gets a hidden one.' },

      // Identity / Auto-Increment Column
      { termId: identityTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'IDENTITY', notes: 'IDENTITY(seed, increment) property on a column.' },
      { termId: identityTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'GENERATED ALWAYS AS IDENTITY / SERIAL', notes: 'SQL-standard IDENTITY columns (preferred) or the legacy SERIAL pseudo-type backed by a sequence.' },
      { termId: identityTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'IDENTITY Column', notes: 'Native IDENTITY columns since 12c; earlier versions combine a SEQUENCE with a trigger.' },
      { termId: identityTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'AUTO_INCREMENT', notes: 'AUTO_INCREMENT column attribute; only one per table, and it must be indexed.' },

      // Temporary Workspace for Sorts/Spills
      { termId: tempWorkspaceTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'tempdb', notes: 'A shared system database used for temp tables, sort/hash spills, and the version store.' },
      { termId: tempWorkspaceTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'temp_tablespaces / Temporary Files', notes: 'Configured via temp_tablespaces; spill files are written under the pgsql_tmp directory.' },
      { termId: tempWorkspaceTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'TEMP Tablespace', notes: 'A dedicated temporary tablespace used for sorts, hash joins, and global temporary tables.' },
      { termId: tempWorkspaceTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'tmpdir / Internal Temporary Tables', notes: 'Controlled by the tmpdir setting; internal temp tables may be in-memory or on-disk depending on size and engine.' },

      // Deadlock Diagnostic Artifact
      { termId: deadlockArtifactTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'Deadlock Graph', notes: 'An XML deadlock graph captured via Extended Events (or the older trace flag 1222).' },
      { termId: deadlockArtifactTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'Deadlock Detected Log Entry', notes: 'Logged to the server log when log_lock_waits/deadlock_timeout trigger detection; no XML graph, just structured log text.' },
      { termId: deadlockArtifactTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'ORA-00060 Deadlock Trace File', notes: 'Oracle raises ORA-00060 and writes a trace file to the diagnostic destination describing the waiters.' },
      { termId: deadlockArtifactTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'LATEST DETECTED DEADLOCK', notes: 'Found in the output of SHOW ENGINE INNODB STATUS, describing the transactions and locks involved.' },

      // Query Execution Plan
      { termId: executionPlanTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'Execution Plan', notes: 'Viewable as estimated or actual plans, graphically or as XML, via SSMS or SET SHOWPLAN options.' },
      { termId: executionPlanTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'Query Plan (EXPLAIN)', notes: 'Produced by EXPLAIN [ANALYZE]; text-based tree of plan nodes with costs and, with ANALYZE, actual timings.' },
      { termId: executionPlanTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'Explain Plan', notes: 'Produced by EXPLAIN PLAN FOR or the SQL*Plus AUTOTRACE/DBMS_XPLAN utilities.' },
      { termId: executionPlanTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'EXPLAIN Output', notes: 'Produced by EXPLAIN [ANALYZE] or the optimizer trace; tabular by default, tree-style with EXPLAIN FORMAT=TREE.' },

      // Optimizer Statistics
      { termId: optimizerStatsTerm.id, dialectId: sqlserver.id, platform: 'SQL Server', equivalentTerm: 'Statistics', notes: 'Objects visible in sys.stats; maintained automatically via AUTO_CREATE_STATISTICS/AUTO_UPDATE_STATISTICS.' },
      { termId: optimizerStatsTerm.id, dialectId: postgresql.id, platform: 'PostgreSQL', equivalentTerm: 'Planner Statistics', notes: 'Collected by ANALYZE (often via autovacuum) and stored in pg_statistic; consumed by the planner via pg_stats.' },
      { termId: optimizerStatsTerm.id, dialectId: oracle.id, platform: 'Oracle', equivalentTerm: 'Optimizer Statistics', notes: 'Gathered and managed via the DBMS_STATS package, typically on an automated maintenance job.' },
      { termId: optimizerStatsTerm.id, dialectId: mysql.id, platform: 'MySQL', equivalentTerm: 'Index/Table Statistics', notes: 'InnoDB persistent optimizer statistics (innodb_stats_persistent) refreshed by ANALYZE TABLE or background sampling.' },
    ],
  });

  console.log('✅ Created directional-lookup term equivalents');

  // Summary
  const counts = {
    dialects: await prisma.dialect.count(),
    terms: await prisma.term.count(),
    translations: await prisma.translation.count(),
    termEquivalents: await prisma.termEquivalent.count(),
  };

  console.log('\n📊 Seed Summary:');
  console.log(`   Dialects: ${counts.dialects}`);
  console.log(`   Terms: ${counts.terms}`);
  console.log(`   Translations: ${counts.translations}`);
  console.log(`   Term Equivalents: ${counts.termEquivalents}`);
  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
