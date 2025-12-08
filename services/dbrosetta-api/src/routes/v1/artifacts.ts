import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function artifactsRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/', {
    schema: {
      description: 'List all artifacts',
      tags: ['Artifacts'],
    },
    handler: async (_request, _reply) => {
      // TODO: Implement artifacts listing
      return { message: 'Artifacts endpoint - coming soon' };
    },
  });
}
