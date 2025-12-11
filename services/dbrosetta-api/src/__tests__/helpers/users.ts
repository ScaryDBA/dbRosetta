import { prisma } from '../../database/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/jwt';

export interface TestUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  token: string;
}

/**
 * Create a test user (admin or regular user)
 */
export async function createTestUser(
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user',
  name?: string
): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || `Test ${role}`,
      role,
      isActive: true,
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'user',
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    role: user.role as 'admin' | 'user',
    token,
  };
}

/**
 * Delete test users by email pattern
 */
export async function cleanupTestUsers(emailPattern: string): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: emailPattern,
      },
    },
  });
}

/**
 * Create admin and regular user for tests
 */
export async function createTestUsers(): Promise<{
  admin: TestUser;
  user: TestUser;
}> {
  const admin = await createTestUser('admin@test.com', 'adminpass123', 'admin', 'Test Admin');

  const user = await createTestUser('user@test.com', 'userpass123', 'user', 'Test User');

  return { admin, user };
}
