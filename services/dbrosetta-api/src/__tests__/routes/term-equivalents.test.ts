import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prismaTest, cleanupTestData } from '../setup';
import { createTestUsers, cleanupTestUsers, TestUser } from '../helpers/users';

describe('Term Equivalents API', () => {
  let app: FastifyInstance;
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

    // Create test term
    const term = await prismaTest.term.create({
      data: {
        canonicalTerm: 'TEST_WAL',
        category: 'System',
        subcategory: 'Logging',
        description: 'Write Ahead Log test',
        isActive: true,
      },
    });
    testTermId = term.id;
  });

  describe('GET /api/v1/terms/:termId/equivalents', () => {
    it('should return empty array when term has no equivalents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/terms/${testTermId}/equivalents`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('should return all equivalents for a term', async () => {
      // Create equivalents
      await prismaTest.termEquivalent.createMany({
        data: [
          {
            termId: testTermId,
            platform: 'PostgreSQL',
            equivalentTerm: 'WAL',
            notes: 'Native implementation',
          },
          {
            termId: testTermId,
            platform: 'SQL Server',
            equivalentTerm: 'Transaction Log',
            notes: 'Similar concept',
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/terms/${testTermId}/equivalents`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveLength(2);
      expect(data[0].platform).toBe('PostgreSQL');
      expect(data[0].equivalentTerm).toBe('WAL');
      expect(data[1].platform).toBe('SQL Server');
    });

    it('should return 404 for non-existent term', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/terms/99999/equivalents',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/terms/:termId/equivalents', () => {
    it('should create a new equivalent with admin auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/terms/${testTermId}/equivalents`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          platform: 'MySQL',
          equivalentTerm: 'Binary Log',
          notes: 'Used for replication',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.platform).toBe('MySQL');
      expect(data.equivalentTerm).toBe('Binary Log');
      expect(data.notes).toBe('Used for replication');
    });

    it('should reject creation without admin auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/terms/${testTermId}/equivalents`,
        headers: {
          authorization: `Bearer ${regularUser.token}`,
        },
        payload: {
          platform: 'MySQL',
          equivalentTerm: 'Binary Log',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject duplicate platform for same term', async () => {
      // Create first equivalent
      await prismaTest.termEquivalent.create({
        data: {
          termId: testTermId,
          platform: 'Oracle',
          equivalentTerm: 'Redo Log',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/terms/${testTermId}/equivalents`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          platform: 'Oracle',
          equivalentTerm: 'Archive Log',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 404 for non-existent term', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/terms/99999/equivalents',
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          platform: 'MySQL',
          equivalentTerm: 'Binary Log',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/terms/:termId/equivalents/:id', () => {
    let equivalentId: number;

    beforeEach(async () => {
      const equivalent = await prismaTest.termEquivalent.create({
        data: {
          termId: testTermId,
          platform: 'SQLite',
          equivalentTerm: 'WAL',
        },
      });
      equivalentId = equivalent.id;
    });

    it('should update an equivalent with admin auth', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/terms/${testTermId}/equivalents/${equivalentId}`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          notes: 'Added in SQLite 3.7.0',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.notes).toBe('Added in SQLite 3.7.0');
      expect(data.platform).toBe('SQLite'); // Unchanged
    });

    it('should reject update without admin auth', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/terms/${testTermId}/equivalents/${equivalentId}`,
        headers: {
          authorization: `Bearer ${regularUser.token}`,
        },
        payload: {
          notes: 'Updated notes',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent equivalent', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/terms/${testTermId}/equivalents/99999`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
        payload: {
          notes: 'Updated',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/terms/:termId/equivalents/:id', () => {
    let equivalentId: number;

    beforeEach(async () => {
      const equivalent = await prismaTest.termEquivalent.create({
        data: {
          termId: testTermId,
          platform: 'Test Platform',
          equivalentTerm: 'Test Term',
        },
      });
      equivalentId = equivalent.id;
    });

    it('should delete an equivalent with admin auth', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/terms/${testTermId}/equivalents/${equivalentId}`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify it's deleted
      const equivalent = await prismaTest.termEquivalent.findUnique({
        where: { id: equivalentId },
      });
      expect(equivalent).toBeNull();
    });

    it('should reject deletion without admin auth', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/terms/${testTermId}/equivalents/${equivalentId}`,
        headers: {
          authorization: `Bearer ${regularUser.token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent equivalent', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/terms/${testTermId}/equivalents/99999`,
        headers: {
          authorization: `Bearer ${adminUser.token}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/terms/:id with equivalents', () => {
    it('should include equivalents in term details', async () => {
      // Create equivalents
      await prismaTest.termEquivalent.createMany({
        data: [
          {
            termId: testTermId,
            platform: 'PostgreSQL',
            equivalentTerm: 'WAL',
            notes: 'Native',
          },
          {
            termId: testTermId,
            platform: 'Oracle',
            equivalentTerm: 'Redo Log',
            notes: 'Similar',
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/terms/${testTermId}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.canonicalTerm).toBe('TEST_WAL');
      expect(data.equivalents).toHaveLength(2);
      expect(data.equivalents[0].platform).toBe('Oracle'); // Alphabetically sorted
      expect(data.equivalents[1].platform).toBe('PostgreSQL');
    });
  });
});
