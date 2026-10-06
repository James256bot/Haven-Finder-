// Advanced routes to append to server.ts
// These add: analytics, recommendations, advanced search, saved searches, reports

// ─── Advanced Search with multiple filters ───
app.get('/api/v1/search/advanced', async (req, res) => {
  try {
    const { q, type, city, state, minPrice, maxPrice, minBedrooms, maxBedrooms, minBathrooms, propertyType, amenities, sortBy, page = '1', limit = '20' } = req.query as any;
    
    let query = db.selectFrom('listings').select(LISTING_COLUMNS).where('status', '=', 'published');
    
    // Text search
    if (q) {
      query = query.where((eb: any) => eb.or([
        eb('title', 'ilike', `%${q}%`),
        eb('description', 'ilike', `%${q}%`),
        eb('city', 'ilike', `%${q}%`),
      ]));
    }
    
    if (type) query = query.where('type', '=', String(type));
    if (city) query = query.where('city', 'ilike', String(city));
    if (state) query = query.where('state', 'ilike', String(state));
    if (minPrice) query = query.where('price', '>=', Number(minPrice));
    if (maxPrice) query = query.where('price', '<=', Number(maxPrice));
    if (minBedrooms) query = query.where('bedrooms', '>=', Number(minBedrooms));
    if (maxBedrooms) query = query.where('bedrooms', '<=', Number(maxBedrooms));
    if (minBathrooms) query = query.where('bathrooms', '>=', Number(minBathrooms));
    if (propertyType) query = query.where('property_type', '=', String(propertyType));
    
    // Sorting
    if (sortBy === 'price_asc') query = query.orderBy('price', 'asc');
    else if (sortBy === 'price_desc') query = query.orderBy('price', 'desc');
    else if (sortBy === 'newest') query = query.orderBy('created_at', 'desc');
    else if (sortBy === 'views') query = query.orderBy('view_count', 'desc');
    else if (sortBy === 'rating') query = query.orderBy('average_rating', 'desc');
    else query = query.orderBy('created_at', 'desc');
    
    const offset = (Number(page) - 1) * Number(limit);
    const listings = await query.limit(Number(limit)).offset(offset).execute();
    const totalResult = await query.select(sql`count(*)`.as('c')).executeTakeFirst();
    
    // Track search
    await db.insertInto('search_history').values({
      query: q || '', filters: JSON.stringify(req.query), results_count: listings.length,
      user_id: req.user?.id || null
    }).execute();
    
    res.json({
      success: true,
      data: listings,
      meta: { page: Number(page), limit: Number(limit), total: Number(totalResult?.c || 0) }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Recommendations (based on views and favorites) ───
app.get('/api/v1/recommendations', async (req, res) => {
  try {
    // Get most viewed listings
    const popular = await db.selectFrom('listings')
      .select(LISTING_COLUMNS)
      .where('status', '=', 'published')
      .orderBy('view_count', 'desc')
      .limit(5).execute();
    
    // Get highest rated
    const rated = await db.selectFrom('listings')
      .select(LISTING_COLUMNS)
      .where('status', '=', 'published')
      .where('average_rating', 'is not', null)
      .orderBy('average_rating', 'desc')
      .limit(5).execute();
    
    // Get newest
    const newest = await db.selectFrom('listings')
      .select(LISTING_COLUMNS)
      .where('status', '=', 'published')
      .orderBy('created_at', 'desc')
      .limit(5).execute();
    
    res.json({
      success: true,
      data: {
        popular: popular,
        top_rated: rated,
        newest: newest,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Similar Listings ────────────────────────
app.get('/api/v1/listings/:id/similar', async (req, res) => {
  try {
    const listing = await db.selectFrom('listings').selectAll().where('id', '=', req.params.id).executeTakeFirst();
    if (!listing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    
    const similar = await db.selectFrom('listings')
      .select(LISTING_COLUMNS)
      .where('status', '=', 'published')
      .where('id', '!=', req.params.id)
      .where((eb: any) => eb.or([
        eb('city', '=', listing.city),
        eb('property_type', '=', listing.property_type),
        eb('type', '=', listing.type),
      ]))
      .limit(6).execute();
    
    res.json({ success: true, data: similar });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Saved Searches ──────────────────────────
app.post('/api/v1/search/saved', authenticate, async (req: any, res) => {
  try {
    const { name, filters } = req.body;
    await db.insertInto('saved_searches').values({
      user_id: req.user.id, name, filters: JSON.stringify(filters)
    }).execute();
    res.status(201).json({ success: true, data: { message: 'Search saved' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/search/saved', authenticate, async (req: any, res) => {
  try {
    const searches = await db.selectFrom('saved_searches')
      .selectAll()
      .where('user_id', '=', req.user.id)
      .orderBy('created_at', 'desc').execute();
    res.json({ success: true, data: searches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Analytics for Owners ────────────────────
app.get('/api/v1/analytics/my-listings', authenticate, async (req: any, res) => {
  try {
    const listings = await db.selectFrom('listings')
      .select(LISTING_COLUMNS)
      .where('user_id', '=', req.user.id)
      .execute();
    
    const totalViews = listings.reduce((sum: number, l: any) => sum + (l.view_count || 0), 0);
    const totalFavorites = listings.reduce((sum: number, l: any) => sum + (l.favorite_count || 0), 0);
    
    // Views by city
    const cityStats: Record<string, number> = {};
    listings.forEach((l: any) => {
      const key = l.city || 'Unknown';
      cityStats[key] = (cityStats[key] || 0) + (l.view_count || 0);
    });
    
    res.json({
      success: true,
      data: {
        total_listings: listings.length,
        total_views: totalViews,
        total_favorites: totalFavorites,
        avg_views_per_listing: listings.length ? Math.round(totalViews / listings.length) : 0,
        views_by_city: cityStats,
        listings: listings,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Report Listing ──────────────────────────
app.post('/api/v1/reports', authenticate, async (req: any, res) => {
  try {
    const { listingId, reason, description } = req.body;
    await db.insertInto('reports').values({
      reporter_id: req.user.id, listing_id: listingId, reason, description
    }).execute();
    res.status(201).json({ success: true, data: { message: 'Report submitted' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Categories ──────────────────────────────
app.get('/api/v1/categories', async (_req, res) => {
  try {
    const categories = await db.selectFrom('categories').selectAll().where('is_active', '=', true).orderBy('sort_order').execute();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Amenities ───────────────────────────────
app.get('/api/v1/amenities', async (_req, res) => {
  try {
    const amenities = await db.selectFrom('amenities').selectAll().execute();
    res.json({ success: true, data: amenities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Trending Searches ───────────────────────
app.get('/api/v1/search/trending', async (_req, res) => {
  try {
    const trending = await db.selectFrom('search_history')
      .select('query')
      .select(sql`count(*)`.as('count'))
      .where('query', '!=', '')
      .groupBy('query')
      .orderBy(sql`count(*)`, 'desc')
      .limit(10).execute();
    res.json({ success: true, data: trending });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Platform Stats (Public) ─────────────────
app.get('/api/v1/stats', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings').select(sql`count(*)`.as('c')).where('status', '=', 'published').executeTakeFirst();
    const users = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    const cities = await db.selectFrom('listings').select(sql`count(DISTINCT city)`.as('c')).where('city', 'is not', null).executeTakeFirst();
    const totalViews = await db.selectFrom('listings').select(sql`sum(view_count)`.as('s')).executeTakeFirst();
    
    res.json({
      success: true,
      data: {
        total_listings: Number(listings?.c || 0),
        total_users: Number(users?.c || 0),
        total_cities: Number(cities?.c || 0),
        total_views: Number(totalViews?.s || 0),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

console.log('✅ Advanced routes defined');
