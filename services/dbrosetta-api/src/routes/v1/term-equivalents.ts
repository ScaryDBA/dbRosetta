import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import { z } from 'zod';
import { authenticateRequest, requireAdmin } from '../../middleware/auth';

const termEquivalentSchema = z.object({
  platform: z.string().min(1).max(100),
  equivalentTerm: z.string().min(1).max(200),
  notes: z.string().optional(),
});

const termEquivalentUpdateSchema = termEquivalentSchema.partial();

export default async function termEquivalentsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Get all equivalents for a term
  app.get<{ Params: { termId: string } }>('/:termId/equivalents', {
    schema: {
      description: 'Get all platform equivalents for a term',
      tags: ['Term Equivalents'],
      params: {
        type: 'object',
        properties: {
          termId: { type: 'string' },
        },
        required: ['termId'],
      },
    },
    handler: async (request, reply) => {
      const termId = parseInt(request.params.termId, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({ error: 'Invalid term ID' });
      }

      // Verify term exists
      const term = await prisma.term.findUnique({
        where: { id: termId },
      });

      if (!term) {
        return reply.status(404).send({ error: 'Term not found' });
      }

      const equivalents = await prisma.termEquivalent.findMany({
        where: { termId },
        orderBy: { platform: 'asc' },
      });

      return reply.send(equivalents);
    },
  });

  // Create new equivalent for a term
  app.post<{ Params: { termId: string }; Body: unknown }>('/:termId/equivalents', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Add a platform equivalent for a term (requires admin)',
      tags: ['Term Equivalents'],
      params: {
        type: 'object',
        properties: {
          termId: { type: 'string' },
        },
        required: ['termId'],
      },
      body: {
        type: 'object',
        required: ['platform', 'equivalentTerm'],
        properties: {
          platform: { type: 'string' },
          equivalentTerm: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const termId = parseInt(request.params.termId, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({ error: 'Invalid term ID' });
      }

      const data = termEquivalentSchema.parse(request.body);

      // Verify term exists
      const term = await prisma.term.findUnique({
        where: { id: termId },
      });

      if (!term) {
        return reply.status(404).send({ error: 'Term not found' });
      }

      // Check for duplicate platform
      const existing = await prisma.termEquivalent.findUnique({
        where: {
          termId_platform: {
            termId,
            platform: data.platform,
          },
        },
      });

      if (existing) {
        return reply
          .status(409)
          .send({ error: 'Equivalent for this platform already exists' });
      }

      const equivalent = await prisma.termEquivalent.create({
        data: {
          termId,
          ...data,
        },
      });

      return reply.status(201).send(equivalent);
    },
  });

  // Update an equivalent
  app.put<{ Params: { termId: string; id: string }; Body: unknown }>(
    '/:termId/equivalents/:id',
    {
      preHandler: [authenticateRequest, requireAdmin],
      schema: {
        description: 'Update a platform equivalent (requires admin)',
        tags: ['Term Equivalents'],
        params: {
          type: 'object',
          properties: {
            termId: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['termId', 'id'],
        },
        body: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            equivalentTerm: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      handler: async (request, reply) => {
        const termId = parseInt(request.params.termId, 10);
        const id = parseInt(request.params.id, 10);

        if (isNaN(termId) || isNaN(id)) {
          return reply.status(400).send({ error: 'Invalid ID' });
        }

        const data = termEquivalentUpdateSchema.parse(request.body);

        // Verify equivalent exists and belongs to term
        const existing = await prisma.termEquivalent.findFirst({
          where: { id, termId },
        });

        if (!existing) {
          return reply.status(404).send({ error: 'Equivalent not found' });
        }

        // Check for platform conflict if platform is being changed
        if (data.platform && data.platform !== existing.platform) {
          const duplicate = await prisma.termEquivalent.findUnique({
            where: {
              termId_platform: {
                termId,
                platform: data.platform,
              },
            },
          });

          if (duplicate) {
            return reply
              .status(409)
              .send({ error: 'Equivalent for this platform already exists' });
          }
        }

        const equivalent = await prisma.termEquivalent.update({
          where: { id },
          data,
        });

        return reply.send(equivalent);
      },
    }
  );

  // Delete an equivalent
  app.delete<{ Params: { termId: string; id: string } }>('/:termId/equivalents/:id', {
    preHandler: [authenticateRequest, requireAdmin],
    schema: {
      description: 'Delete a platform equivalent (requires admin)',
      tags: ['Term Equivalents'],
      params: {
        type: 'object',
        properties: {
          termId: { type: 'string' },
          id: { type: 'string' },
        },
        required: ['termId', 'id'],
      },
    },
    handler: async (request, reply) => {
      const termId = parseInt(request.params.termId, 10);
      const id = parseInt(request.params.id, 10);

      if (isNaN(termId) || isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid ID' });
      }

      // Verify equivalent exists and belongs to term
      const existing = await prisma.termEquivalent.findFirst({
        where: { id, termId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Equivalent not found' });
      }

      await prisma.termEquivalent.delete({
        where: { id },
      });

      return reply.status(204).send();
    },
  });
}
