import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';
import { z } from 'zod';

const termLookupSchema = z.object({
  term: z.string().trim().min(1),
  sourceDialect: z.string().min(1),
  targetDialects: z.array(z.string().min(1)).optional().default([]),
});

function toDialectOutput(dialect: { id: number; name: string; displayName: string }) {
  return {
    id: dialect.id,
    name: dialect.name,
    displayName: dialect.displayName,
  };
}

export default async function termLookupRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.post<{ Body: unknown }>('/lookup', {
    schema: {
      description:
        'Look up the equivalent term(s) for a database platform term on one or more target platforms',
      tags: ['Term Lookup'],
      body: {
        type: 'object',
        required: ['term', 'sourceDialect'],
        properties: {
          term: { type: 'string' },
          sourceDialect: { type: 'string' },
          targetDialects: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    handler: async (request, reply) => {
      const data = termLookupSchema.parse(request.body);

      const activeDialects = await prisma.dialect.findMany({
        where: { isActive: true },
      });
      const activeDialectsByName = new Map(activeDialects.map((d) => [d.name, d]));

      const invalidValues = [data.sourceDialect, ...data.targetDialects].filter(
        (name) => !activeDialectsByName.has(name)
      );

      if (invalidValues.length > 0) {
        return reply.status(400).send({
          error: 'invalid_dialect',
          message: 'One or more dialect values are not recognized active dialects.',
          invalidValues,
        });
      }

      const sourceDialect = activeDialectsByName.get(data.sourceDialect)!;

      const sourceEquivalent = await prisma.termEquivalent.findFirst({
        where: {
          dialectId: sourceDialect.id,
          equivalentTerm: { equals: data.term, mode: 'insensitive' },
        },
        include: { term: true },
      });

      const matchedTerm =
        sourceEquivalent?.term ??
        (await prisma.term.findFirst({
          where: { canonicalTerm: { equals: data.term, mode: 'insensitive' } },
        }));

      if (!matchedTerm) {
        return reply.status(404).send({
          error: 'not_found',
          message: `No term matching "${data.term}" was found for ${sourceDialect.displayName}.`,
        });
      }

      const sourceEquivalentRow =
        sourceEquivalent ??
        (await prisma.termEquivalent.findFirst({
          where: { termId: matchedTerm.id, dialectId: sourceDialect.id },
        }));

      const matchedEquivalent = {
        dialect: toDialectOutput(sourceDialect),
        equivalentTerm: sourceEquivalentRow?.equivalentTerm ?? matchedTerm.canonicalTerm,
        notes: sourceEquivalentRow?.notes ?? null,
      };

      const targetDialects =
        data.targetDialects.length > 0
          ? activeDialects.filter((d) => data.targetDialects.includes(d.name))
          : activeDialects.filter((d) => d.name !== sourceDialect.name);

      const equivalentRows = await prisma.termEquivalent.findMany({
        where: {
          termId: matchedTerm.id,
          dialectId: { in: targetDialects.map((d) => d.id) },
        },
        include: { dialect: true },
      });

      const results = equivalentRows
        .filter((row) => row.dialect !== null)
        .map((row) => ({
          dialect: toDialectOutput(row.dialect!),
          equivalentTerm: row.equivalentTerm,
          notes: row.notes,
        }))
        .sort((a, b) => a.dialect.displayName.localeCompare(b.dialect.displayName));

      return reply.send({
        term: {
          id: matchedTerm.id,
          canonicalTerm: matchedTerm.canonicalTerm,
          category: matchedTerm.category,
          subcategory: matchedTerm.subcategory,
          description: matchedTerm.description,
        },
        sourceDialect: toDialectOutput(sourceDialect),
        matchedEquivalent,
        results,
      });
    },
  });
}
