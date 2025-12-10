import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/prisma';

describe('Authentication Endpoints', () => {
  let app: FastifyInstance;
  let authToken: string;
  let refreshToken: string;
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User',
  };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up any existing test user
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe(testUser.email);
      expect(body.user.name).toBe(testUser.name);
      expect(body.user.role).toBe('user');
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.password).toBeUndefined();

      // Save tokens for later tests
      authToken = body.token;
      refreshToken = body.refreshToken;
    });

    it('should not register duplicate email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'testpassword123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate password length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test2@example.com',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe(testUser.email);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.password).toBeUndefined();

      // Update tokens
      authToken = body.token;
      refreshToken = body.refreshToken;
    });

    it('should not login with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid email or password');
    });

    it('should not login with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid email or password');
    });

    it.skip('should not login inactive user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isActive: false },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('deactivated');

      // Reactivate user for other tests
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isActive: true },
      });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.email).toBe(testUser.email);
      expect(body.name).toBe(testUser.name);
      expect(body.role).toBe('user');
      expect(body.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      // Update tokens
      authToken = body.token;
      refreshToken = body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    const newPassword = 'newpassword456';

    it('should change password with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          currentPassword: testUser.password,
          newPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('successfully');
    });

    it('should login with new password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: newPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.token).toBeDefined();

      // Update token
      authToken = body.token;
    });

    it('should not change password with wrong current password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          currentPassword: 'wrongpassword',
          newPassword: 'anotherpassword789',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Current password is incorrect');
    });

    it('should reject request without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        payload: {
          currentPassword: newPassword,
          newPassword: 'anotherpassword789',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate new password length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          currentPassword: newPassword,
          newPassword: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    // Reset password for cleanup
    afterAll(async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: {
          password: await require('bcryptjs').hash(testUser.password, 10),
        },
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('successfully');
    });

    it('should require authentication for logout', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
