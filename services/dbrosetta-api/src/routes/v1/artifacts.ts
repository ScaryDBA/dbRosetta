import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import {
  artifactSchema,
  artifactUpdateSchema,
  artifactFilterSchema,
  paginationSchema,
  PaginatedResponse,
} from '../../schemas';
import { authenticateRequest, requireAdmin } from '../../middleware/auth';

export default async function artifactsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // List artifacts with pagination and filtering
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      artifactType?: string;
      status?: string;
      sourceDialectId?: string;
      targetDialectId?: string;
      search?: string;
    };
  }>('/', {
    schema: {
      description: 'List all code artifacts with pagination and filtering',
      tags: ['Artifacts'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '10' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          artifactType: { type: 'string' },
          status: { type: 'string' },
          sourceDialectId: { type: 'string' },
          targetDialectId: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = artifactFilterSchema.parse(request.query);

      const where: any = {};
      if (filters.artifactType) {
        where.artifactType = filters.artifactType;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.sourceDialectId) {
        where.sourceDialectId = filters.sourceDialectId;
      }
      if (filters.targetDialectId) {
        where.targetDialectId = filters.targetDialectId;
      }
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { translationSummary: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [total, data] = await Promise.all([
        prisma.artifact.count({ where }),
        prisma.artifact.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: pagination.sortBy
            ? { [pagination.sortBy]: pagination.sortOrder }
            : { id: 'asc' },
          include: {
            sourceDialect: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
            targetDialect: {
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

  // Get single artifact by ID
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Get a specific artifact by ID',
      tags: ['Artifacts'],
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

      const artifact = await prisma.artifact.findUnique({
        where: { id },
        include: {
          sourceDialect: true,
          targetDialect: true,
        },
      });

      if (!artifact) {
        return reply.status(404).send({ error: 'Artifact not found' });
      }

      return reply.send(artifact);
    },
  });

  // Create new artifact
  app.post<{ Body: unknown }>('/', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Create a new code artifact',
      tags: ['Artifacts'],
      body: {
        type: 'object',
        required: ['name', 'artifactType'],
        properties: {
          name: { type: 'string' },
          artifactType: { type: 'string' },
          sourceDialectId: { type: 'number' },
          targetDialectId: { type: 'number' },
          originalSql: { type: 'string' },
          translatedSql: { type: 'string' },
          translationSummary: { type: 'string' },
          status: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = artifactSchema.parse(request.body);

      // Verify dialects exist if provided
      if (data.sourceDialectId) {
        const dialect = await prisma.dialect.findUnique({
          where: { id: data.sourceDialectId },
        });
        if (!dialect) {
          return reply.status(404).send({ error: 'Source dialect not found' });
        }
      }
      if (data.targetDialectId) {
        const dialect = await prisma.dialect.findUnique({
          where: { id: data.targetDialectId },
        });
        if (!dialect) {
          return reply.status(404).send({ error: 'Target dialect not found' });
        }
      }

      const artifact = await prisma.artifact.create({
        data: {
          ...data,
          metadata: data.metadata as any,
        },
        include: {
          sourceDialect: true,
          targetDialect: true,
        },
      });

      return reply.status(201).send(artifact);
    },
  });

  // Update artifact
  app.patch<{ Params: { id: string }; Body: unknown }>('/:id', {
    schema: {
      description: 'Update an existing artifact',
      tags: ['Artifacts'],
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

      const data = artifactUpdateSchema.parse(request.body);

      const existing = await prisma.artifact.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Artifact not found' });
      }

      // Verify dialects if they're being changed
      if (data.sourceDialectId) {
        const dialect = await prisma.dialect.findUnique({
          where: { id: data.sourceDialectId },
        });
        if (!dialect) {
          return reply.status(404).send({ error: 'Source dialect not found' });
        }
      }
      if (data.targetDialectId) {
        const dialect = await prisma.dialect.findUnique({
          where: { id: data.targetDialectId },
        });
        if (!dialect) {
          return reply.status(404).send({ error: 'Target dialect not found' });
        }
      }

      const artifact = await prisma.artifact.update({
        where: { id },
        data: {
          ...data,
          metadata: data.metadata as any,
        },
        include: {
          sourceDialect: true,
          targetDialect: true,
        },
      });

      return reply.send(artifact);
    },
  });

  // Delete artifact
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Delete an artifact (hard delete)',
      tags: ['Artifacts'],
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

      await prisma.artifact.delete({
        where: { id },
      });

      return reply.send({ message: 'Artifact deleted successfully' });
    },
  });
}
