import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function dialectsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/', {
    schema: {
      description: 'List all SQL dialects',
      tags: ['Dialects'],
    },
    handler: async (_request, _reply) => {
      // TODO: Implement dialects listing
      return { message: 'Dialects endpoint - coming soon' };
    },
  });
}
