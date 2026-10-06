import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const plugin: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    ['application/xml', 'text/xml'],
    { parseAs: 'string' },
    (_req, body, done) => done(null, body),
  );
};

export default fp(plugin, { name: 'xml-parser' });
