import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function schemaRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/', {
    schema: {
      description: 'Get schema information',
      tags: ['Schema'],
    },
    handler: async (_request, _reply) => {
      // TODO: Implement schema introspection
      return { message: 'Schema endpoint - coming soon' };
    },
  });
}
