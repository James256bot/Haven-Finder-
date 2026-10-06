import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken, type AccessClaims } from '../services/tokens';

declare module 'fastify' {
  interface FastifyRequest { user?: AccessClaims }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token' },
      });
    }
    try {
      req.user = await verifyAccessToken(header.slice(7));
    } catch {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }
  });

  app.decorate('requireRole', (...roles: string[]) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' },
        });
      }
      if (!roles.includes(req.user.role)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        });
      }
    });
};

export default fp(plugin, { name: 'auth' });
