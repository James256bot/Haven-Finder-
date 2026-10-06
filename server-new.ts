import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const CONFIG = {
  PORT: Number(process.env.PORT || 8000),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder',
  JWT_SECRET: process.env.JWT_SECRET || 'havenfinder-secret-key-minimum-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'havenfinder-refresh-secret-32-chars',
};

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL, min: 1, max: 10 });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

const LISTING_COLUMNS = ['id','user_id','category_id','title','slug','description','type','status','price','currency','city','state','bedrooms','bathrooms','square_feet','property_type','view_count','favorite_count','average_rating','review_count','created_at','updated_at','published_at','deleted_at','main_image_url'];

function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success:false, error:{code:'UNAUTHORIZED', message:'Auth required'} });
  try {
    const payload = jwt.verify(authHeader.split(' ')[1], CONFIG.JWT_SECRET) as any;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch { return res.status(401).json({ success:false, error:{code:'UNAUTHORIZED', message:'Invalid token'} }); }
}

// Health
app.get('/api/v1/health', async (_req, res) => {
  try { await sql`SELECT 1`.execute(db); res.json({ status:'healthy', database:'connected', uptime:process.uptime() }); }
  catch { res.status(503).json({ status:'degraded', database:'disconnected' }); }
});

// Auth: Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await db.insertInto('users').values({ email:email.toLowerCase(), password_hash:hash, full_name:fullName, role:'user' })
      .returning(['id','email','full_name','role','email_verified','created_at']).execute();
    const user = Array.isArray(result) ? result[0] : result;
    const accessToken = jwt.sign({ sub:user.id, role:user.role, type:'access' }, CONFIG.JWT_SECRET, { expiresIn:'15m' });
    const refreshToken = jwt.sign({ sub:user.id, tokenId:uuidv4(), type:'refresh' }, CONFIG.JWT_REFRESH_SECRET, { expiresIn:'7d' });
    await db.insertInto('refresh_tokens').values({ user_id:user.id, token:refreshToken, expires_at:new Date(Date.now()+7*86400000).toISOString() }).execute();
    res.status(201).json({ success:true, data:{ user, tokens:{ accessToken, refreshToken } } });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

// Auth: Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.selectFrom('users').selectAll().where('email','=',email.toLowerCase()).executeTakeFirst();
    if (!user || !user.password_hash) return res.status(401).json({ success:false, error:{code:'UNAUTHORIZED', message:'Invalid credentials'} });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success:false, error:{code:'UNAUTHORIZED', message:'Invalid credentials'} });
    const accessToken = jwt.sign({ sub:user.id, role:user.role, type:'access' }, CONFIG.JWT_SECRET, { expiresIn:'15m' });
    const refreshToken = jwt.sign({ sub:user.id, tokenId:uuidv4(), type:'refresh' }, CONFIG.JWT_REFRESH_SECRET, { expiresIn:'7d' });
    await db.insertInto('refresh_tokens').values({ user_id:user.id, token:refreshToken, expires_at:new Date(Date.now()+7*86400000).toISOString() }).execute();
    const safe = { id:user.id, email:user.email, full_name:user.full_name, role:user.role, email_verified:user.email_verified, created_at:user.created_at };
    res.json({ success:true, data:{ user:safe, tokens:{ accessToken, refreshToken } } });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

// Listings
app.get('/api/v1/listings', async (req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(LISTING_COLUMNS).where('status','=','published').orderBy('created_at','desc').limit(100).execute();
    res.json({ success:true, data:listings, count:listings.length });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

// Stats (public)
app.get('/api/v1/stats', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status','=','published').executeTakeFirst();
    const users = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const views = await db.selectFrom('listings').select(sql`sum(view_count)`.as('s')).executeTakeFirst();
    const cities = await db.selectFrom('listings').select(sql`count(DISTINCT city)`.as('c')).where('city','is not',null).executeTakeFirst();
    res.json({ success:true, data:{ total_listings:Number(listings?.c||0), total_users:Number(users?.c||0), total_views:Number(views?.s||0), total_cities:Number(cities?.c||0) } });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

// ═══════════════════════════════════════════════════
// MARKETING ENGINE ROUTES
// ═══════════════════════════════════════════════════

app.get('/api/v1/marketing/stats', async (_req, res) => {
  try {
    const totalViews = await db.selectFrom('listings').select(sql`sum(view_count)`.as('s')).executeTakeFirst();
    const totalFavorites = await db.selectFrom('listings').select(sql`sum(favorite_count)`.as('s')).executeTakeFirst();
    const totalInquiries = await db.selectFrom('listings').select(sql`sum(inquiry_count)`.as('s')).executeTakeFirst();
    const totalListings = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status','=','published').executeTakeFirst();
    const totalUsers = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    
    const topListings = await db.selectFrom('listings')
      .select(['id','title','city','price','view_count','favorite_count','inquiry_count','main_image_url'])
      .where('status','=','published')
      .orderBy('view_count','desc')
      .limit(10).execute();
    
    const cityStats = await db.selectFrom('listings')
      .select('city').select(sql`count(*)`.as('count')).select(sql`sum(view_count)`.as('views'))
      .where('status','=','published').groupBy('city').orderBy(sql`sum(view_count)`,'desc').limit(10).execute();
    
    const conversionRate = totalViews?.s ? ((Number(totalInquiries?.s||0)/Number(totalViews.s))*100).toFixed(2) : '0';
    
    res.json({ success:true, data:{ overview:{ total_listings:Number(totalListings?.c||0), total_users:Number(totalUsers?.c||0), total_views:Number(totalViews?.s||0), total_favorites:Number(totalFavorites?.s||0), total_inquiries:Number(totalInquiries?.s||0), conversion_rate:conversionRate+'%' }, top_listings:topListings, city_performance:cityStats } });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

app.post('/api/v1/marketing/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success:false, error:{code:'VALIDATION_ERROR', message:'Email required'} });
    await db.insertInto('analytics_events').values({ event_type:'newsletter_signup', event_data:JSON.stringify({email}), user_agent:req.headers['user-agent'] }).execute();
    res.json({ success:true, data:{ message:'Subscribed!' } });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

app.post('/api/v1/marketing/share', async (req, res) => {
  try {
    const { listing_id, platform, url } = req.body;
    await db.insertInto('analytics_events').values({ event_type:'share', event_data:JSON.stringify({listing_id,platform,url}), user_agent:req.headers['user-agent'] }).execute();
    res.json({ success:true });
  } catch (err:any) { res.status(500).json({ success:false, error:{code:'INTERNAL_ERROR', message:err.message} }); }
});

// 404
app.use((_req, res) => { res.status(404).json({ success:false, error:{code:'NOT_FOUND', message:'Route not found'} }); });

// Start
app.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log(`🚀 HavenFinder API on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log('📊 Marketing routes available at /api/v1/marketing/stats');
});
