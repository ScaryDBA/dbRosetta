import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prismaTest, cleanupTestData } from '../setup';

describe('Query API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/query', () => {
    beforeEach(async () => {
      // Create test data
      await prismaTest.dialect.createMany({
        data: [
          { name: 'test_query_pg', displayName: 'Test PG', isActive: true },
          { name: 'test_query_mysql', displayName: 'Test MySQL', isActive: false },
        ],
      });
    });

    it('should query dialects', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'dialects',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entity).toBe('dialects');
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter results', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'dialects',
          filters: { isActive: true },
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((d: any) => d.isActive === true)).toBe(true);
    });

    it('should select specific fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'dialects',
          fields: ['id', 'name'],
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      if (body.data.length > 0) {
        expect(Object.keys(body.data[0])).toEqual(['id', 'name']);
      }
    });

    it('should support ordering', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'dialects',
          orderBy: { field: 'name', direction: 'desc' },
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'dialects',
          limit: 1,
          offset: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBeLessThanOrEqual(1);
    });

    it('should validate entity type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'invalid_entity',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should enforce maximum limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/query',
        payload: {
          entity: 'dialects',
          limit: 200,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/query/help', () => {
    it('should return query help documentation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/query/help',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.description).toBeDefined();
      expect(body.entities).toBeDefined();
      expect(body.examples).toBeDefined();
      expect(Array.isArray(body.examples)).toBe(true);
    });
  });
});
