// HavenFinder Production Server
// Complete with auth, listings, marketing, AI, and error handling

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ═══ Configuration ═══
const CONFIG = {
  PORT: Number(process.env.PORT || 8000),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder',
  JWT_SECRET: process.env.JWT_SECRET || 'havenfinder-prod-secret-key-minimum-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'havenfinder-refresh-prod-secret-32-chars',
  CORS_ORIGINS: ['http://127.0.0.1:3000', 'http://localhost:3000', '*'],
};

// ═══ Database ═══
const pool = new Pool({ connectionString: CONFIG.DATABASE_URL, min: 2, max: 20 });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

// ═══ Express App ═══
const app = express();

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: CONFIG.CORS_ORIGINS, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ═══ Types ═══
const LISTING_COLUMNS = ['id','user_id','title','slug','description','type','status','price','currency','city','state','country','bedrooms','bathrooms','square_feet','property_type','view_count','favorite_count','average_rating','review_count','main_image_url','latitude','longitude','created_at','updated_at','published_at'];
const USER_COLUMNS = ['id','email','full_name','avatar_url','email_verified','role','is_active','created_at'];

// ═══ Auth Middleware ═══
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  try {
    const payload = jwt.verify(authHeader.split(' ')[1], CONFIG.JWT_SECRET) as any;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    next();
  };
}

// ═══ Health Check ═══
app.get('/api/v1/health', async (_req, res) => {
  try {
    await sql`SELECT 1`.execute(db);
    res.json({ status: 'healthy', database: 'connected', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

// ═══ Auth Routes ═══
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
    }
    const existing = await db.selectFrom('users').select('id').where('email','=',email.toLowerCase()).executeTakeFirst();
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered' } });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await db.insertInto('users').values({
      email: email.toLowerCase(), password_hash: hash, full_name: fullName, role: 'user'
    }).returning(USER_COLUMNS).execute();
    const user = Array.isArray(result) ? result[0] : result;
    const accessToken = jwt.sign({ sub: user.id, role: user.role, type: 'access' }, CONFIG.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4(), type: 'refresh' }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, data: { user, tokens: { accessToken, refreshToken } } });
  } catch (err: any) {
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
    }
    const user = await db.selectFrom('users').selectAll().where('email','=',email.toLowerCase()).executeTakeFirst();
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const accessToken = jwt.sign({ sub: user.id, role: user.role, type: 'access' }, CONFIG.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4(), type: 'refresh' }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const safe = { id: user.id, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url, email_verified: user.email_verified, role: user.role, created_at: user.created_at };
    res.json({ success: true, data: { user: safe, tokens: { accessToken, refreshToken } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
  }
});

app.post('/api/v1/auth/logout', authenticate, async (req: any, res) => {
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

// ═══ User Routes ═══
app.get('/api/v1/users/me', authenticate, async (req: any, res) => {
  try {
    const user = await db.selectFrom('users').select(USER_COLUMNS).where('id','=',req.user.id).executeTakeFirst();
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ Listing Routes ═══
app.get('/api/v1/listings', async (req, res) => {
  try {
    const { city, type, minPrice, maxPrice, bedrooms, country, limit = '50' } = req.query as any;
    let q = db.selectFrom('listings').select(LISTING_COLUMNS).where('status','=','published');
    if (city) q = q.where('city','ilike',`%${city}%`);
    if (type) q = q.where('type','=',String(type));
    if (minPrice) q = q.where('price','>=',Number(minPrice));
    if (maxPrice) q = q.where('price','<=',Number(maxPrice));
    if (bedrooms) q = q.where('bedrooms','>=',Number(bedrooms));
    if (country) q = q.where('country','ilike',`%${country}%`);
    const listings = await q.orderBy('created_at','desc').limit(Number(limit)).execute();
    res.json({ success: true, data: listings, count: listings.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const listing = await db.selectFrom('listings').select(LISTING_COLUMNS).where('id','=',req.params.id).executeTakeFirst();
    if (!listing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    await sql`UPDATE listings SET view_count = view_count + 1 WHERE id = ${req.params.id}`.execute(db);
    res.json({ success: true, data: listing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.post('/api/v1/listings', authenticate, async (req: any, res) => {
  try {
    const { title, description, type, price, city, state, country, bedrooms, bathrooms, square_feet, property_type, main_image_url } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title required' } });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+Date.now().toString(36);
    const result = await db.insertInto('listings').values({
      user_id: req.user.id, title, slug, description, type: type||'property', status: 'published',
      price, city, state, country: country||'US', bedrooms, bathrooms, square_feet, property_type,
      main_image_url, published_at: new Date().toISOString()
    }).returning(LISTING_COLUMNS).execute();
    const listing = Array.isArray(result) ? result[0] : result;
    res.status(201).json({ success: true, data: listing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.put('/api/v1/listings/:id', authenticate, async (req: any, res) => {
  try {
    const existing = await db.selectFrom('listings').select('user_id').where('id','=',req.params.id).executeTakeFirst();
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    const upd: any = {};
    if (req.body.title) upd.title = req.body.title;
    if (req.body.price !== undefined) upd.price = req.body.price;
    if (req.body.description !== undefined) upd.description = req.body.description;
    if (req.body.status) upd.status = req.body.status;
    await db.updateTable('listings').set(upd).where('id','=',req.params.id).execute();
    const updated = await db.selectFrom('listings').select(LISTING_COLUMNS).where('id','=',req.params.id).executeTakeFirst();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.delete('/api/v1/listings/:id', authenticate, async (req: any, res) => {
  try {
    const existing = await db.selectFrom('listings').select('user_id').where('id','=',req.params.id).executeTakeFirst();
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    await db.updateTable('listings').set({ status: 'archived' }).where('id','=',req.params.id).execute();
    res.json({ success: true, data: { message: 'Listing deleted' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ Favorites ═══
app.post('/api/v1/listings/:id/favorite', authenticate, async (req: any, res) => {
  try {
    const existing = await db.selectFrom('favorites').select('listing_id').where('user_id','=',req.user.id).where('listing_id','=',req.params.id).executeTakeFirst();
    if (existing) {
      await db.deleteFrom('favorites').where('user_id','=',req.user.id).where('listing_id','=',req.params.id).execute();
      return res.json({ success: true, data: { isFavorited: false } });
    }
    await db.insertInto('favorites').values({ user_id: req.user.id, listing_id: req.params.id }).execute();
    res.json({ success: true, data: { isFavorited: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/users/me/favorites', authenticate, async (req: any, res) => {
  try {
    const favs = await db.selectFrom('favorites').innerJoin('listings','listings.id','favorites.listing_id').select(LISTING_COLUMNS.map(c=>`listings.${c}`)).where('favorites.user_id','=',req.user.id).execute();
    res.json({ success: true, data: favs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ Stats ═══
app.get('/api/v1/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status','=','published').executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const v = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    const cities = await db.selectFrom('listings').select(sql`count(DISTINCT city)`.as('c')).where('city','is not',null).executeTakeFirst();
    res.json({ success: true, data: { total_listings: Number(l?.c||0), total_users: Number(u?.c||0), total_views: Number(v?.s||0), total_cities: Number(cities?.c||0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ Marketing ═══
app.get('/api/v1/marketing/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status','=','published').executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const v = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    const top = await db.selectFrom('listings').select(['id','title','city','price','view_count','favorite_count','main_image_url']).orderBy('view_count','desc').limit(10).execute();
    const cityStats = await db.selectFrom('listings').select('city').select(sql`count(*)`.as('count')).select(sql`COALESCE(sum(view_count),0)`.as('views')).where('city','is not',null).groupBy('city').orderBy(sql`COALESCE(sum(view_count),0)`,'desc').limit(10).execute();
    res.json({ success: true, data: { overview: { total_listings: Number(l?.c||0), total_users: Number(u?.c||0), total_views: Number(v?.s||0), conversion_rate: '0.00%' }, top_listings: top, city_performance: cityStats } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ AI Routes ═══
app.get('/api/v1/ai/market-analysis', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(['city','price','view_count','type']).where('status','=','published').execute();
    const prices = listings.filter(l => l.price).map(l => Number(l.price));
    const avg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
    const cityMap: Record<string,any> = {};
    listings.forEach(l => { if (!l.city) return; if (!cityMap[l.city]) cityMap[l.city] = { count:0, views:0 }; cityMap[l.city].count++; cityMap[l.city].views += Number(l.view_count||0); });
    const cityAnalysis = Object.entries(cityMap).map(([city,d]:[string,any]) => ({ city, listings: d.count, total_views: d.views, demand: d.views > 50 ? 'High' : d.views > 10 ? 'Medium' : 'Low' })).sort((a,b) => b.total_views - a.total_views).slice(0,10);
    const insights = [`Average property price: $${avg.toLocaleString()}`, `Total listings: ${listings.length}`, cityAnalysis[0] ? `Hottest market: ${cityAnalysis[0].city}` : 'No city data'];
    res.json({ success: true, data: { market_summary: { total_properties: listings.length, average_price: avg }, city_analysis: cityAnalysis, ai_insights: insights } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/ai/recommendations', async (req, res) => {
  try {
    const { city, budget } = req.query as any;
    let q = db.selectFrom('listings').select(['id','title','price','city','bedrooms','bathrooms','square_feet','main_image_url','view_count']).where('status','=','published');
    if (city) q = q.where('city','ilike',`%${city}%`);
    if (budget) q = q.where('price','<=',Number(budget));
    const listings = await q.orderBy('view_count','desc').limit(6).execute();
    res.json({ success: true, data: listings.map(l => ({ ...l, reasons: ['Matches your criteria'] })) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/ai/social-posts', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(['id','title','price','city','state','country','bedrooms','bathrooms','square_feet','main_image_url','property_type','view_count']).where('status','=','published').orderBy('view_count','desc').limit(5).execute();
    const posts = listings.map((l, i) => {
      const price = `$${Number(l.price || 0).toLocaleString()}`;
      const location = `${l.city}${l.state ? ', ' + l.state : ''}${l.country ? ', ' + l.country : ''}`;
      const specs = [l.bedrooms ? `${l.bedrooms} bed` : '', l.bathrooms ? `${l.bathrooms} bath` : '', l.square_feet ? `${l.square_feet} sqft` : ''].filter(Boolean).join(' | ');
      return {
        id: l.id, title: l.title, image: l.main_image_url,
        platforms: {
          facebook: `🏠 FOR SALE: ${l.title}\n\n📍 ${location}\n💰 ${price}\n📐 ${specs}\n\n🔗 http://127.0.0.1:3000/property.html?id=${l.id}\n\n#HavenFinder #RealEstate #PropertyForSale`,
          twitter: `🏠 ${l.title} - ${price}\n📍 ${location}\n${specs}\n\n#RealEstate #Property #HavenFinder`,
          whatsapp: `🏠 *${l.title}*\n\n📍 ${location}\n💰 *${price}*\n📐 ${specs}\n\n🔗 http://127.0.0.1:3000/property.html?id=${l.id}`,
          linkedin: `🏢 ${l.title}\n📍 ${location}\n💰 ${price}\n📐 ${specs}\n#RealEstate #PropertyInvestment`,
          instagram: `✨ NEW LISTING ✨\n\n${l.title}\n📍 ${location}\n💰 ${price}\n\n${specs}\n\n#HavenFinder #DreamHome #LuxuryLiving #RealEstate`
        },
        hashtags: '#HavenFinder #RealEstate #PropertyForSale #DreamHome',
        engagement_score: Math.min(100, (l.view_count || 0) * 10 + 20),
      };
    });
    res.json({ success: true, data: posts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/ai/promotional-content', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    res.json({ success: true, data: {
      daily_post: `🏠 Discover your dream home today! We have ${l?.c || 0} properties waiting. #HavenFinder`,
      weekly_promo: `📊 This week: ${l?.c || 0} listings, ${u?.c || 0} users. Find your perfect home!`,
      engagement_prompt: `❓ What's your dream home? A) Apartment 🏢 B) House 🏡 C) Villa 🌊 D) Cabin ⛰️`,
      market_update: `📈 Average property price: $819,085. New listings daily!`
    }});
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/ai/social-analytics', async (_req, res) => {
  try {
    const shares = await db.selectFrom('analytics_events').select(sql`count(*)`.as('c')).where('event_type','=','share').executeTakeFirst();
    const views = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    res.json({ success: true, data: { total_shares: Number(shares?.c||0), estimated_reach: Number(shares?.c||0) * 150, total_property_views: Number(views?.s||0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ Admin Routes ═══
app.get('/api/v1/admin/users', authenticate, requireRole('admin','super_admin'), async (_req: any, res) => {
  try {
    const users = await db.selectFrom('users').select(USER_COLUMNS).orderBy('created_at','desc').limit(100).execute();
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.put('/api/v1/admin/users/:id/ban', authenticate, requireRole('admin','super_admin'), async (req: any, res) => {
  try {
    await db.updateTable('users').set({ is_banned: true }).where('id','=',req.params.id).execute();
    res.json({ success: true, data: { message: 'User banned' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ═══ 404 Handler ═══
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ═══ Error Handler ═══
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
});

// ═══ Start Server ═══
app.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('   🏠 HAVENFINDER PRODUCTION SERVER');
  console.log('══════════════════════════════════════════════');
  console.log(`   📡 URL:    http://${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`   ❤️  Health: http://${CONFIG.HOST}:${CONFIG.PORT}/api/v1/health`);
  console.log(`   🔐 Auth:   /api/v1/auth/login`);
  console.log(`   📋 Listings: /api/v1/listings`);
  console.log(`   📊 Marketing: /api/v1/marketing/stats`);
  console.log(`   🤖 AI:     /api/v1/ai/market-analysis`);
  console.log('══════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
