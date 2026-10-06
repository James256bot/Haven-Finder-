// HavenFinder Backend Server
import express from 'express';
import cors from 'cors';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const CONFIG = {
  PORT: 8000,
  HOST: '0.0.0.0',
  DATABASE_URL: 'postgresql://u0_a236@127.0.0.1:5432/havenfinder',
  JWT_SECRET: 'havenfinder-secret-key-minimum-32-chars-long',
  JWT_REFRESH_SECRET: 'havenfinder-refresh-secret-32-chars-long',
};

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL, min: 2, max: 20 });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Auth middleware
function authenticate(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], CONFIG.JWT_SECRET) as any;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

// ═══ HEALTH ═══
app.get('/api/v1/health', async (_req, res) => {
  try {
    await sql`SELECT 1`.execute(db);
    res.json({ status: 'healthy', database: 'connected', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: String(e) });
  }
});

// ═══ AUTH ═══
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ success: false, error: 'Missing fields' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be 8+ chars' });
    const exists = await db.selectFrom('users').select('id').where('email', '=', email.toLowerCase()).executeTakeFirst();
    if (exists) return res.status(409).json({ success: false, error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db.insertInto('users').values({
      email: email.toLowerCase(), password_hash: hash, full_name: fullName, role: 'user'
    }).returning(['id', 'email', 'full_name', 'role', 'email_verified', 'created_at']).execute();
    const accessToken = jwt.sign({ sub: user.id, role: user.role }, CONFIG.JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4() }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, data: { user, tokens: { accessToken, refreshToken } } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
    const user = await db.selectFrom('users').selectAll().where('email', '=', email.toLowerCase()).executeTakeFirst();
    if (!user?.password_hash) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const accessToken = jwt.sign({ sub: user.id, role: user.role }, CONFIG.JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4() }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const safe = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url, email_verified: user.email_verified };
    res.json({ success: true, data: { user: safe, tokens: { accessToken, refreshToken } } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/v1/auth/logout', authenticate, async (_req, res) => {
  res.json({ success: true, data: { message: 'Logged out' } });
});

app.get('/api/v1/users/me', authenticate, async (req: any, res) => {
  try {
    const user = await db.selectFrom('users').select(['id', 'email', 'full_name', 'avatar_url', 'role', 'email_verified', 'created_at']).where('id', '=', req.user.id).executeTakeFirst();
    res.json({ success: true, data: user });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ LISTINGS ═══
app.get('/api/v1/listings', async (req, res) => {
  try {
    const { city, type, minPrice, maxPrice, bedrooms, country, limit = '100' } = req.query as any;
    let q = db.selectFrom('listings').selectAll().where('status', '=', 'published');
    if (city) q = q.where('city', 'ilike', `%${city}%`);
    if (type) q = q.where('type', '=', String(type));
    if (country) q = q.where('country', 'ilike', `%${country}%`);
    if (minPrice) q = q.where('price', '>=', Number(minPrice));
    if (maxPrice) q = q.where('price', '<=', Number(maxPrice));
    if (bedrooms) q = q.where('bedrooms', '>=', Number(bedrooms));
    const listings = await q.orderBy('created_at', 'desc').limit(Number(limit)).execute();
    res.json({ success: true, data: listings, count: listings.length });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const listing = await db.selectFrom('listings').selectAll().where('id', '=', req.params.id).executeTakeFirst();
    if (!listing) return res.status(404).json({ success: false, error: 'Not found' });
    await sql`UPDATE listings SET view_count = view_count + 1 WHERE id = ${req.params.id}`.execute(db);
    res.json({ success: true, data: listing });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/v1/listings', authenticate, async (req: any, res) => {
  try {
    const { title, description, type, price, city, state, country, bedrooms, bathrooms, squareFeet, propertyType, imageUrl } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title required' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const [listing] = await db.insertInto('listings').values({
      user_id: req.user.id, title, slug, description, type: type || 'property', status: 'published',
      price, city, state, country: country || 'USA', bedrooms, bathrooms, square_feet: squareFeet,
      property_type: propertyType, main_image_url: imageUrl, published_at: new Date().toISOString()
    }).returning('*').execute();
    res.status(201).json({ success: true, data: listing });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.put('/api/v1/listings/:id', authenticate, async (req: any, res) => {
  try {
    const existing = await db.selectFrom('listings').select('user_id').where('id', '=', req.params.id).executeTakeFirst();
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Not authorized' });
    const upd: any = {};
    if (req.body.title) upd.title = req.body.title;
    if (req.body.price !== undefined) upd.price = req.body.price;
    if (req.body.description !== undefined) upd.description = req.body.description;
    if (req.body.status) upd.status = req.body.status;
    await db.updateTable('listings').set(upd).where('id', '=', req.params.id).execute();
    const updated = await db.selectFrom('listings').selectAll().where('id', '=', req.params.id).executeTakeFirst();
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/v1/listings/:id', authenticate, async (req: any, res) => {
  try {
    const existing = await db.selectFrom('listings').select('user_id').where('id', '=', req.params.id).executeTakeFirst();
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Not authorized' });
    await db.updateTable('listings').set({ status: 'archived', deleted_at: new Date().toISOString() }).where('id', '=', req.params.id).execute();
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ FAVORITES ═══
app.post('/api/v1/listings/:id/favorite', authenticate, async (req: any, res) => {
  try {
    const ex = await db.selectFrom('favorites').select('listing_id').where('user_id', '=', req.user.id).where('listing_id', '=', req.params.id).executeTakeFirst();
    if (ex) {
      await db.deleteFrom('favorites').where('user_id', '=', req.user.id).where('listing_id', '=', req.params.id).execute();
      return res.json({ success: true, data: { isFavorited: false } });
    }
    await db.insertInto('favorites').values({ user_id: req.user.id, listing_id: req.params.id }).execute();
    res.json({ success: true, data: { isFavorited: true } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/users/me/favorites', authenticate, async (req: any, res) => {
  try {
    const favs = await db.selectFrom('favorites').innerJoin('listings', 'listings.id', 'favorites.listing_id').selectAll('listings').where('favorites.user_id', '=', req.user.id).execute();
    res.json({ success: true, data: favs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ REVIEWS ═══
app.post('/api/v1/reviews', authenticate, async (req: any, res) => {
  try {
    const { listingId, rating, content } = req.body;
    if (!listingId || !rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Invalid review' });
    const [review] = await db.insertInto('reviews').values({
      listing_id: listingId, reviewer_id: req.user.id, rating, content: content || null
    }).returning('*').execute();
    res.status(201).json({ success: true, data: review });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/listings/:id/reviews', async (req, res) => {
  try {
    const reviews = await db.selectFrom('reviews').selectAll().where('listing_id', '=', req.params.id).orderBy('created_at', 'desc').execute();
    res.json({ success: true, data: reviews });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ STATS ═══
app.get('/api/v1/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status', '=', 'published').executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const v = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    const c = await db.selectFrom('listings').select(sql`count(DISTINCT city)`.as('c')).where('city', 'is not', null).executeTakeFirst();
    res.json({ success: true, data: { total_listings: Number(l?.c || 0), total_users: Number(u?.c || 0), total_views: Number(v?.s || 0), total_cities: Number(c?.c || 0) } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/categories', async (_req, res) => {
  try {
    const cats = await db.selectFrom('categories').selectAll().execute();
    res.json({ success: true, data: cats });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ MARKETING ═══
app.get('/api/v1/marketing/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status', '=', 'published').executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const v = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    const top = await db.selectFrom('listings').selectAll().orderBy('view_count', 'desc').limit(10).execute();
    const cities = await db.selectFrom('listings').select('city').select(sql`count(*)`.as('count')).where('city', 'is not', null).groupBy('city').orderBy(sql`count(*)`, 'desc').limit(10).execute();
    res.json({ success: true, data: { overview: { total_listings: Number(l?.c || 0), total_users: Number(u?.c || 0), total_views: Number(v?.s || 0), conversion_rate: '0.00%' }, top_listings: top, city_performance: cities } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ AI ═══
app.get('/api/v1/ai/market-analysis', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(['city', 'price', 'view_count', 'type']).where('status', '=', 'published').execute();
    const prices = listings.filter(l => l.price).map(l => Number(l.price));
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const cityMap: any = {};
    listings.forEach(l => { if (!l.city) return; if (!cityMap[l.city]) cityMap[l.city] = { c: 0, v: 0 }; cityMap[l.city].c++; cityMap[l.city].v += Number(l.view_count || 0); });
    const cities = Object.entries(cityMap).map(([city, d]: [string, any]) => ({ city, listings: d.c, total_views: d.v, demand: d.v > 50 ? 'High' : d.v > 10 ? 'Medium' : 'Low' })).sort((a, b) => b.total_views - a.total_views).slice(0, 10);
    res.json({ success: true, data: { market_summary: { total_properties: listings.length, average_price: avg }, city_analysis: cities, ai_insights: [`Average price: $${avg.toLocaleString()}`, `Total: ${listings.length} listings`, cities[0] ? `Hottest: ${cities[0].city}` : ''] } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/ai/recommendations', async (req, res) => {
  try {
    const { city, budget } = req.query as any;
    let q = db.selectFrom('listings').selectAll().where('status', '=', 'published');
    if (city) q = q.where('city', 'ilike', `%${city}%`);
    if (budget) q = q.where('price', '<=', Number(budget));
    const listings = await q.orderBy('view_count', 'desc').limit(6).execute();
    res.json({ success: true, data: listings.map(l => ({ ...l, reasons: ['Matches your criteria'] })) });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/ai/social-posts', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').selectAll().where('status', '=', 'published').orderBy('view_count', 'desc').limit(5).execute();
    const posts = listings.map(l => ({
      id: l.id, title: l.title, image: l.main_image_url,
      platforms: {
        facebook: `🏠 FOR SALE: ${l.title}\n📍 ${l.city}, ${l.country}\n💰 $${Number(l.price || 0).toLocaleString()}\n#HavenFinder #RealEstate`,
        twitter: `🏠 ${l.title} - $${Number(l.price || 0).toLocaleString()} 📍 ${l.city} #Property #HavenFinder`,
        whatsapp: `🏠 *${l.title}*\n💰 $${Number(l.price || 0).toLocaleString()}\n📍 ${l.city}`,
        linkedin: `Property: ${l.title}\n📍 ${l.city}, ${l.country}\n💰 $${Number(l.price || 0).toLocaleString()}`,
        instagram: `✨ NEW LISTING ✨\n${l.title}\n📍 ${l.city}\n💰 $${Number(l.price || 0).toLocaleString()}`
      },
      engagement_score: Math.min(100, (l.view_count || 0) * 10 + 20)
    }));
    res.json({ success: true, data: posts });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/v1/ai/promotional-content', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    res.json({
      success: true, data: {
        daily_post: `🏠 Discover your dream home today! We have ${l?.c || 0} properties. #HavenFinder`,
        weekly_promo: `📊 This week: ${l?.c || 0} listings, ${u?.c || 0} users`,
        engagement_prompt: `❓ What's your dream home? A) Apartment B) House C) Villa D) Cabin`,
        market_update: `📈 New listings added daily!`
      }
    });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ═══ ADMIN ═══
app.get('/api/v1/admin/stats', authenticate, async (req: any, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Admin required' });
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    res.json({ success: true, data: { users: Number(u?.c || 0), listings: Number(l?.c || 0) } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// 404
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Start
app.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🏠 HAVENFINDER BACKEND SERVER');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   📡 API:      http://127.0.0.1:${CONFIG.PORT}`);
  console.log(`   ❤️  Health:   http://127.0.0.1:${CONFIG.PORT}/api/v1/health`);
  console.log(`   📋 Listings: http://127.0.0.1:${CONFIG.PORT}/api/v1/listings`);
  console.log(`   🔐 Login:    http://127.0.0.1:${CONFIG.PORT}/api/v1/auth/login`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
