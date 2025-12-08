import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: number;
      email: string;
      role: 'admin' | 'user';
    };
  }
}

/**
 * Authenticate request using JWT Bearer token
 */
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    // Attach user to request
    request.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    logger.debug({ userId: payload.userId, role: payload.role }, 'User authenticated');
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Authentication failed');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid or expired token',
    });
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // authenticateRequest must be called first
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (request.user.role !== 'admin') {
    logger.warn(
      { userId: request.user.userId, role: request.user.role },
      'Admin access denied'
    );
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin privileges required',
    });
  }
}

/**
 * Optional authentication - attaches user if token is present but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      request.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed, continuing without user');
  }
}
