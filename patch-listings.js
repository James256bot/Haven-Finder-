import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('server.ts', 'utf-8');

// Replace the listings POST endpoint
const oldListingEndpoint = content.match(/app\.post\('\/api\/v1\/listings'[\s\S]*?\n\}\);/)[0];

const newListingEndpoint = `app.post('/api/v1/listings', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }
    const payload = jwt.verify(authHeader.split(' ')[1], CONFIG.JWT_SECRET) as { sub: string };
    const { title, description, type, price, currency, city, state, bedrooms, bathrooms, squareFeet, propertyType } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title required' } });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    
    const result = await db.insertInto('listings').values({
      user_id: payload.sub,
      title: title,
      slug: slug,
      description: description || null,
      type: type || 'property',
      status: 'published',
      price: price || null,
      currency: currency || 'USD',
      city: city || null,
      state: state || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      square_feet: squareFeet || null,
      property_type: propertyType || null,
      published_at: new Date().toISOString()
    }).returning(['id', 'user_id', 'title', 'slug', 'description', 'type', 'status', 'price', 'currency', 'city', 'state', 'bedrooms', 'bathrooms', 'square_feet', 'property_type', 'view_count', 'favorite_count', 'created_at', 'updated_at', 'published_at']).execute();
    
    const listing = result[0] || result;
    res.status(201).json({ success: true, data: listing });
  } catch (err: any) {
    console.error('Create listing error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});`;

if (oldListingEndpoint) {
  content = content.replace(oldListingEndpoint, newListingEndpoint);
  writeFileSync('server.ts', content);
  console.log('✅ Listing endpoint fixed');
} else {
  console.log('⚠️ Could not find listing endpoint, creating new file');
}

// Also fix user registration
const oldRegisterEndpoint = content.match(/app\.post\('\/api\/v1\/auth\/register'[\s\S]*?\n\}\);/)[0];

const newRegisterEndpoint = `app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    const existing = await db.selectFrom('users').select('id').where('email', '=', email.toLowerCase()).executeTakeFirst();
    if (existing) return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered' } });
    
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.insertInto('users').values({
      email: email.toLowerCase(), password_hash: passwordHash, full_name: fullName, role: 'user'
    }).returning(['id', 'email', 'full_name', 'role', 'email_verified', 'created_at']).execute();
    
    const user = result[0] || result;
    const accessToken = jwt.sign({ sub: user.id, role: user.role, type: 'access' }, CONFIG.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, tokenId: uuidv4(), type: 'refresh' }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    await db.insertInto('refresh_tokens').values({ user_id: user.id, token: refreshToken, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() }).execute();
    
    res.status(201).json({ success: true, data: { user, tokens: { accessToken, refreshToken } } });
  } catch (err: any) {
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});`;

if (oldRegisterEndpoint) {
  content = content.replace(oldRegisterEndpoint, newRegisterEndpoint);
  writeFileSync('server.ts', content);
  console.log('✅ Register endpoint fixed');
}

// Fix reviews endpoint
const oldReviewEndpoint = content.match(/app\.post\('\/api\/v1\/reviews'[\s\S]*?\n\}\);/)[0];

const newReviewEndpoint = `app.post('/api/v1/reviews', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }
    const payload = jwt.verify(authHeader.split(' ')[1], CONFIG.JWT_SECRET) as { sub: string };
    const { listingId, rating, content } = req.body;
    if (!listingId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid review data' } });
    }
    
    const result = await db.insertInto('reviews').values({
      listing_id: listingId, reviewer_id: payload.sub, rating: rating, content: content || null
    }).returning(['id', 'listing_id', 'reviewer_id', 'rating', 'content', 'is_verified', 'created_at']).execute();
    
    const review = result[0] || result;
    res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    console.error('Review error:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});`;

if (oldReviewEndpoint) {
  content = content.replace(oldReviewEndpoint, newReviewEndpoint);
  writeFileSync('server.ts', content);
  console.log('✅ Reviews endpoint fixed');
}

console.log('✅ All patches applied');
