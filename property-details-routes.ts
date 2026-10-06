// ─── Full Property Details ──────────────────
app.get('/api/v1/listings/:id/details', async (req, res) => {
  try {
    const listing = await db.selectFrom('listings')
      .select([...LISTING_COLUMNS, 'main_image_url', 'latitude', 'longitude', 'available_from', 'available_until'])
      .where('id', '=', req.params.id)
      .executeTakeFirst();
    
    if (!listing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    
    // Increment view count
    await sql`UPDATE listings SET view_count = view_count + 1 WHERE id = ${req.params.id}`.execute(db);
    
    // Get images
    const images = await db.selectFrom('listing_images').selectAll().where('listing_id', '=', req.params.id).execute();
    
    // Get reviews
    const reviews = await db.selectFrom('reviews')
      .innerJoin('users', 'users.id', 'reviews.reviewer_id')
      .select(['reviews.id', 'reviews.rating', 'reviews.content', 'reviews.created_at', 'users.full_name as reviewer_name', 'users.avatar_url as reviewer_avatar'])
      .where('reviews.listing_id', '=', req.params.id)
      .orderBy('reviews.created_at', 'desc')
      .execute();
    
    // Get owner info
    const owner = await db.selectFrom('users')
      .select(['id', 'full_name', 'avatar_url', 'email'])
      .where('id', '=', listing.user_id)
      .executeTakeFirst();
    
    // Get similar listings
    const similar = await db.selectFrom('listings')
      .select([...LISTING_COLUMNS, 'main_image_url'])
      .where('status', '=', 'published')
      .where('id', '!=', req.params.id)
      .where((eb: any) => eb.or([
        eb('city', '=', listing.city),
        eb('property_type', '=', listing.property_type),
        eb('type', '=', listing.type),
      ]))
      .limit(4)
      .execute();
    
    // Get favorite count
    const favCount = await db.selectFrom('favorites')
      .select(sql`count(*)`.as('c'))
      .where('listing_id', '=', req.params.id)
      .executeTakeFirst();
    
    res.json({
      success: true,
      data: {
        ...listing,
        images,
        reviews,
        owner: owner ? { id: owner.id, name: owner.full_name, avatar: owner.avatar_url } : null,
        similar_listings: similar,
        favorite_count: Number(favCount?.c || 0),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Get Listing Reviews with Details ───────
app.get('/api/v1/listings/:id/reviews', async (req, res) => {
  try {
    const reviews = await db.selectFrom('reviews')
      .innerJoin('users', 'users.id', 'reviews.reviewer_id')
      .select(['reviews.id', 'reviews.rating', 'reviews.title', 'reviews.content', 'reviews.is_verified', 'reviews.helpful_count', 'reviews.created_at', 'users.full_name as reviewer_name'])
      .where('reviews.listing_id', '=', req.params.id)
      .where('reviews.is_flagged', '=', false)
      .orderBy('reviews.created_at', 'desc')
      .execute();
    
    const avgRating = await db.selectFrom('reviews')
      .select(sql`avg(rating)`.as('avg'))
      .where('listing_id', '=', req.params.id)
      .executeTakeFirst();
    
    res.json({
      success: true,
      data: {
        reviews,
        average_rating: Number(avgRating?.avg || 0).toFixed(1),
        total_reviews: reviews.length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Get Owner's Other Listings ─────────────
app.get('/api/v1/users/:userId/listings', async (req, res) => {
  try {
    const listings = await db.selectFrom('listings')
      .select([...LISTING_COLUMNS, 'main_image_url'])
      .where('user_id', '=', req.params.userId)
      .where('status', '=', 'published')
      .orderBy('created_at', 'desc')
      .execute();
    
    res.json({ success: true, data: listings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Get Cities List ────────────────────────
app.get('/api/v1/cities', async (_req, res) => {
  try {
    const cities = await db.selectFrom('listings')
      .select('city')
      .select('state')
      .select(sql`count(*)`.as('count'))
      .where('status', '=', 'published')
      .where('city', 'is not', null)
      .groupBy('city', 'state')
      .orderBy(sql`count(*)`, 'desc')
      .execute();
    
    res.json({ success: true, data: cities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Contact Owner (Create Inquiry) ─────────
app.post('/api/v1/inquiries', authenticate, async (req: any, res) => {
  try {
    const { listingId, message, phone, email } = req.body;
    await db.insertInto('inquiries').values({
      listing_id: listingId,
      sender_id: req.user.id,
      message,
      phone: phone || null,
      email: email || null,
      status: 'pending'
    }).execute();
    
    // Create notification for listing owner
    const listing = await db.selectFrom('listings').select('user_id', 'title').where('id', '=', listingId).executeTakeFirst();
    if (listing) {
      await db.insertInto('notifications').values({
        user_id: listing.user_id,
        type: 'in_app',
        title: 'New Inquiry',
        body: `Someone is interested in "${listing.title}"`,
        data: { listing_id: listingId }
      }).execute();
    }
    
    res.status(201).json({ success: true, data: { message: 'Inquiry sent' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── Mark Listing as Interested ─────────────
app.post('/api/v1/listings/:id/interested', authenticate, async (req: any, res) => {
  try {
    await sql`UPDATE listings SET inquiry_count = inquiry_count + 1 WHERE id = ${req.params.id}`.execute(db);
    res.json({ success: true, data: { message: 'Interest recorded' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

console.log('✅ Property detail routes defined');
