import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prismaTest, cleanupTestData } from '../setup';
import { createTestUsers, cleanupTestUsers, TestUser } from '../helpers/users';

describe('Translations API', () => {
  let app: FastifyInstance;
  let testDialectId: number;
  let testTermId: number;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    
    const users = await createTestUsers();
    adminUser = users.admin;
    regularUser = users.user;
  });

  afterAll(async () => {
    await cleanupTestUsers('@test.com');
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Create test dialect and term
    const dialect = await prismaTest.dialect.create({
      data: {
        name: 'test_pg_trans',
        displayName: 'Test PostgreSQL',
      },
    });
    testDialectId = dialect.id;

    const term = await prismaTest.term.create({
      data: {
        canonicalTerm: 'TEST_SELECT_TRANS',
        category: 'DML',
        description: 'Test term for translations',
      },
    });
    testTermId = term.id;
  });

  describe('POST /api/v1/translations', () => {
    it('should create a new translation with admin auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/translations',
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          termId: testTermId,
          dialectId: testDialectId,
          translatedTerm: 'SELECT',
          syntaxPattern: 'SELECT * FROM table',
          examples: 'SELECT * FROM users;',
          confidenceLevel: 100,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.translatedTerm).toBe('SELECT');
      expect(body.termId).toBe(testTermId);
      expect(body.dialectId).toBe(testDialectId);
    });

    it('should reject creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/translations',
        payload: {
          termId: testTermId,
          dialectId: testDialectId,
          translatedTerm: 'SELECT',
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should validate term exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/translations',
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          termId: 999999,
          dialectId: testDialectId,
          translatedTerm: 'SELECT',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Term not found');
    });

    it('should validate dialect exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/translations',
        payload: {
          termId: testTermId,
          dialectId: 999999,
          translatedTerm: 'SELECT',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Dialect not found');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/translations',
        payload: {
          termId: testTermId,
          // Missing dialectId and translatedTerm
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/translations', () => {
    beforeEach(async () => {
      // Create a second dialect for testing multiple translations
      const dialect2 = await prismaTest.dialect.create({
        data: {
          name: 'test_mysql_trans',
          displayName: 'Test MySQL',
        },
      });

      await prismaTest.translation.createMany({
        data: [
          {
            termId: testTermId,
            dialectId: testDialectId,
            translatedTerm: 'SELECT',
            confidenceLevel: 100,
            isActive: true,
          },
          {
            termId: testTermId,
            dialectId: dialect2.id,
            translatedTerm: 'SELECT *',
            confidenceLevel: 90,
            isActive: true,
          },
        ],
      });
    });

    it('should list translations with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/translations?page=1&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination).toBeDefined();
    });

    it('should filter by termId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/translations?termId=${testTermId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((t: any) => t.termId === testTermId)).toBe(true);
    });

    it('should filter by dialectId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/translations?dialectId=${testDialectId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((t: any) => t.dialectId === testDialectId)).toBe(true);
    });

    it('should filter by confidence level', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/translations?minConfidence=95',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((t: any) => t.confidenceLevel >= 95)).toBe(true);
    });
  });

  describe('GET /api/v1/translations/:id', () => {
    it('should get a specific translation with term and dialect', async () => {
      const translation = await prismaTest.translation.create({
        data: {
          termId: testTermId,
          dialectId: testDialectId,
          translatedTerm: 'SELECT',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/translations/${translation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(translation.id.toString());
      expect(body.term).toBeDefined();
      expect(body.dialect).toBeDefined();
    });

    it('should return 404 for non-existent translation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/translations/999999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/translations/:id', () => {
    it('should update a translation', async () => {
      const translation = await prismaTest.translation.create({
        data: {
          termId: testTermId,
          dialectId: testDialectId,
          translatedTerm: 'SELECT',
          confidenceLevel: 80,
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/translations/${translation.id}`,
        payload: {
          confidenceLevel: 95,
          notes: 'Updated notes',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.confidenceLevel).toBe(95);
      expect(body.notes).toBe('Updated notes');
    });
  });

  describe('DELETE /api/v1/translations/:id', () => {
    it('should soft delete a translation', async () => {
      const translation = await prismaTest.translation.create({
        data: {
          termId: testTermId,
          dialectId: testDialectId,
          translatedTerm: 'SELECT',
          isActive: true,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/translations/${translation.id}`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const updated = await prismaTest.translation.findUnique({
        where: { id: translation.id },
      });
      expect(updated?.isActive).toBe(false);
    });
  });
});
