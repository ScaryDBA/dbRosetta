import jwt from 'jsonwebtoken';
import { getConfig } from '../config';
import { logger } from './logger';

export interface WordPressJWTPayload {
  data: {
    user: {
      id: string | number;
      email?: string;
      user_email?: string;
    };
  };
  iss?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Verify WordPress JWT token
 * WordPress JWT tokens typically have a different structure than our internal tokens
 */
export function verifyWordPressToken(token: string): WordPressJWTPayload {
  const config = getConfig();
  
  if (!config.WORDPRESS_JWT_SECRET) {
    throw new Error('WORDPRESS_JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, config.WORDPRESS_JWT_SECRET, {
      algorithms: ['HS256'], // WordPress JWT plugins typically use HS256
    }) as WordPressJWTPayload;

    // Validate the structure
    if (!decoded.data || !decoded.data.user) {
      throw new Error('Invalid WordPress JWT structure: missing user data');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('WordPress token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({ error: error.message }, 'Invalid WordPress JWT token');
      throw new Error('Invalid WordPress token');
    }
    throw error;
  }
}

/**
 * Extract email from WordPress JWT payload
 * WordPress can store email in different fields depending on the plugin
 */
export function extractEmailFromWordPressPayload(payload: WordPressJWTPayload): string {
  const email = payload.data.user.email || payload.data.user.user_email;
  
  if (!email || typeof email !== 'string') {
    throw new Error('Email not found in WordPress token');
  }

  // Basic email validation
  if (!email.includes('@') || email.length < 3) {
    throw new Error('Invalid email format in WordPress token');
  }

  return email;
}

/**
 * Extract user ID from WordPress JWT payload
 */
export function extractUserIdFromWordPressPayload(payload: WordPressJWTPayload): number {
  const userId = payload.data.user.id;
  
  if (!userId) {
    throw new Error('User ID not found in WordPress token');
  }

  // Convert to number if it's a string
  const numericId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('Invalid user ID in WordPress token');
  }

  return numericId;
}
