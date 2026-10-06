import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'node:path';
import { config } from './config';
import errorsPlugin from './plugins/errors';
import cacheControlPlugin from './plugins/cache-control';
import xmlParserPlugin from './plugins/xml-parser';
import authPlugin from './plugins/auth';
import healthRoute from './routes/health';
import authRoute from './routes/auth';
import mapRoute from './routes/map';
import listingsRoute from './routes/listings';
import locationsRoute from './routes/locations';
import kccaRoute from './routes/kcca';
import imageProxyRoute from './routes/image-proxy';
import viewingsRoute from './routes/viewings';
import favoritesRoute from './routes/favorites';
import ownerListingsRoute from './routes/owner-listings';
import messagingRoute from './routes/messaging';
import revenueRoute from './routes/revenue';
import webhooksRoute from './routes/webhooks';
import marketingRoute from './routes/marketing';
import adminRoute from './routes/admin';

async function main() {
  const app = Fastify({
    logger: {
      level: config.env === 'production' ? 'info' : 'debug',
      transport: config.env === 'production' ? undefined : { target: 'pino-pretty' },
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
  });

  await app.register(errorsPlugin);
  await app.register(cacheControlPlugin);
  await app.register(xmlParserPlugin);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.env === 'production' ? ['https://havenfinder.com'] : true,
    credentials: true,
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(authPlugin);
  await app.register(healthRoute);
  await app.register(authRoute);
  await app.register(mapRoute);
  await app.register(listingsRoute);
  await app.register(locationsRoute);
  await app.register(kccaRoute);
  await app.register(imageProxyRoute);
  await app.register(viewingsRoute);
  await app.register(favoritesRoute);
  await app.register(ownerListingsRoute);
  await app.register(messagingRoute);
  await app.register(revenueRoute);
  await app.register(webhooksRoute);
  await app.register(marketingRoute);
  await app.register(adminRoute);

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`HavenFinder API listening on http://localhost:${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
