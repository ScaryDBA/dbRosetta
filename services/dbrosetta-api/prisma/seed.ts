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

  console.log('✅ Created 10 terms');

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

  // Summary
  const counts = {
    dialects: await prisma.dialect.count(),
    terms: await prisma.term.count(),
    translations: await prisma.translation.count(),
  };

  console.log('\n📊 Seed Summary:');
  console.log(`   Dialects: ${counts.dialects}`);
  console.log(`   Terms: ${counts.terms}`);
  console.log(`   Translations: ${counts.translations}`);
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
