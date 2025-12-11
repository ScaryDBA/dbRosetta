import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../../database/prisma';

export default async function metricsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Prometheus-compatible metrics endpoint
  app.get('/', {
    schema: {
      description: 'Get Prometheus-compatible metrics for monitoring',
      tags: ['Metrics'],
      response: {
        200: {
          type: 'string',
          description: 'Prometheus text format metrics',
        },
      },
    },
    handler: async (_request, reply) => {
      try {
        // Gather metrics from database
        const [
          dialectCount,
          activeDialectCount,
          termCount,
          activeTermCount,
          translationCount,
          activeTranslationCount,
          artifactCount,
        ] = await Promise.all([
          prisma.dialect.count(),
          prisma.dialect.count({ where: { isActive: true } }),
          prisma.term.count(),
          prisma.term.count({ where: { isActive: true } }),
          prisma.translation.count(),
          prisma.translation.count({ where: { isActive: true } }),
          prisma.artifact.count(),
        ]);

        // Get additional metrics
        const termsByCategory = await prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
          SELECT category, COUNT(*) as count
          FROM dbrosetta."Term"
          GROUP BY category
        `;

        const translationsByDialect = await prisma.$queryRaw<
          Array<{ dialect_name: string; count: bigint }>
        >`
          SELECT d.name as dialect_name, COUNT(t.id) as count
          FROM dbrosetta."Translation" t
          JOIN dbrosetta."Dialect" d ON t."dialectId" = d.id
          GROUP BY d.name
        `;

        const artifactsByType = await prisma.$queryRaw<
          Array<{ artifact_type: string; count: bigint }>
        >`
          SELECT "artifactType" as artifact_type, COUNT(*) as count
          FROM dbrosetta."Artifact"
          GROUP BY "artifactType"
        `;

        // Format as Prometheus text format
        const metrics: string[] = [
          '# HELP dbrosetta_dialects_total Total number of SQL dialects',
          '# TYPE dbrosetta_dialects_total gauge',
          `dbrosetta_dialects_total ${dialectCount}`,
          '',
          '# HELP dbrosetta_dialects_active Number of active SQL dialects',
          '# TYPE dbrosetta_dialects_active gauge',
          `dbrosetta_dialects_active ${activeDialectCount}`,
          '',
          '# HELP dbrosetta_terms_total Total number of canonical terms',
          '# TYPE dbrosetta_terms_total gauge',
          `dbrosetta_terms_total ${termCount}`,
          '',
          '# HELP dbrosetta_terms_active Number of active canonical terms',
          '# TYPE dbrosetta_terms_active gauge',
          `dbrosetta_terms_active ${activeTermCount}`,
          '',
          '# HELP dbrosetta_translations_total Total number of translations',
          '# TYPE dbrosetta_translations_total gauge',
          `dbrosetta_translations_total ${translationCount}`,
          '',
          '# HELP dbrosetta_translations_active Number of active translations',
          '# TYPE dbrosetta_translations_active gauge',
          `dbrosetta_translations_active ${activeTranslationCount}`,
          '',
          '# HELP dbrosetta_artifacts_total Total number of code artifacts',
          '# TYPE dbrosetta_artifacts_total gauge',
          `dbrosetta_artifacts_total ${artifactCount}`,
          '',
          '# HELP dbrosetta_terms_by_category Number of terms by category',
          '# TYPE dbrosetta_terms_by_category gauge',
        ];

        termsByCategory.forEach((row) => {
          metrics.push(`dbrosetta_terms_by_category{category="${row.category}"} ${row.count}`);
        });

        metrics.push('');
        metrics.push('# HELP dbrosetta_translations_by_dialect Number of translations by dialect');
        metrics.push('# TYPE dbrosetta_translations_by_dialect gauge');

        translationsByDialect.forEach((row) => {
          metrics.push(
            `dbrosetta_translations_by_dialect{dialect="${row.dialect_name}"} ${row.count}`
          );
        });

        metrics.push('');
        metrics.push('# HELP dbrosetta_artifacts_by_type Number of artifacts by type');
        metrics.push('# TYPE dbrosetta_artifacts_by_type gauge');

        artifactsByType.forEach((row) => {
          metrics.push(`dbrosetta_artifacts_by_type{type="${row.artifact_type}"} ${row.count}`);
        });

        metrics.push('');
        metrics.push('# HELP dbrosetta_database_connected Database connection status');
        metrics.push('# TYPE dbrosetta_database_connected gauge');
        metrics.push(`dbrosetta_database_connected 1`);
        metrics.push('');

        // Return as plain text
        return reply.type('text/plain; version=0.0.4').send(metrics.join('\n'));
      } catch (error: any) {
        app.log.error({ error }, 'Metrics generation error');

        // Return error metric
        const errorMetrics = [
          '# HELP dbrosetta_database_connected Database connection status',
          '# TYPE dbrosetta_database_connected gauge',
          'dbrosetta_database_connected 0',
          '',
        ];

        return reply.type('text/plain; version=0.0.4').send(errorMetrics.join('\n'));
      }
    },
  });

  // JSON format metrics (alternative to Prometheus format)
  app.get('/json', {
    schema: {
      description: 'Get metrics in JSON format',
      tags: ['Metrics'],
    },
    handler: async (_request, reply) => {
      try {
        const [
          dialectCount,
          activeDialectCount,
          termCount,
          activeTermCount,
          translationCount,
          activeTranslationCount,
          artifactCount,
        ] = await Promise.all([
          prisma.dialect.count(),
          prisma.dialect.count({ where: { isActive: true } }),
          prisma.term.count(),
          prisma.term.count({ where: { isActive: true } }),
          prisma.translation.count(),
          prisma.translation.count({ where: { isActive: true } }),
          prisma.artifact.count(),
        ]);

        const termsByCategory = await prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
          SELECT category, COUNT(*) as count
          FROM dbrosetta."Term"
          GROUP BY category
        `;

        const translationsByDialect = await prisma.$queryRaw<
          Array<{ dialect_name: string; count: bigint }>
        >`
          SELECT d.name as dialect_name, COUNT(t.id) as count
          FROM dbrosetta."Translation" t
          JOIN dbrosetta."Dialect" d ON t."dialectId" = d.id
          GROUP BY d.name
        `;

        return reply.send({
          timestamp: new Date().toISOString(),
          database: {
            connected: true,
          },
          counts: {
            dialects: {
              total: dialectCount,
              active: activeDialectCount,
            },
            terms: {
              total: termCount,
              active: activeTermCount,
              byCategory: termsByCategory.map((row) => ({
                category: row.category,
                count: Number(row.count),
              })),
            },
            translations: {
              total: translationCount,
              active: activeTranslationCount,
              byDialect: translationsByDialect.map((row) => ({
                dialect: row.dialect_name,
                count: Number(row.count),
              })),
            },
            artifacts: {
              total: artifactCount,
            },
          },
        });
      } catch (error: any) {
        app.log.error({ error }, 'Metrics generation error');
        return reply.status(500).send({
          timestamp: new Date().toISOString(),
          database: {
            connected: false,
          },
          error: error.message,
        });
      }
    },
  });
}
