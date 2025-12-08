import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma';
import { generateToken, generateRefreshToken, verifyToken } from '../../utils/jwt';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../../schemas/auth';
import { authenticateRequest } from '../../middleware/auth';
import {
  verifyWordPressToken,
  extractEmailFromWordPressPayload,
} from '../../utils/wordpress-jwt';
import { logger } from '../../utils/logger';

export default async function authRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  /**
   * Register a new user
   */
  app.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
              },
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const body = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.name,
          role: 'user', // Default role
        },
      });

      // Generate tokens
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
      });

      return reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
        refreshToken,
      });
    },
  });

  /**
   * Login with email and password
   */
  app.post('/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
              },
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const body = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(body.password, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate tokens
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
        refreshToken,
      });
    },
  });

  /**
   * Login with WordPress JWT token
   */
  app.post('/wordpress-login', {
    schema: {
      description: 'Authenticate using a WordPress JWT token and receive dbRosetta API tokens',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['wordpressToken'],
        properties: {
          wordpressToken: {
            type: 'string',
            description: 'JWT token issued by WordPress (using a WordPress JWT plugin)',
          },
          autoRegister: {
            type: 'boolean',
            description: 'Automatically create a user account if the email does not exist (default: true)',
            default: true,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                isNew: { type: 'boolean' },
              },
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body as {
          wordpressToken: string;
          autoRegister?: boolean;
        };

        // Verify the WordPress JWT token
        const wpPayload = verifyWordPressToken(body.wordpressToken);
        const email = extractEmailFromWordPressPayload(wpPayload);

        logger.info({ email }, 'WordPress JWT validated successfully');

        // Check if user exists in our database
        let user = await prisma.user.findUnique({
          where: { email },
        });

        let isNew = false;

        // Auto-register user if they don't exist and autoRegister is enabled (default true)
        if (!user && (body.autoRegister ?? true)) {
          logger.info({ email }, 'Creating new user from WordPress JWT');
          
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0], // Use email prefix as default name
              password: '', // WordPress users don't have passwords in our system
              role: 'user', // Default role for WordPress users
            },
          });
          
          isNew = true;
        }

        if (!user) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'User not found. Set autoRegister=true to create a new user.',
          });
        }

        // Generate our API tokens
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role as 'admin' | 'user',
        });

        const refreshToken = generateRefreshToken({
          userId: user.id,
          email: user.email,
          role: user.role as 'admin' | 'user',
        });

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isNew,
          },
          token,
          refreshToken,
        });
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'WordPress JWT authentication failed');
        
        return reply.status(401).send({
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'WordPress token validation failed',
        });
      }
    },
  });

  /**
   * Refresh access token
   */
  app.post('/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const body = refreshTokenSchema.parse(request.body);

      try {
        // Verify refresh token
        const decoded = verifyToken(body.refreshToken);

        // Verify user still exists
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not found',
          });
        }

        // Generate new tokens
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role as 'admin' | 'user',
        });

        const refreshToken = generateRefreshToken({
          userId: user.id,
          email: user.email,
          role: user.role as 'admin' | 'user',
        });

        return reply.send({
          token,
          refreshToken,
        });
      } catch (error) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Invalid refresh token',
        });
      }
    },
  });

  /**
   * Get current user profile
   */
  app.get('/me', {
    preHandler: [authenticateRequest],
    schema: {
      description: 'Get current user profile',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
      });

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      });
    },
  });

  /**
   * Change password
   */
  app.post('/change-password', {
    preHandler: [authenticateRequest],
    schema: {
      description: 'Change user password',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const body = changePasswordSchema.parse(request.body);

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
      });

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(body.currentPassword, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return reply.send({
        message: 'Password changed successfully',
      });
    },
  });

  /**
   * Logout (client-side token removal)
   */
  app.post('/logout', {
    preHandler: [authenticateRequest],
    schema: {
      description: 'Logout user (client should discard tokens)',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      return reply.send({
        message: 'Logged out successfully. Please discard your tokens.',
      });
    },
  });
}
