import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';

interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  indexed?: boolean;
  relation?: string;
}

interface EntitySchema {
  entity: string;
  description: string;
  fields: FieldInfo[];
  relations: string[];
}

export default async function schemaRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Get full schema overview
  app.get('/', {
    schema: {
      description: 'Get database schema information for all entities',
      tags: ['Schema'],
    },
    handler: async (_request, reply) => {
      const schemaInfo: EntitySchema[] = [
        {
          entity: 'dialects',
          description: 'SQL dialects (PostgreSQL, MySQL, Oracle, SQL Server, etc.)',
          fields: [
            { name: 'id', type: 'integer', required: true, unique: true, indexed: true },
            { name: 'name', type: 'string', required: true, unique: true, indexed: true },
            { name: 'displayName', type: 'string', required: true },
            { name: 'version', type: 'string', required: false },
            { name: 'description', type: 'text', required: false },
            { name: 'isActive', type: 'boolean', required: true },
            { name: 'metadata', type: 'jsonb', required: false },
            { name: 'createdAt', type: 'timestamp', required: true },
            { name: 'updatedAt', type: 'timestamp', required: true },
          ],
          relations: ['translations', 'sourceArtifacts', 'targetArtifacts'],
        },
        {
          entity: 'terms',
          description: 'Canonical SQL terms in standard SQL format',
          fields: [
            { name: 'id', type: 'integer', required: true, unique: true, indexed: true },
            { name: 'canonicalTerm', type: 'string', required: true },
            { name: 'category', type: 'string', required: true, indexed: true },
            { name: 'subcategory', type: 'string', required: false },
            { name: 'description', type: 'text', required: true },
            { name: 'usageContext', type: 'text', required: false },
            { name: 'isActive', type: 'boolean', required: true },
            { name: 'metadata', type: 'jsonb', required: false },
            { name: 'createdAt', type: 'timestamp', required: true },
            { name: 'updatedAt', type: 'timestamp', required: true },
          ],
          relations: ['translations'],
        },
        {
          entity: 'translations',
          description: 'Translations of canonical terms into specific SQL dialects',
          fields: [
            { name: 'id', type: 'integer', required: true, unique: true, indexed: true },
            { name: 'termId', type: 'integer', required: true, indexed: true, relation: 'term' },
            {
              name: 'dialectId',
              type: 'integer',
              required: true,
              indexed: true,
              relation: 'dialect',
            },
            { name: 'translatedTerm', type: 'string', required: true },
            { name: 'syntaxPattern', type: 'text', required: false },
            { name: 'examples', type: 'text', required: false },
            { name: 'notes', type: 'text', required: false },
            { name: 'confidenceLevel', type: 'integer', required: true },
            { name: 'isActive', type: 'boolean', required: true },
            { name: 'metadata', type: 'jsonb', required: false },
            { name: 'createdAt', type: 'timestamp', required: true },
            { name: 'updatedAt', type: 'timestamp', required: true },
          ],
          relations: ['term', 'dialect'],
        },
        {
          entity: 'artifacts',
          description: 'Complete SQL code artifacts (queries, procedures, functions, etc.)',
          fields: [
            { name: 'id', type: 'integer', required: true, unique: true, indexed: true },
            { name: 'name', type: 'string', required: true },
            { name: 'artifactType', type: 'string', required: true, indexed: true },
            {
              name: 'sourceDialectId',
              type: 'integer',
              required: false,
              indexed: true,
              relation: 'sourceDialect',
            },
            {
              name: 'targetDialectId',
              type: 'integer',
              required: false,
              indexed: true,
              relation: 'targetDialect',
            },
            { name: 'originalSql', type: 'text', required: false },
            { name: 'translatedSql', type: 'text', required: false },
            { name: 'translationSummary', type: 'text', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'metadata', type: 'jsonb', required: false },
            { name: 'createdAt', type: 'timestamp', required: true },
            { name: 'updatedAt', type: 'timestamp', required: true },
          ],
          relations: ['sourceDialect', 'targetDialect'],
        },
      ];

      return reply.send({
        version: '1.0',
        schema: 'dbrosetta',
        entities: schemaInfo,
      });
    },
  });

  // Get schema for specific entity
  app.get<{ Params: { entity: string } }>('/:entity', {
    schema: {
      description: 'Get schema information for a specific entity',
      tags: ['Schema'],
      params: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            enum: ['dialects', 'terms', 'translations', 'artifacts'],
          },
        },
        required: ['entity'],
      },
    },
    handler: async (request, reply) => {
      const { entity } = request.params;

      // Get sample data to show structure
      let sample: any = null;
      let count = 0;

      try {
        switch (entity) {
          case 'dialects':
            [sample, count] = await Promise.all([
              prisma.dialect.findFirst(),
              prisma.dialect.count(),
            ]);
            break;
          case 'terms':
            [sample, count] = await Promise.all([prisma.term.findFirst(), prisma.term.count()]);
            break;
          case 'translations':
            [sample, count] = await Promise.all([
              prisma.translation.findFirst({ include: { term: true, dialect: true } }),
              prisma.translation.count(),
            ]);
            break;
          case 'artifacts':
            [sample, count] = await Promise.all([
              prisma.artifact.findFirst({ include: { sourceDialect: true, targetDialect: true } }),
              prisma.artifact.count(),
            ]);
            break;
          default:
            return reply.status(400).send({ error: 'Invalid entity type' });
        }

        return reply.send({
          entity,
          count,
          sample: sample || null,
          fields: sample ? Object.keys(sample) : [],
        });
      } catch (error: any) {
        app.log.error({ error }, 'Schema introspection error');
        return reply.status(500).send({
          error: 'Schema introspection failed',
          message: error.message,
        });
      }
    },
  });

  // Get statistics for all entities
  app.get('/stats/overview', {
    schema: {
      description: 'Get statistics and counts for all entities',
      tags: ['Schema'],
    },
    handler: async (_request, reply) => {
      try {
        const [dialectCount, termCount, translationCount, artifactCount] = await Promise.all([
          prisma.dialect.count(),
          prisma.term.count(),
          prisma.translation.count(),
          prisma.artifact.count(),
        ]);

        const [activeDialects, activeTerms, activeTranslations] = await Promise.all([
          prisma.dialect.count({ where: { isActive: true } }),
          prisma.term.count({ where: { isActive: true } }),
          prisma.translation.count({ where: { isActive: true } }),
        ]);

        return reply.send({
          totals: {
            dialects: dialectCount,
            terms: termCount,
            translations: translationCount,
            artifacts: artifactCount,
          },
          active: {
            dialects: activeDialects,
            terms: activeTerms,
            translations: activeTranslations,
          },
          percentageActive: {
            dialects: dialectCount > 0 ? ((activeDialects / dialectCount) * 100).toFixed(1) : 0,
            terms: termCount > 0 ? ((activeTerms / termCount) * 100).toFixed(1) : 0,
            translations:
              translationCount > 0 ? ((activeTranslations / translationCount) * 100).toFixed(1) : 0,
          },
        });
      } catch (error: any) {
        app.log.error({ error }, 'Statistics error');
        return reply.status(500).send({
          error: 'Failed to retrieve statistics',
          message: error.message,
        });
      }
    },
  });
}
