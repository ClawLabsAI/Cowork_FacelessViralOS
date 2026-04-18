import Fastify from 'fastify';
import FastifyJWT from '@fastify/jwt';
import FastifyCors from '@fastify/cors';
import FastifyRateLimit from '@fastify/rate-limit';
import FastifyHelmet from '@fastify/helmet';
import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

import { authRoutes } from './routes/auth.js';
import { scriptRoutes } from './routes/scripts.js';

// ==============================================================================
// Bootstrap — Fastify API Server
// ==============================================================================

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

export async function buildServer() {
  const app = Fastify({
    logger:
      NODE_ENV === 'production'
        ? true
        : {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard' },
            },
          },
    trustProxy: true,
    ajv: { customOptions: { coerceTypes: 'array' } },
  });

  // --------------------------------------------------------------------------
  // Plugins
  // --------------------------------------------------------------------------

  await app.register(FastifyHelmet, {
    contentSecurityPolicy: NODE_ENV === 'production',
  });

  await app.register(FastifyCors, {
    origin: NODE_ENV === 'production' ? process.env['ALLOWED_ORIGINS']?.split(',') : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(FastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
    }),
  });

  await app.register(FastifyJWT, {
    secret: JWT_SECRET,
    sign: { expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d' },
  });

  // --------------------------------------------------------------------------
  // Health check
  // --------------------------------------------------------------------------

  app.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
      env: NODE_ENV,
    };
  });

  // --------------------------------------------------------------------------
  // Routes
  // --------------------------------------------------------------------------

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(scriptRoutes, { prefix: '/api/v1/scripts' });

  // --------------------------------------------------------------------------
  // Global error handler
  // --------------------------------------------------------------------------

  app.setErrorHandler(
    (error: FastifyError | ZodError | Error, _request: FastifyRequest, reply: FastifyReply) => {
      // Zod validation errors → 400
      if (error instanceof ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: 'Request validation failed',
          issues: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      // Fastify validation errors → 400
      if ('validation' in error && error.validation) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message,
        });
      }

      // Auth errors → 401
      if (
        error.message?.includes('Unauthorized') ||
        error.message?.includes('invalid signature') ||
        error.message?.includes('jwt expired')
      ) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Not found → 404
      if ('statusCode' in error && error.statusCode === 404) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: error.message,
        });
      }

      // Known status codes from Fastify
      const statusCode = 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

      if (statusCode >= 400 && statusCode < 500) {
        return reply.status(statusCode).send({
          statusCode,
          error: 'Client Error',
          message: error.message,
        });
      }

      // All other errors → 500
      app.log.error({ err: error }, 'Unhandled error');
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
      });
    },
  );

  // 404 handler
  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Route not found',
    });
  });

  return app;
}

// ==============================================================================
// Start server
// ==============================================================================

async function start() {
  const app = await buildServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
