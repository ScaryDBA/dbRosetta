import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prismaTest, cleanupTestData } from '../setup';

describe('Term Lookup API', () => {
  let app: FastifyInstance;
  let postgresql: { id: number; name: string; displayName: string };
  let sqlserver: { id: number; name: string; displayName: string };
  let oracle: { id: number; name: string; displayName: string };
  let mysql: { id: number; name: string; displayName: string };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    postgresql = await prismaTest.dialect.upsert({
      where: { name: 'postgresql' },
      update: { isActive: true },
      create: { name: 'postgresql', displayName: 'PostgreSQL', isActive: true },
    });
    sqlserver = await prismaTest.dialect.upsert({
      where: { name: 'sqlserver' },
      update: { isActive: true },
      create: { name: 'sqlserver', displayName: 'SQL Server', isActive: true },
    });
    oracle = await prismaTest.dialect.upsert({
      where: { name: 'oracle' },
      update: { isActive: true },
      create: { name: 'oracle', displayName: 'Oracle Database', isActive: true },
    });
    mysql = await prismaTest.dialect.upsert({
      where: { name: 'mysql' },
      update: { isActive: true },
      create: { name: 'mysql', displayName: 'MySQL', isActive: true },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  async function createWalTerm() {
    const term = await prismaTest.term.create({
      data: {
        canonicalTerm: 'TEST_WAL',
        category: 'System',
        subcategory: 'Logging',
        description: 'Write Ahead Log test term',
        isActive: true,
      },
    });

    await prismaTest.termEquivalent.createMany({
      data: [
        {
          termId: term.id,
          dialectId: postgresql.id,
          platform: 'PostgreSQL',
          equivalentTerm: 'TEST_WAL',
          notes: 'Native implementation',
        },
        {
          termId: term.id,
          dialectId: sqlserver.id,
          platform: 'SQL Server',
          equivalentTerm: 'TEST_Transaction Log',
          notes: 'Similar concept, different name',
        },
        {
          termId: term.id,
          dialectId: oracle.id,
          platform: 'Oracle',
          equivalentTerm: 'TEST_Redo Log',
          notes: 'Equivalent mechanism',
        },
        {
          termId: term.id,
          dialectId: mysql.id,
          platform: 'MySQL',
          equivalentTerm: 'TEST_Binary Log',
          notes: 'Used for replication and recovery',
        },
      ],
    });

    return term;
  }

  it('returns a single result for a single requested target dialect', async () => {
    await createWalTerm();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/terms/lookup',
      payload: {
        term: 'TEST_Transaction Log',
        sourceDialect: 'sqlserver',
        targetDialects: ['postgresql'],
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.term.canonicalTerm).toBe('TEST_WAL');
    expect(data.sourceDialect.name).toBe('sqlserver');
    expect(data.matchedEquivalent.equivalentTerm).toBe('TEST_Transaction Log');
    expect(data.results).toHaveLength(1);
    expect(data.results[0].dialect.name).toBe('postgresql');
    expect(data.results[0].equivalentTerm).toBe('TEST_WAL');
  });

  it('excludes the source dialect when no target dialects are requested (all platforms)', async () => {
    await createWalTerm();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/terms/lookup',
      payload: {
        term: '  TEST_TRANSACTION LOG  ',
        sourceDialect: 'sqlserver',
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.results).toHaveLength(3);
    expect(data.results.map((r: any) => r.dialect.name)).not.toContain('sqlserver');
    const names = data.results.map((r: any) => r.dialect.name);
    expect(names).toEqual(expect.arrayContaining(['postgresql', 'oracle', 'mysql']));
  });

  it('falls back to matching the canonical term when no source-dialect equivalent matches', async () => {
    const term = await createWalTerm();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/terms/lookup',
      payload: {
        term: 'TEST_WAL',
        sourceDialect: 'oracle',
        targetDialects: ['mysql'],
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.term.id).toBe(term.id);
    expect(data.matchedEquivalent.dialect.name).toBe('oracle');
    expect(data.matchedEquivalent.equivalentTerm).toBe('TEST_Redo Log');
    expect(data.results).toHaveLength(1);
    expect(data.results[0].equivalentTerm).toBe('TEST_Binary Log');
  });

  it('returns 400 invalid_dialect for an unrecognized sourceDialect', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/terms/lookup',
      payload: {
        term: 'anything',
        sourceDialect: 'not_a_real_dialect',
      },
    });

    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.body);
    expect(data.error).toBe('invalid_dialect');
    expect(data.invalidValues).toContain('not_a_real_dialect');
  });

  it('returns 400 invalid_dialect for an unrecognized targetDialects entry', async () => {
    await createWalTerm();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/terms/lookup',
      payload: {
        term: 'TEST_WAL',
        sourceDialect: 'postgresql',
        targetDialects: ['postgresql', 'not_a_real_dialect'],
      },
    });

    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.body);
    expect(data.error).toBe('invalid_dialect');
    expect(data.invalidValues).toContain('not_a_real_dialect');
  });

  it('returns 404 not_found for an unknown term', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/terms/lookup',
      payload: {
        term: 'TEST_nonexistent_term_xyz',
        sourceDialect: 'postgresql',
      },
    });

    expect(response.statusCode).toBe(404);
    const data = JSON.parse(response.body);
    expect(data.error).toBe('not_found');
  });
});
