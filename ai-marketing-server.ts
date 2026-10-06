import express from 'express';
import cors from 'cors';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder' });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/v1/health', async (_req, res) => {
  try { await sql`SELECT 1`.execute(db); res.json({ status: 'healthy', database: 'connected' }); }
  catch { res.status(503).json({ status: 'degraded' }); }
});

// Listings (simplified)
app.get('/api/v1/listings', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings')
      .select(['id','user_id','title','slug','description','type','status','price','city','state','country','bedrooms','bathrooms','square_feet','property_type','view_count','favorite_count','main_image_url','created_at','published_at'])
      .where('status','=','published')
      .orderBy('created_at','desc')
      .limit(50)
      .execute();
    res.json({ success: true, data: listings, count: listings.length });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } }); }
});

// Stats
app.get('/api/v1/stats', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const users = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const views = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    res.json({ success: true, data: { total_listings: Number(listings?.c||0), total_users: Number(users?.c||0), total_views: Number(views?.s||0) } });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } }); }
});

// Marketing Stats
app.get('/api/v1/marketing/stats', async (_req, res) => {
  try {
    const totalListings = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const totalUsers = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const totalViews = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    
    const topListings = await db.selectFrom('listings')
      .select(['id','title','city','price','view_count','main_image_url'])
      .orderBy('view_count','desc').limit(10).execute();
    
    const cityStats = await db.selectFrom('listings')
      .select('city').select(sql`count(*)`.as('count')).select(sql`COALESCE(sum(view_count),0)`.as('views'))
      .where('city','is not',null).groupBy('city')
      .orderBy(sql`COALESCE(sum(view_count),0)`,'desc').limit(10).execute();
    
    res.json({ success: true, data: {
      overview: { total_listings: Number(totalListings?.c||0), total_users: Number(totalUsers?.c||0), total_views: Number(totalViews?.s||0), conversion_rate: '0.00%' },
      top_listings: topListings || [], city_performance: cityStats || []
    }});
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } }); }
});

// ═══ AI MARKETING ENDPOINTS ═══

// AI Description Generator
app.post('/api/v1/ai/description', (req, res) => {
  try {
    const { title, type, bedrooms, bathrooms, square_feet, city, features } = req.body;
    const templates = {
      property: `Stunning ${bedrooms || 0}-bedroom ${type || 'property'} in ${city || 'prime location'}. Features ${square_feet || 'spacious'} sq ft${bathrooms ? `, ${bathrooms} bathrooms` : ''}${features?.length ? `, ${features.join(', ')}` : ''}. A perfect blend of comfort and style.`,
      rental: `Beautiful ${bedrooms || 0}-bedroom rental in ${city || 'great location'}. ${square_feet || 'Spacious'} sq ft${features?.length ? ` with ${features.join(', ')}` : ''}. Move-in ready!`,
      commercial: `Prime commercial space in ${city || 'business district'}. ${square_feet || 'Generous'} sq ft suitable for office or retail. High visibility location.`,
      land: `Excellent land opportunity in ${city || 'developing area'}. ${square_feet || 'Large'} sq ft plot perfect for development.`,
    };
    const desc = templates[type] || templates.property;
    res.json({ success: true, data: { description: desc, tags: [type, city, `${bedrooms||0}-bed`, 'property'].filter(Boolean) } });
  } catch (err: any) { res.status(500).json({ success: false, error: { message: err.message } }); }
});

// AI Market Analysis
app.get('/api/v1/ai/market-analysis', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(['city','price','type','view_count']).where('status','=','published').execute();
    const prices = listings.filter(l => l.price).map(l => Number(l.price));
    const avgPrice = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
    const cityMap: Record<string, any> = {};
    listings.forEach(l => {
      if (!l.city) return;
      if (!cityMap[l.city]) cityMap[l.city] = { count: 0, views: 0, avgPrice: 0 };
      cityMap[l.city].count++;
      cityMap[l.city].views += Number(l.view_count || 0);
      cityMap[l.city].avgPrice += Number(l.price || 0);
    });
    const cityAnalysis = Object.entries(cityMap).map(([city, d]: [string, any]) => ({
      city, listings: d.count, avg_price: Math.round(d.avgPrice/d.count),
      total_views: d.views, demand: d.views > 50 ? 'High' : d.views > 10 ? 'Medium' : 'Low'
    })).sort((a, b) => b.total_views - a.total_views);
    
    const insights = [
      `Average property price: $${avgPrice.toLocaleString()}`,
      `Total listings: ${listings.length}`,
      cityAnalysis[0] ? `Hottest market: ${cityAnalysis[0].city}` : 'No city data',
    ];
    
    res.json({ success: true, data: { market_summary: { total_properties: listings.length, average_price: avgPrice }, city_analysis: cityAnalysis.slice(0, 10), ai_insights: insights } });
  } catch (err: any) { res.status(500).json({ success: false, error: { message: err.message } }); }
});

// AI Recommendations
app.get('/api/v1/ai/recommendations', async (req, res) => {
  try {
    const { city, budget } = req.query as any;
    let q = db.selectFrom('listings').select(['id','title','price','city','bedrooms','bathrooms','square_feet','main_image_url','view_count']).where('status','=','published');
    if (city) q = q.where('city','ilike',`%${city}%`);
    if (budget) q = q.where('price','<=',Number(budget));
    const listings = await q.orderBy('view_count','desc').limit(6).execute();
    const recs = listings.map(l => ({ ...l, reasons: ['Matches your criteria'] }));
    res.json({ success: true, data: recs });
  } catch (err: any) { res.status(500).json({ success: false, error: { message: err.message } }); }
});

// Newsletter
app.post('/api/v1/marketing/newsletter', (req, res) => {
  res.json({ success: true, data: { message: 'Subscribed!' } });
});

app.listen(8000, '0.0.0.0', () => {
  console.log('🚀 HavenFinder AI Marketing API on port 8000');
  console.log('✅ AI endpoints: /api/v1/ai/*');
});
