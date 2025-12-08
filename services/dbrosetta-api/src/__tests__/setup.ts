import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create a test Prisma client
export const prismaTest = new PrismaClient();

// Setup before all tests
beforeAll(async () => {
  // Connect to database
  await prismaTest.$connect();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await prismaTest.$disconnect();
});

// Helper to clean up test data
export async function cleanupTestData() {
  // Delete in order to respect foreign keys
  await prismaTest.translation.deleteMany({
    where: {
      term: {
        canonicalTerm: {
          startsWith: 'TEST_',
        },
      },
    },
  });

  await prismaTest.artifact.deleteMany({
    where: {
      name: {
        startsWith: 'TEST_',
      },
    },
  });

  await prismaTest.term.deleteMany({
    where: {
      canonicalTerm: {
        startsWith: 'TEST_',
      },
    },
  });

  await prismaTest.dialect.deleteMany({
    where: {
      name: {
        startsWith: 'test_',
      },
    },
  });
}
