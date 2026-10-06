import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('onSend', async (req, reply) => {
    if (
      req.url.startsWith('/listings') ||
      req.url.startsWith('/locations') ||
      req.url.startsWith('/kcca')
    ) {
      reply.header('Cache-Control', 'no-store, must-revalidate');
    }
  });
};

export default fp(plugin, { name: 'cache-control' });
