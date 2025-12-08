import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import authRoutes from './auth';
import dialectsRoutes from './dialects';
import termsRoutes from './terms';
import translationsRoutes from './translations';
import artifactsRoutes from './artifacts';
import queryRoutes from './query';
import schemaRoutes from './schema';
import metricsRoutes from './metrics';

export default async function v1Routes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Register all v1 routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(dialectsRoutes, { prefix: '/dialects' });
  await app.register(termsRoutes, { prefix: '/terms' });
  await app.register(translationsRoutes, { prefix: '/translations' });
  await app.register(artifactsRoutes, { prefix: '/artifacts' });
  await app.register(queryRoutes, { prefix: '/query' });
  await app.register(schemaRoutes, { prefix: '/schema' });
  await app.register(metricsRoutes, { prefix: '/metrics' });
}
