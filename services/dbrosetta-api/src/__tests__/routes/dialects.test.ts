import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prismaTest, cleanupTestData } from '../setup';
import { createTestUsers, cleanupTestUsers, TestUser } from '../helpers/users';

describe('Dialects API', () => {
  let app: FastifyInstance;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test users
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
  });

  describe('POST /api/v1/dialects', () => {
    it('should create a new dialect with admin auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dialects',
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          name: 'test_postgresql',
          displayName: 'Test PostgreSQL',
          version: '18.0',
          description: 'Test PostgreSQL database',
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('test_postgresql');
      expect(body.displayName).toBe('Test PostgreSQL');
      expect(body.id).toBeDefined();
    });

    it('should reject creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dialects',
        payload: {
          name: 'test_postgresql',
          displayName: 'Test PostgreSQL',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject creation with regular user role', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dialects',
        headers: {
          authorization: `Bearer ${regularUser.token}`,
        },
        payload: {
          name: 'test_postgresql',
          displayName: 'Test PostgreSQL',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject duplicate dialect names', async () => {
      await prismaTest.dialect.create({
        data: {
          name: 'test_duplicate',
          displayName: 'Test Duplicate',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dialects',
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          name: 'test_duplicate',
          displayName: 'Another Duplicate',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dialects',
        payload: {
          displayName: 'Missing Name',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/dialects', () => {
    beforeEach(async () => {
      // Create test dialects
      await prismaTest.dialect.createMany({
        data: [
          { name: 'test_pg', displayName: 'Test PostgreSQL', isActive: true },
          { name: 'test_mysql', displayName: 'Test MySQL', isActive: true },
          { name: 'test_oracle', displayName: 'Test Oracle', isActive: false },
        ],
      });
    });

    it('should list dialects with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dialects?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(2);
    });

    it('should filter by isActive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dialects?isActive=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((d: any) => d.isActive === true)).toBe(true);
    });

    it('should filter by name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dialects?name=test_pg',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].name).toContain('test_pg');
    });
  });

  describe('GET /api/v1/dialects/:id', () => {
    it('should get a specific dialect', async () => {
      const dialect = await prismaTest.dialect.create({
        data: {
          name: 'test_specific',
          displayName: 'Test Specific',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/dialects/${dialect.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(dialect.id);
      expect(body.name).toBe('test_specific');
    });

    it('should return 404 for non-existent dialect', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dialects/999999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dialects/invalid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/dialects/:id', () => {
    it('should update a dialect', async () => {
      const dialect = await prismaTest.dialect.create({
        data: {
          name: 'test_update',
          displayName: 'Test Update',
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/dialects/${dialect.id}`,
        payload: {
          displayName: 'Updated Display Name',
          version: '19.0',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.displayName).toBe('Updated Display Name');
      expect(body.version).toBe('19.0');
      expect(body.name).toBe('test_update'); // Should not change
    });

    it('should reject duplicate name on update', async () => {
      await prismaTest.dialect.create({
        data: { name: 'test_existing', displayName: 'Existing' },
      });

      const dialect = await prismaTest.dialect.create({
        data: { name: 'test_to_update', displayName: 'To Update' },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/dialects/${dialect.id}`,
        payload: { name: 'test_existing' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/v1/dialects/:id', () => {
    it('should soft delete a dialect with admin auth', async () => {
      const dialect = await prismaTest.dialect.create({
        data: {
          name: 'test_delete',
          displayName: 'Test Delete',
          isActive: true,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/dialects/${dialect.id}`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify soft delete
      const updated = await prismaTest.dialect.findUnique({
        where: { id: dialect.id },
      });
      expect(updated?.isActive).toBe(false);
    });

    it('should reject delete without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/dialects/1',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject delete with regular user role', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/dialects/1',
        headers: {
          authorization: `Bearer ${regularUser.token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
