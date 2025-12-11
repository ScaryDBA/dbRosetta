import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../database/prisma';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
}

export default async function healthRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            database: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                status: { type: 'string' },
                responseTime: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const startTime = Date.now();
      let dbStatus: 'connected' | 'disconnected' = 'disconnected';
      let responseTime: number | undefined;

      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
        responseTime = Date.now() - startTime;
      } catch (error) {
        app.log.error({ error }, 'Database health check failed');
      }

      const health: HealthCheck = {
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          connected: dbStatus === 'connected',
          status: dbStatus,
          responseTime,
        },
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      return reply.status(statusCode).send(health);
    },
  });

  app.get('/health/liveness', {
    schema: {
      description: 'Kubernetes liveness probe',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      return reply.send({ status: 'alive' });
    },
  });

  app.get('/health/readiness', {
    schema: {
      description: 'Kubernetes readiness probe',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            database: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return reply.send({
          status: 'ready',
          database: { connected: true },
        });
      } catch (error) {
        return reply.status(503).send({
          status: 'not ready',
          database: { connected: false },
        });
      }
    },
  });
}
