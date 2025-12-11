import { z } from 'zod';

// Common pagination schema
export const paginationSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// Dialect schemas
export const dialectSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  version: z.string().max(20).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const dialectUpdateSchema = dialectSchema.partial();

export const dialectFilterSchema = z.object({
  name: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

// Term schemas
export const termSchema = z.object({
  canonicalTerm: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  subcategory: z.string().max(50).optional(),
  description: z.string().min(1),
  usageContext: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const termUpdateSchema = termSchema.partial();

export const termFilterSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().optional(),
});

// Translation schemas
export const translationSchema = z.object({
  termId: z.number().int().positive(),
  dialectId: z.number().int().positive(),
  translatedTerm: z.string().min(1),
  syntaxPattern: z.string().optional(),
  examples: z.string().optional(),
  notes: z.string().optional(),
  confidenceLevel: z.number().int().min(0).max(100).default(100),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const translationUpdateSchema = translationSchema.partial();

export const translationFilterSchema = z.object({
  termId: z.string().transform(Number).optional(),
  dialectId: z.string().transform(Number).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  minConfidence: z.string().transform(Number).optional(),
});

// Artifact schemas
export const artifactSchema = z.object({
  name: z.string().min(1).max(200),
  artifactType: z.string().min(1).max(50),
  sourceDialectId: z.number().int().positive().optional(),
  targetDialectId: z.number().int().positive().optional(),
  originalSql: z.string().optional(),
  translatedSql: z.string().optional(),
  translationSummary: z.string().optional(),
  status: z.string().max(20).default('draft'),
  metadata: z.record(z.unknown()).optional(),
});

export const artifactUpdateSchema = artifactSchema.partial();

export const artifactFilterSchema = z.object({
  artifactType: z.string().optional(),
  status: z.string().optional(),
  sourceDialectId: z.string().transform(Number).optional(),
  targetDialectId: z.string().transform(Number).optional(),
  search: z.string().optional(),
});

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
