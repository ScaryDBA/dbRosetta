import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import {
  translationSchema,
  translationUpdateSchema,
  translationFilterSchema,
  paginationSchema,
  PaginatedResponse,
} from '../../schemas';
import { authenticateRequest, requireAdmin } from '../../middleware/auth';

export default async function translationsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // List translations with pagination and filtering
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      termId?: string;
      dialectId?: string;
      isActive?: string;
      minConfidence?: string;
    };
  }>('/', {
    schema: {
      description: 'List all SQL term translations with pagination and filtering',
      tags: ['Translations'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '10' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          termId: { type: 'string' },
          dialectId: { type: 'string' },
          isActive: { type: 'string' },
          minConfidence: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = translationFilterSchema.parse(request.query);

      const where: any = {};
      if (filters.termId) {
        where.termId = filters.termId;
      }
      if (filters.dialectId) {
        where.dialectId = filters.dialectId;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters.minConfidence) {
        where.confidenceLevel = { gte: filters.minConfidence };
      }

      const [total, data] = await Promise.all([
        prisma.translation.count({ where }),
        prisma.translation.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: pagination.sortBy
            ? { [pagination.sortBy]: pagination.sortOrder }
            : { id: 'asc' },
          include: {
            term: {
              select: {
                id: true,
                canonicalTerm: true,
                category: true,
              },
            },
            dialect: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
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

  // Get single translation by ID
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Get a specific translation by ID',
      tags: ['Translations'],
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

      const translation = await prisma.translation.findUnique({
        where: { id },
        include: {
          term: true,
          dialect: true,
        },
      });

      if (!translation) {
        return reply.status(404).send({ error: 'Translation not found' });
      }

      return reply.send(translation);
    },
  });

  // Create new translation
  app.post<{ Body: unknown }>('/', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Create a new translation',
      tags: ['Translations'],
      body: {
        type: 'object',
        required: ['termId', 'dialectId', 'translatedTerm'],
        properties: {
          termId: { type: 'number' },
          dialectId: { type: 'number' },
          translatedTerm: { type: 'string' },
          syntaxPattern: { type: 'string' },
          examples: { type: 'string' },
          notes: { type: 'string' },
          confidenceLevel: { type: 'number' },
          isActive: { type: 'boolean' },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = translationSchema.parse(request.body);

      // Verify term exists
      const term = await prisma.term.findUnique({ where: { id: data.termId } });
      if (!term) {
        return reply.status(404).send({ error: 'Term not found' });
      }

      // Verify dialect exists
      const dialect = await prisma.dialect.findUnique({ where: { id: data.dialectId } });
      if (!dialect) {
        return reply.status(404).send({ error: 'Dialect not found' });
      }

      const translation = await prisma.translation.create({
        data: {
          ...data,
          metadata: data.metadata as any,
        },
        include: {
          term: true,
          dialect: true,
        },
      });

      return reply.status(201).send(translation);
    },
  });

  // Update translation
  app.patch<{ Params: { id: string }; Body: unknown }>('/:id', {
    schema: {
      description: 'Update an existing translation',
      tags: ['Translations'],
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

      const data = translationUpdateSchema.parse(request.body);

      const existing = await prisma.translation.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Translation not found' });
      }

      // Verify references if they're being changed
      if (data.termId) {
        const term = await prisma.term.findUnique({ where: { id: data.termId } });
        if (!term) {
          return reply.status(404).send({ error: 'Term not found' });
        }
      }
      if (data.dialectId) {
        const dialect = await prisma.dialect.findUnique({ where: { id: data.dialectId } });
        if (!dialect) {
          return reply.status(404).send({ error: 'Dialect not found' });
        }
      }

      const translation = await prisma.translation.update({
        where: { id },
        data: {
          ...data,
          metadata: data.metadata as any,
        },
        include: {
          term: true,
          dialect: true,
        },
      });

      return reply.send(translation);
    },
  });

  // Delete translation
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Delete a translation (soft delete by setting isActive=false)',
      tags: ['Translations'],
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

      const translation = await prisma.translation.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({ message: 'Translation deactivated successfully', translation });
    },
  });
}
