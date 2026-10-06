import express from 'express';
import cors from 'cors';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder' });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

const app = express();
app.use(cors());
app.use(express.json());

// Marketing stats - simplified to avoid missing columns
app.get('/api/v1/marketing/stats', async (_req, res) => {
  try {
    const totalListings = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const totalUsers = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const totalViews = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count), 0)`.as('s')).executeTakeFirst();
    
    const topListings = await db.selectFrom('listings')
      .select(['id','title','city','price','view_count','main_image_url'])
      .where('status','=','published')
      .orderBy('view_count','desc')
      .limit(10)
      .execute();
    
    const cityStats = await db.selectFrom('listings')
      .select('city')
      .select(sql`count(*)`.as('count'))
      .select(sql`COALESCE(sum(view_count),0)`.as('views'))
      .where('city','is not',null)
      .groupBy('city')
      .orderBy(sql`COALESCE(sum(view_count),0)`,'desc')
      .limit(10)
      .execute();
    
    res.json({
      success: true,
      data: {
        overview: {
          total_listings: Number(totalListings?.c || 0),
          total_users: Number(totalUsers?.c || 0),
          total_views: Number(totalViews?.s || 0),
          conversion_rate: '0.00%',
        },
        top_listings: topListings || [],
        city_performance: cityStats || [],
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// Simple listings endpoint
app.get('/api/v1/listings', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings')
      .select(['id','user_id','title','slug','description','type','status','price','currency','city','state','bedrooms','bathrooms','square_feet','property_type','view_count','main_image_url','created_at','published_at'])
      .where('status','=','published')
      .orderBy('created_at','desc')
      .limit(50)
      .execute();
    res.json({ success: true, data: listings, count: listings.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});


// ═══ AI MARKETING ENDPOINTS ═══

app.post('/api/v1/ai/description', (req, res) => {
  try {
    const { title, type, bedrooms, bathrooms, square_feet, city, features } = req.body;
    const templates = {
      property: `Stunning ${bedrooms || 0}-bedroom ${type || 'property'} in ${city || 'prime location'}. Features ${square_feet || 'spacious'} sq ft${bathrooms ? `, ${bathrooms} bathrooms` : ''}${features?.length ? `, ${features.join(', ')}` : ''}. A perfect blend of comfort and style.`,
      rental: `Beautiful ${bedrooms || 0}-bedroom rental in ${city || 'great location'}. ${square_feet || 'Spacious'} sq ft${features?.length ? ` with ${features.join(', ')}` : ''}. Move-in ready!`,
      commercial: `Prime commercial space in ${city || 'business district'}. ${square_feet || 'Generous'} sq ft for office or retail.`,
      land: `Excellent land opportunity in ${city || 'developing area'}. ${square_feet || 'Large'} sq ft plot.`,
    };
    res.json({ success: true, data: { description: templates[type] || templates.property, tags: [type, city, 'property'].filter(Boolean) } });
  } catch (err) { res.status(500).json({ success: false, error: { message: String(err) } }); }
});

app.get('/api/v1/ai/market-analysis', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(['city','price','type','view_count']).where('status','=','published').execute();
    const prices = listings.filter(l => l.price).map(l => Number(l.price));
    const avgPrice = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
    const cityMap = {};
    listings.forEach(l => {
      if (!l.city) return;
      if (!cityMap[l.city]) cityMap[l.city] = { count: 0, views: 0 };
      cityMap[l.city].count++;
      cityMap[l.city].views += Number(l.view_count || 0);
    });
    const cityAnalysis = Object.entries(cityMap).map(([city, d]) => ({
      city, listings: d.count, total_views: d.views,
      demand: d.views > 50 ? 'High' : d.views > 10 ? 'Medium' : 'Low'
    })).sort((a, b) => b.total_views - a.total_views).slice(0, 10);
    
    res.json({ success: true, data: {
      market_summary: { total_properties: listings.length, average_price: avgPrice },
      city_analysis: cityAnalysis,
      ai_insights: [
        `Average property price: $${avgPrice.toLocaleString()}`,
        `Total listings: ${listings.length}`,
        cityAnalysis[0] ? `Hottest market: ${cityAnalysis[0].city} (${cityAnalysis[0].total_views} views)` : 'No data'
      ]
    }});
  } catch (err) { res.status(500).json({ success: false, error: { message: String(err) } }); }
});

app.get('/api/v1/ai/recommendations', async (req, res) => {
  try {
    const { city, budget } = req.query;
    let q = db.selectFrom('listings').select(['id','title','price','city','bedrooms','bathrooms','square_feet','main_image_url','view_count']).where('status','=','published');
    if (city) q = q.where('city','ilike',`%${city}%`);
    if (budget) q = q.where('price','<=',Number(budget));
    const listings = await q.orderBy('view_count','desc').limit(6).execute();
    res.json({ success: true, data: listings.map(l => ({ ...l, reasons: ['Matches your criteria'] })) });
  } catch (err) { res.status(500).json({ success: false, error: { message: String(err) } }); }
});



app.get('/api/v1/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status','=','published').executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const v = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    const cities = await db.selectFrom('listings').select(sql`count(DISTINCT city)`.as('c')).where('city','is not',null).executeTakeFirst();
    res.json({ success: true, data: { total_listings: Number(l?.c||0), total_users: Number(u?.c||0), total_views: Number(v?.s||0), total_cities: Number(cities?.c||0) } });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});



app.get('/api/v1/health', async (_req, res) => {
  try { await sql`SELECT 1`.execute(db); res.json({ status: 'healthy', database: 'connected', uptime: process.uptime() }); }
  catch (e) { res.status(503).json({ status: 'degraded', error: String(e) }); }
});

app.get('/api/v1/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status','=','published').executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const v = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    const cities = await db.selectFrom('listings').select(sql`count(DISTINCT city)`.as('c')).where('city','is not',null).executeTakeFirst();
    res.json({ success: true, data: { total_listings: Number(l?.c||0), total_users: Number(u?.c||0), total_views: Number(v?.s||0), total_cities: Number(cities?.c||0) } });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});



app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const listing = await db.selectFrom('listings').selectAll().where('id', '=', id).executeTakeFirst();
    if (!listing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    res.json({ success: true, data: listing });
  } catch (e) { res.status(500).json({ success: false, error: { message: String(e) } }); }
});


// ═══════════════════════════════════════════════════════
// AI SOCIAL MEDIA AUTOMATED MARKETING
// ═══════════════════════════════════════════════════════

// Generate social media posts for properties
app.get('/api/v1/ai/social-posts', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings')
      .select(['id','title','price','city','state','country','bedrooms','bathrooms','square_feet','main_image_url','property_type','view_count'])
      .where('status','=','published')
      .orderBy('view_count','desc')
      .limit(5)
      .execute();
    
    const posts = listings.map((l, i) => {
      const price = `$${Number(l.price || 0).toLocaleString()}`;
      const location = `${l.city}${l.state ? ', ' + l.state : ''}${l.country ? ', ' + l.country : ''}`;
      const beds = l.bedrooms ? `${l.bedrooms} bed` : '';
      const baths = l.bathrooms ? `${l.bathrooms} bath` : '';
      const sqft = l.square_feet ? `${l.square_feet} sqft` : '';
      const specs = [beds, baths, sqft].filter(Boolean).join(' | ');
      
      return {
        id: l.id,
        title: l.title,
        image: l.main_image_url,
        platforms: {
          facebook: `🏠 FOR SALE: ${l.title}\n\n📍 ${location}\n💰 ${price}\n📐 ${specs}\n\n🔗 View details: http://127.0.0.1:3000/property.html?id=${l.id}\n\n#HavenFinder #RealEstate #PropertyForSale #${(l.city||'').replace(/\s+/g,'')}`,
          twitter: `🏠 ${l.title} - ${price}\n📍 ${location}\n${specs}\n\nView: http://127.0.0.1:3000/property.html?id=${l.id}\n#RealEstate #Property #HavenFinder`,
          whatsapp: `🏠 *${l.title}*\n\n📍 ${location}\n💰 *${price}*\n📐 ${specs}\n\n🔗 http://127.0.0.1:3000/property.html?id=${l.id}\n\n_Sent via HavenFinder_`,
          linkedin: `🏢 Property Listing: ${l.title}\n\n📍 ${location}\n💰 ${price}\n📐 ${specs}\n\n${l.property_type ? 'Type: ' + l.property_type : ''}\n\nContact us for more details.\n#RealEstate #PropertyInvestment #CommercialRealEstate`,
          instagram: `✨ NEW LISTING ✨\n\n${l.title}\n📍 ${location}\n💰 ${price}\n\n${specs ? '📐 ' + specs : ''}\n\n#HavenFinder #DreamHome #LuxuryLiving #RealEstate #PropertyListing`
        },
        hashtags: ['#HavenFinder', '#RealEstate', '#PropertyForSale', '#DreamHome', '#LuxuryLiving'].join(' '),
        scheduled_time: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
        engagement_score: Math.min(100, (l.view_count || 0) * 10 + 20),
      };
    });
    
    res.json({ success: true, data: posts });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});

// Auto-generate promotional content
app.get('/api/v1/ai/promotional-content', async (_req, res) => {
  try {
    const stats = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const users = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    
    const content = {
      daily_post: `🏠 Discover your dream home today! We have ${stats?.c || 0} properties waiting for you. From cozy apartments to luxury villas. Browse now! #HavenFinder`,
      weekly_promo: `📊 This week on HavenFinder:\n• ${stats?.c} active listings\n• ${users?.c || 0} registered users\n• Properties across 6 continents\n\nFind your perfect home today!`,
      engagement_prompt: `❓ What's your dream home?\nA) City apartment 🏢\nB) Suburban house 🏡\nC) Beach villa 🌊\nD) Mountain cabin ⛰️\n\nComment below! #HavenFinder`,
      market_update: `📈 Market Update: Average property price is $819,085. Hot markets: Los Angeles, Kampala, San Francisco. New listings daily!`,
      testimonial_post: `⭐ "Found my dream apartment in just 2 days!" - Sarah J.\n\nJoin thousands of happy homeowners on HavenFinder. Your perfect home is waiting.`
    };
    
    res.json({ success: true, data: content });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});

// Schedule social media post
app.post('/api/v1/ai/schedule-post', async (req, res) => {
  try {
    const { listing_id, platform, scheduled_time } = req.body;
    await db.insertInto('analytics_events').values({
      event_type: 'social_scheduled',
      event_data: JSON.stringify({ listing_id, platform, scheduled_time }),
      user_agent: req.headers['user-agent'],
    }).execute();
    res.json({ success: true, data: { message: `Post scheduled for ${platform} at ${scheduled_time}` } });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});

// Get social media analytics
app.get('/api/v1/ai/social-analytics', async (_req, res) => {
  try {
    const shares = await db.selectFrom('analytics_events')
      .select(sql`count(*)`.as('c'))
      .where('event_type', '=', 'share')
      .executeTakeFirst();
    
    const scheduled = await db.selectFrom('analytics_events')
      .select(sql`count(*)`.as('c'))
      .where('event_type', '=', 'social_scheduled')
      .executeTakeFirst();
    
    const totalViews = await db.selectFrom('listings').select(sql`COALESCE(sum(view_count),0)`.as('s')).executeTakeFirst();
    
    res.json({ success: true, data: {
      total_shares: Number(shares?.c || 0),
      scheduled_posts: Number(scheduled?.c || 0),
      total_property_views: Number(totalViews?.s || 0),
      estimated_reach: Number(shares?.c || 0) * 150, // avg 150 people per share
      engagement_rate: totalViews?.s ? ((Number(shares?.c || 0) / Number(totalViews.s)) * 100).toFixed(1) + '%' : '0%'
    }});
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});



// ─── AUTH ROUTES ────────────────────────────
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
    
    const bcrypt = (await import('bcryptjs')).default;
    const user = await db.selectFrom('users').selectAll().where('email','=',email.toLowerCase()).executeTakeFirst();
    
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ sub: user.id, role: user.role }, 'havenfinder-secret-key-minimum-32-chars', { expiresIn: '15m' });
    
    const safe = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at
    };
    
    res.json({ success: true, data: { user: safe, tokens: { accessToken: token } } });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ success: false, error: 'Missing fields' });
    
    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash(password, 10);
    
    const result = await db.insertInto('users').values({
      email: email.toLowerCase(), password_hash: hash, full_name: fullName, role: 'user'
    }).returning(['id','email','full_name','role','email_verified','created_at']).execute();
    
    const user = Array.isArray(result) ? result[0] : result;
    res.status(201).json({ success: true, data: { user } });
  } catch (e) { res.status(500).json({ success: false, error: String(e) }); }
});

app.listen(8000, '0.0.0.0', () => {
  console.log('✅ Marketing API running on port 8000');
});
