import jwt, { SignOptions } from 'jsonwebtoken';
import { getConfig } from '../config';

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as string,
    issuer: 'dbrosetta-api',
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  const config = getConfig();
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'dbrosetta-api',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generate a refresh token with longer expiration
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'dbrosetta-api',
  });
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
