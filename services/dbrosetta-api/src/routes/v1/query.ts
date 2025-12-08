import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import { z } from 'zod';

// Safe query schema with parameterized approach
const querySchema = z.object({
  entity: z.enum(['dialects', 'terms', 'translations', 'artifacts']),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  fields: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
  orderBy: z
    .object({
      field: z.string(),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
});

export default async function queryRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Safe parameterized query endpoint
  app.post<{ Body: unknown }>('/', {
    schema: {
      description:
        'Execute a safe parameterized query against the database. Only allows querying the four main entities with predefined filters.',
      tags: ['Query'],
      body: {
        type: 'object',
        required: ['entity'],
        properties: {
          entity: {
            type: 'string',
            enum: ['dialects', 'terms', 'translations', 'artifacts'],
          },
          filters: { type: 'object' },
          fields: {
            type: 'array',
            items: { type: 'string' },
          },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
          offset: { type: 'number', minimum: 0, default: 0 },
          orderBy: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              direction: { type: 'string', enum: ['asc', 'desc'] },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const query = querySchema.parse(request.body);

      try {
        let result: any;
        const { entity, filters, fields, limit, offset, orderBy } = query;

        // Build where clause from filters
        const where: any = {};
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            where[key] = value;
          });
        }

        // Build select clause from fields
        const select = fields
          ? fields.reduce((acc, field) => {
              acc[field] = true;
              return acc;
            }, {} as any)
          : undefined;

        // Build orderBy clause
        const order = orderBy ? { [orderBy.field]: orderBy.direction } : undefined;

        // Execute the query based on entity type
        switch (entity) {
          case 'dialects':
            result = await prisma.dialect.findMany({
              where,
              select,
              take: limit,
              skip: offset,
              orderBy: order,
            });
            break;

          case 'terms':
            result = await prisma.term.findMany({
              where,
              select,
              take: limit,
              skip: offset,
              orderBy: order,
            });
            break;

          case 'translations':
            result = await prisma.translation.findMany({
              where,
              select,
              take: limit,
              skip: offset,
              orderBy: order,
            });
            break;

          case 'artifacts':
            result = await prisma.artifact.findMany({
              where,
              select,
              take: limit,
              skip: offset,
              orderBy: order,
            });
            break;

          default:
            return reply.status(400).send({ error: 'Invalid entity type' });
        }

        return reply.send({
          entity,
          count: result.length,
          data: result,
        });
      } catch (error: any) {
        app.log.error({ error }, 'Query execution error');
        return reply.status(400).send({
          error: 'Query execution failed',
          message: error.message,
        });
      }
    },
  });

  // Query builder helper endpoint
  app.get('/help', {
    schema: {
      description: 'Get help and examples for using the query endpoint',
      tags: ['Query'],
    },
    handler: async (_request, reply) => {
      return reply.send({
        description: 'Safe parameterized query endpoint for dbRosetta entities',
        entities: ['dialects', 'terms', 'translations', 'artifacts'],
        examples: [
          {
            description: 'Get all active dialects',
            request: {
              entity: 'dialects',
              filters: { isActive: true },
              limit: 10,
            },
          },
          {
            description: 'Search terms by category',
            request: {
              entity: 'terms',
              filters: { category: 'DDL' },
              fields: ['id', 'canonicalTerm', 'description'],
              orderBy: { field: 'canonicalTerm', direction: 'asc' },
            },
          },
          {
            description: 'Get translations for a specific term',
            request: {
              entity: 'translations',
              filters: { termId: 1 },
              limit: 20,
            },
          },
        ],
      });
    },
  });
}
