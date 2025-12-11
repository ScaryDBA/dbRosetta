import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import {
  dialectSchema,
  dialectUpdateSchema,
  dialectFilterSchema,
  paginationSchema,
  PaginatedResponse,
} from '../../schemas';
import { authenticateRequest, requireAdmin } from '../../middleware/auth';

export default async function dialectsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // List dialects with pagination and filtering
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      name?: string;
      isActive?: string;
    };
  }>('/', {
    schema: {
      description: 'List all SQL dialects with pagination and filtering',
      tags: ['Dialects'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '10' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          name: { type: 'string' },
          isActive: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = dialectFilterSchema.parse(request.query);

      const where: any = {};
      if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [total, data] = await Promise.all([
        prisma.dialect.count({ where }),
        prisma.dialect.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: pagination.sortBy
            ? { [pagination.sortBy]: pagination.sortOrder }
            : { id: 'asc' },
        }),
      ]);

      const response: PaginatedResponse<(typeof data)[0]> = {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };

      return reply.send(response);
    },
  });

  // Get single dialect by ID
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Get a specific dialect by ID',
      tags: ['Dialects'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid ID' });
      }

      const dialect = await prisma.dialect.findUnique({
        where: { id },
        include: {
          translations: {
            take: 10,
            select: {
              id: true,
              translatedTerm: true,
              term: {
                select: {
                  canonicalTerm: true,
                },
              },
            },
          },
        },
      });

      if (!dialect) {
        return reply.status(404).send({ error: 'Dialect not found' });
      }

      return reply.send(dialect);
    },
  });

  // Create new dialect
  app.post<{ Body: unknown }>('/', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Create a new SQL dialect (requires admin)',
      tags: ['Dialects'],
      body: {
        type: 'object',
        required: ['name', 'displayName'],
        properties: {
          name: { type: 'string' },
          displayName: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = dialectSchema.parse(request.body);

      // Check for duplicate name
      const existing = await prisma.dialect.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        return reply.status(409).send({ error: 'Dialect with this name already exists' });
      }

      const dialect = await prisma.dialect.create({
        data: {
          ...data,
          metadata: data.metadata as any,
        },
      });

      return reply.status(201).send(dialect);
    },
  });

  // Update dialect
  app.patch<{ Params: { id: string }; Body: unknown }>('/:id', {
    schema: {
      description: 'Update an existing dialect',
      tags: ['Dialects'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid ID' });
      }

      const data = dialectUpdateSchema.parse(request.body);

      // Check if dialect exists
      const existing = await prisma.dialect.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Dialect not found' });
      }

      // Check for name conflict if name is being changed
      if (data.name && data.name !== existing.name) {
        const duplicate = await prisma.dialect.findUnique({
          where: { name: data.name },
        });
        if (duplicate) {
          return reply.status(409).send({ error: 'Dialect with this name already exists' });
        }
      }

      const dialect = await prisma.dialect.update({
        where: { id },
        data: {
          ...data,
          metadata: data.metadata as any,
        },
      });

      return reply.send(dialect);
    },
  });

  // Delete dialect
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Delete a dialect (soft delete by setting isActive=false, requires admin)',
      tags: ['Dialects'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid ID' });
      }

      // Soft delete by setting isActive to false
      const dialect = await prisma.dialect.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({ message: 'Dialect deactivated successfully', dialect });
    },
  });
}
