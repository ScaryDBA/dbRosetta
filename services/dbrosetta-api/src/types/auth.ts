export interface JWTPayload {
  sub: string; // User ID
  email?: string;
  name?: string;
  roles?: string[]; // RBAC roles
  scope?: string[]; // OAuth scopes
  iss: string; // Issuer
  aud: string | string[]; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
  [key: string]: unknown;
}

export enum UserRole {
  ADMIN = 'admin',
  READER = 'reader',
  EDITOR = 'editor',
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  roles: UserRole[];
}
