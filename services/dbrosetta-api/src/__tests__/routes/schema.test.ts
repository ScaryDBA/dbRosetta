import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { cleanupTestData } from '../setup';

describe('Schema API', () => {
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

  describe('GET /api/v1/schema', () => {
    it('should return complete schema information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.version).toBeDefined();
      expect(body.schema).toBe('dbrosetta');
      expect(body.entities).toBeDefined();
      expect(Array.isArray(body.entities)).toBe(true);
      expect(body.entities.length).toBe(4);

      // Verify all entities are present
      const entityNames = body.entities.map((e: any) => e.entity);
      expect(entityNames).toContain('dialects');
      expect(entityNames).toContain('terms');
      expect(entityNames).toContain('translations');
      expect(entityNames).toContain('artifacts');
    });

    it('should include field information for each entity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema',
      });

      const body = JSON.parse(response.body);
      const dialectEntity = body.entities.find((e: any) => e.entity === 'dialects');

      expect(dialectEntity.fields).toBeDefined();
      expect(Array.isArray(dialectEntity.fields)).toBe(true);
      expect(dialectEntity.fields.length).toBeGreaterThan(0);

      // Check field structure
      const idField = dialectEntity.fields.find((f: any) => f.name === 'id');
      expect(idField.type).toBeDefined();
      expect(idField.required).toBeDefined();
    });
  });

  describe('GET /api/v1/schema/:entity', () => {
    it('should return schema for specific entity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema/dialects',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entity).toBe('dialects');
      expect(body.count).toBeDefined();
      expect(body.fields).toBeDefined();
    });

    it('should return 400 for invalid entity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema/invalid_entity',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should include sample data when available', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema/dialects',
      });

      const body = JSON.parse(response.body);
      // Sample may or may not exist depending on data
      expect(body.sample === null || typeof body.sample === 'object').toBe(true);
    });
  });

  describe('GET /api/v1/schema/stats/overview', () => {
    it('should return statistics for all entities', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema/stats/overview',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.totals).toBeDefined();
      expect(body.totals.dialects).toBeDefined();
      expect(body.totals.terms).toBeDefined();
      expect(body.totals.translations).toBeDefined();
      expect(body.totals.artifacts).toBeDefined();

      expect(body.active).toBeDefined();
      expect(body.active.dialects).toBeDefined();
      expect(body.active.terms).toBeDefined();
      expect(body.active.translations).toBeDefined();

      expect(body.percentageActive).toBeDefined();
    });

    it('should return numeric counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/schema/stats/overview',
      });

      const body = JSON.parse(response.body);
      expect(typeof body.totals.dialects).toBe('number');
      expect(typeof body.totals.terms).toBe('number');
      expect(typeof body.active.dialects).toBe('number');
    });
  });
});
