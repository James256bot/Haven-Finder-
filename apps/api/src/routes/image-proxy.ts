import type { FastifyPluginAsync } from 'fastify';

const ALLOWED = new Set([
  'pictures-uganda.jijistatic.com',
  'pictures-ke.jijistatic.com',
  'pictures-ng.jijistatic.com',
  'api.untera.io',
  'images.untera.io',
  'untera.io',
]);

const route: FastifyPluginAsync = async (app) => {
  app.get('/img', async (req, reply) => {
    const url = (req.query as any).url as string | undefined;
    if (!url) return reply.code(400).send({ error: 'Missing url' });

    let parsed: URL;
    try { parsed = new URL(url); }
    catch { return reply.code(400).send({ error: 'Invalid url' }); }

    if (!ALLOWED.has(parsed.hostname)) {
      return reply.code(403).send({ error: 'Host not allowed' });
    }

    try {
      const upstream = await fetch(url, {
        headers: {
          'Referer': parsed.hostname.includes('jiji') ? 'https://jiji.ug/' : 'https://untera.io/',
          'User-Agent': 'Mozilla/5.0 (compatible; HavenFinder/1.0)',
          'Accept': 'image/*',
        },
      });
      if (!upstream.ok) {
        return reply.code(upstream.status).send({ error: 'Upstream failed' });
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      reply.header('Content-Type', upstream.headers.get('content-type') ?? 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.send(buf);
    } catch (e: any) {
      return reply.code(502).send({ error: 'Fetch failed' });
    }
  });
};

export default route;
