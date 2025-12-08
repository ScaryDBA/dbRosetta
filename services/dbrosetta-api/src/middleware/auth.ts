import { FastifyRequest, FastifyReply } from 'fastify';
import jwksClient from 'jwks-rsa';
import { verify, JwtPayload } from 'jsonwebtoken';
import { getConfig } from '../config';
import { logger } from '../utils/logger';
import { JWTPayload, AuthenticatedUser, UserRole } from '../types/auth';

const config = getConfig();

// JWKS client for Azure AD public keys
const client = jwksClient({
  jwksUri: config.JWKS_URI,
  cache: true,
  cacheMaxAge: 3600000, // 1 hour
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header: any, callback: any): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  return new Promise((resolve, reject) => {
    verify(
      token,
      getKey,
      {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(decoded as JWTPayload);
      }
    );
  });
}

export function extractRoles(payload: JWTPayload): UserRole[] {
  const roles: UserRole[] = [];
  
  // Extract roles from various possible claim locations
  const roleClaims = payload.roles || payload.role || payload.groups || [];
  const roleArray = Array.isArray(roleClaims) ? roleClaims : [roleClaims];

  roleArray.forEach((role: string) => {
    const normalizedRole = role.toLowerCase();
    if (Object.values(UserRole).includes(normalizedRole as UserRole)) {
      roles.push(normalizedRole as UserRole);
    }
  });

  // Default to reader if no valid roles found
  if (roles.length === 0) {
    roles.push(UserRole.READER);
  }

  return roles;
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    // Extract user information
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: extractRoles(payload),
    };

    // Attach user to request
    (request as any).user = user;

    logger.debug({ userId: user.id, roles: user.roles }, 'User authenticated');
  } catch (error) {
    logger.warn({ error }, 'Authentication failed');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

export function requireRole(...requiredRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as any).user as AuthenticatedUser;

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const hasRequiredRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRequiredRole) {
      logger.warn(
        { userId: user.id, userRoles: user.roles, requiredRoles },
        'Insufficient permissions'
      );
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}
