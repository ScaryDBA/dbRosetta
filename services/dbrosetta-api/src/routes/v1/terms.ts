import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import {
  termSchema,
  termUpdateSchema,
  termFilterSchema,
  paginationSchema,
  PaginatedResponse,
} from '../../schemas';
import { authenticateRequest, requireAdmin } from '../../middleware/auth';

export default async function termsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // List terms with pagination and filtering
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      category?: string;
      subcategory?: string;
      isActive?: string;
      search?: string;
    };
  }>('/', {
    schema: {
      description: 'List all canonical terms with pagination and filtering',
      tags: ['Terms'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '10' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          isActive: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = termFilterSchema.parse(request.query);

      const where: any = {};
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.subcategory) {
        where.subcategory = filters.subcategory;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters.search) {
        where.OR = [
          { canonicalTerm: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [total, data] = await Promise.all([
        prisma.term.count({ where }),
        prisma.term.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: pagination.sortBy
            ? { [pagination.sortBy]: pagination.sortOrder }
            : { id: 'asc' },
        }),
      ]);

      const response: PaginatedResponse<typeof data[0]> = {
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

  // Get single term by ID
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Get a specific term by ID',
      tags: ['Terms'],
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

      const term = await prisma.term.findUnique({
        where: { id },
        include: {
          translations: {
            include: {
              dialect: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });

      if (!term) {
        return reply.status(404).send({ error: 'Term not found' });
      }

      return reply.send(term);
    },
  });

  // Create new term
  app.post<{ Body: unknown }>('/', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Create a new canonical term',
      tags: ['Terms'],
      body: {
        type: 'object',
        required: ['canonicalTerm', 'category', 'description'],
        properties: {
          canonicalTerm: { type: 'string' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          description: { type: 'string' },
          usageContext: { type: 'string' },
          isActive: { type: 'boolean' },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = termSchema.parse(request.body);

      const term = await prisma.term.create({
        data: {
          ...data,
          metadata: data.metadata as any,
        },
      });

      return reply.status(201).send(term);
    },
  });

  // Update term
  app.patch<{ Params: { id: string }; Body: unknown }>('/:id', {
    schema: {
      description: 'Update an existing term',
      tags: ['Terms'],
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

      const data = termUpdateSchema.parse(request.body);

      const existing = await prisma.term.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Term not found' });
      }

      const term = await prisma.term.update({
        where: { id },
        data: {
          ...data,
          metadata: data.metadata as any,
        },
      });

      return reply.send(term);
    },
  });

  // Delete term
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Delete a term (soft delete by setting isActive=false)',
      tags: ['Terms'],
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

      const term = await prisma.term.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({ message: 'Term deactivated successfully', term });
    },
  });
}
