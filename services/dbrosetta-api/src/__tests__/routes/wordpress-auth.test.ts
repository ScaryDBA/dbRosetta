import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../database/prisma';
import jwt from 'jsonwebtoken';

// Set WordPress JWT secret BEFORE importing app/config
process.env.WORDPRESS_JWT_SECRET = 'wordpress-test-secret-key-min-32-chars';

import { buildApp } from '../../app';

describe('WordPress JWT Integration', () => {
  let app: FastifyInstance;
  const wpSecret = process.env.WORDPRESS_JWT_SECRET!;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['wpuser@example.com', 'wpexisting@example.com'],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['wpuser@example.com', 'wpexisting@example.com'],
        },
      },
    });

    await app.close();
  });

  describe('POST /api/v1/auth/wordpress-login', () => {
    it('should authenticate with valid WordPress JWT and auto-create user', async () => {
      // Create a WordPress-style JWT token
      const wpToken = jwt.sign(
        {
          data: {
            user: {
              id: '123',
              email: 'wpuser@example.com',
            },
          },
        },
        wpSecret,
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: wpToken,
          autoRegister: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('wpuser@example.com');
      expect(body.user.isNew).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.role).toBe('user');
    });

    it('should authenticate existing user with WordPress JWT', async () => {
      // Create a user first
      const existingUser = await prisma.user.create({
        data: {
          email: 'wpexisting@example.com',
          name: 'Existing User',
          password: '',
          role: 'admin', // Make them admin
        },
      });

      const wpToken = jwt.sign(
        {
          data: {
            user: {
              id: '456',
              email: 'wpexisting@example.com',
            },
          },
        },
        wpSecret,
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: wpToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('wpexisting@example.com');
      expect(body.user.isNew).toBe(false);
      expect(body.user.role).toBe('admin'); // Should preserve existing role
      expect(body.user.id).toBe(existingUser.id);
    });

    it('should handle WordPress tokens with user_email field', async () => {
      // Some WordPress plugins use user_email instead of email
      const wpToken = jwt.sign(
        {
          data: {
            user: {
              id: 789,
              user_email: 'wpuser@example.com', // Already exists from first test
            },
          },
        },
        wpSecret,
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: wpToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('wpuser@example.com');
      expect(body.user.isNew).toBe(false); // User already exists
    });

    it('should reject invalid WordPress JWT', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: 'invalid.jwt.token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject expired WordPress JWT', async () => {
      const expiredToken = jwt.sign(
        {
          data: {
            user: {
              id: '999',
              email: 'expired@example.com',
            },
          },
        },
        wpSecret,
        {
          expiresIn: '-1h', // Expired 1 hour ago
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: expiredToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('expired');
    });

    it('should reject WordPress JWT with wrong secret', async () => {
      const wrongToken = jwt.sign(
        {
          data: {
            user: {
              id: '888',
              email: 'wrongsecret@example.com',
            },
          },
        },
        'wrong-secret-key-that-does-not-match',
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: wrongToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject WordPress JWT without user data', async () => {
      const invalidToken = jwt.sign(
        {
          // Missing data.user structure
          someOtherField: 'value',
        },
        wpSecret,
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: invalidToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('user data');
    });

    it('should not auto-register when autoRegister is false', async () => {
      const wpToken = jwt.sign(
        {
          data: {
            user: {
              id: '777',
              email: 'noauto@example.com',
            },
          },
        },
        wpSecret,
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: wpToken,
          autoRegister: false,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('User not found');
    });

    it('should use API tokens to access protected endpoints', async () => {
      // First, get tokens via WordPress JWT
      const wpToken = jwt.sign(
        {
          data: {
            user: {
              id: '123',
              email: 'wpuser@example.com', // Already exists
            },
          },
        },
        wpSecret,
        {
          expiresIn: '1h',
          algorithm: 'HS256',
        }
      );

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/wordpress-login',
        payload: {
          wordpressToken: wpToken,
        },
      });

      const { token } = JSON.parse(loginResponse.body);

      // Use the token to access /me endpoint
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const meBody = JSON.parse(meResponse.body);
      expect(meBody.email).toBe('wpuser@example.com');
    });
  });
});
