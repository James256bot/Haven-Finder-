import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Configuration (direct, no external config package)
const config = {
  PORT: Number(process.env.PORT || 8000),
  HOST: process.env.HOST || '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder',
  JWT_SECRET: process.env.JWT_SECRET || 'termux-development-secret-key-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'termux-refresh-secret-key-32-chars',
};

// Database
const pool = new Pool({ connectionString: config.DATABASE_URL, min: 1, max: 5 });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

// Express app
const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ───────────────────────────
app.get('/api/v1/health', async (_req, res) => {
  try {
    await sql`SELECT 1`.execute(db);
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

// ─── Auth: Register ─────────────────────────
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
    }

    const existing = await db.selectFrom('users').select('id').where('email', '=', email.toLowerCase()).executeTakeFirst();
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered' } });
    }

    const hash = await bcrypt.hash(password, 10);
    const [user] = await db.insertInto('users').values({
      email: email.toLowerCase(), password_hash: hash, full_name: fullName, role: 'user',
    }).returning(['id', 'email', 'full_name', 'role', 'email_verified', 'created_at']).execute();

    const accessToken = jwt.sign({ sub: user.id, role: user.role, type: 'access' }, config.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4(), type: 'refresh' }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await db.insertInto('refresh_tokens').values({
      user_id: user.id, token: refreshToken, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).execute();

    res.status(201).json({ success: true, data: { user, tokens: { accessToken, refreshToken } } });
  } catch (err: any) {
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Auth: Login ────────────────────────────
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
    }

    const user = await db.selectFrom('users').selectAll().where('email', '=', email.toLowerCase()).executeTakeFirst();
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    await db.updateTable('users').set({ last_login_at: new Date().toISOString() }).where('id', '=', user.id).execute();

    const accessToken = jwt.sign({ sub: user.id, role: user.role, type: 'access' }, config.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4(), type: 'refresh' }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await db.insertInto('refresh_tokens').values({
      user_id: user.id, token: refreshToken, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).execute();

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, tokens: { accessToken, refreshToken } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Listings ───────────────────────────────
app.get('/api/v1/listings', async (req, res) => {
  try {
    const { city, type, bedrooms, minPrice, maxPrice } = req.query;
    let query = db.selectFrom('listings').selectAll().where('status', '=', 'published');
    if (city) query = query.where('city', '=', String(city));
    if (type) query = query.where('type', '=', String(type));
    if (bedrooms) query = query.where('bedrooms', '>=', Number(bedrooms));
    if (minPrice) query = query.where('price', '>=', Number(minPrice));
    if (maxPrice) query = query.where('price', '<=', Number(maxPrice));

    const listings = await query.orderBy('created_at', 'desc').limit(50).execute();
    res.json({ success: true, data: listings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const listing = await db.selectFrom('listings').selectAll().where('id', '=', req.params.id).executeTakeFirst();
    if (!listing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    const images = await db.selectFrom('listing_images').selectAll().where('listing_id', '=', req.params.id).execute();
    res.json({ success: true, data: { ...listing, images } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.post('/api/v1/listings', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }
    const payload = jwt.verify(authHeader.split(' ')[1], config.JWT_SECRET) as { sub: string };

    const { title, description, type, price, city, bedrooms } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title required' } });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const [listing] = await db.insertInto('listings').values({
      user_id: payload.sub, title, slug, description: description || null,
      type: type || 'property', status: 'published', price: price || null,
      city: city || null, bedrooms: bedrooms || null, published_at: new Date().toISOString(),
    }).returning('*').execute();

    res.status(201).json({ success: true, data: listing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Reviews ────────────────────────────────
app.get('/api/v1/reviews/listing/:id', async (req, res) => {
  try {
    const reviews = await db.selectFrom('reviews').selectAll().where('listing_id', '=', req.params.id).orderBy('created_at', 'desc').execute();
    res.json({ success: true, data: reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── 404 ────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ─── Start Server ───────────────────────────
app.listen(config.PORT, config.HOST, () => {
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  🚀 HavenFinder API Server');
  console.log('══════════════════════════════════════════');
  console.log(`  📡 URL:    http://${config.HOST}:${config.PORT}`);
  console.log(`  ❤️  Health: http://${config.HOST}:${config.PORT}/api/v1/health`);
  console.log('══════════════════════════════════════════');
  console.log('');
});
