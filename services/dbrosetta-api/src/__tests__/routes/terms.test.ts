import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prismaTest, cleanupTestData } from '../setup';
import { createTestUsers, cleanupTestUsers, TestUser } from '../helpers/users';

describe('Terms API', () => {
  let app: FastifyInstance;
  let adminUser: TestUser;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const users = await createTestUsers();
    adminUser = users.admin;
  });

  afterAll(async () => {
    await cleanupTestUsers('@test.com');
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/terms', () => {
    it('should create a new term with admin auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/terms',
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          canonicalTerm: 'TEST_SELECT',
          category: 'DML',
          subcategory: 'Query',
          description: 'Retrieve rows from a table',
          usageContext: 'Used to query data',
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.canonicalTerm).toBe('TEST_SELECT');
      expect(body.category).toBe('DML');
      expect(body.id).toBeDefined();
    });

    it('should reject creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/terms',
        payload: { canonicalTerm: 'TEST', category: 'DML', description: 'Test' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/terms',
        payload: {
          canonicalTerm: 'TEST_INVALID',
          // Missing category and description
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/terms', () => {
    beforeEach(async () => {
      await prismaTest.term.createMany({
        data: [
          {
            canonicalTerm: 'TEST_SELECT',
            category: 'DML',
            description: 'Select data',
            isActive: true,
          },
          {
            canonicalTerm: 'TEST_INSERT',
            category: 'DML',
            description: 'Insert data',
            isActive: true,
          },
          {
            canonicalTerm: 'TEST_CREATE_TABLE',
            category: 'DDL',
            description: 'Create table',
            isActive: false,
          },
        ],
      });
    });

    it('should list terms with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/terms?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/terms?category=DML',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((t: any) => t.category === 'DML')).toBe(true);
    });

    it('should search terms', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/terms?search=SELECT',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should filter by isActive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/terms?isActive=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((t: any) => t.isActive === true)).toBe(true);
    });
  });

  describe('GET /api/v1/terms/:id', () => {
    it('should get a specific term with translations', async () => {
      const term = await prismaTest.term.create({
        data: {
          canonicalTerm: 'TEST_SPECIFIC',
          category: 'DML',
          description: 'Test term',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/terms/${term.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(term.id);
      expect(body.translations).toBeDefined();
    });

    it('should return 404 for non-existent term', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/terms/999999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/terms/:id', () => {
    it('should update a term', async () => {
      const term = await prismaTest.term.create({
        data: {
          canonicalTerm: 'TEST_UPDATE',
          category: 'DML',
          description: 'Original description',
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/terms/${term.id}`,
        payload: {
          description: 'Updated description',
          subcategory: 'Query',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.description).toBe('Updated description');
      expect(body.subcategory).toBe('Query');
    });
  });

  describe('DELETE /api/v1/terms/:id', () => {
    it('should soft delete a term', async () => {
      const term = await prismaTest.term.create({
        data: {
          canonicalTerm: 'TEST_DELETE',
          category: 'DML',
          description: 'To be deleted',
          isActive: true,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/terms/${term.id}`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const updated = await prismaTest.term.findUnique({
        where: { id: term.id },
      });
      expect(updated?.isActive).toBe(false);
    });

    it('should reject delete without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/terms/1',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
