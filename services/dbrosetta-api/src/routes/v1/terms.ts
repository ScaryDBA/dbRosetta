import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function termsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/', {
    schema: {
      description: 'List all canonical terms',
      tags: ['Terms'],
    },
    handler: async (_request, _reply) => {
      // TODO: Implement terms listing
      return { message: 'Terms endpoint - coming soon' };
    },
  });
}
