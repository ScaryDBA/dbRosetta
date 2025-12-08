import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { getConfig, loadConfig } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import healthRoutes from './routes/health';
import v1Routes from './routes/v1';

// Load configuration
loadConfig();
const config = getConfig();

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIMEWINDOW,
  });

  // OpenAPI / Swagger documentation
  if (config.ENABLE_SWAGGER) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'dbRosetta API',
          description: 'Secure REST API for dbRosetta PostgreSQL data access',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // Register routes
  await app.register(healthRoutes);
  await app.register(v1Routes, { prefix: '/v1' });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({ error, reqId: request.id }, 'Request error');
    
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    reply.status(statusCode).send({
      error: error.name || 'Error',
      message,
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  return app;
}

export async function startServer(): Promise<FastifyInstance> {
  try {
    // Connect to database
    await connectDatabase();

    // Build and start app
    const app = await buildApp();
    await app.listen({ port: config.PORT, host: config.HOST });

    logger.info(
      `🚀 Server running at http://${config.HOST}:${config.PORT}`
    );
    
    if (config.ENABLE_SWAGGER) {
      logger.info(
        `📚 API Documentation available at http://${config.HOST}:${config.PORT}/docs`
      );
    }

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        await app.close();
        await disconnectDatabase();
        process.exit(0);
      });
    });

    return app;
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}
