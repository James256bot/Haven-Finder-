import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

const plugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'request failed');

    if (err instanceof ZodError) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: err.flatten(),
        },
      });
    }

    const status = (err as any).statusCode ?? 500;
    return reply.code(status).send({
      success: false,
      error: {
        code: (err as any).code ?? 'INTERNAL_ERROR',
        message: status >= 500 ? 'Internal server error' : err.message,
      },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found` },
    });
  });
};

export default fp(plugin, { name: 'errors' });
