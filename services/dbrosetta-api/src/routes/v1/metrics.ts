import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function metricsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/', {
    schema: {
      description: 'Prometheus metrics',
      tags: ['Metrics'],
    },
    handler: async (_request, _reply) => {
      // TODO: Implement Prometheus metrics
      return { message: 'Metrics endpoint - coming soon' };
    },
  });
}
