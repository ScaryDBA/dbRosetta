import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function translationsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/', {
    schema: {
      description: 'List all translations',
      tags: ['Translations'],
    },
    handler: async (_request, _reply) => {
      // TODO: Implement translations listing
      return { message: 'Translations endpoint - coming soon' };
    },
  });
}
