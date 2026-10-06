// ═══════════════════════════════════════════════════
// AI-POWERED MARKETING ENGINE
// ═══════════════════════════════════════════════════

// ─── AI Generate Property Description ──────
app.post('/api/v1/ai/description', async (req, res) => {
  try {
    const { title, type, bedrooms, bathrooms, square_feet, city, features } = req.body;
    
    const templates = {
      property: [
        `Stunning ${bedrooms}-bedroom ${type || 'property'} located in the heart of ${city || 'the city'}. This beautiful home features ${square_feet || 'spacious'} sq ft of living space${bathrooms ? ` with ${bathrooms} modern bathrooms` : ''}. Perfect for families seeking comfort and convenience.`,
        `Welcome to your dream home in ${city || 'this prime location'}! This ${type || 'property'} boasts ${bedrooms || 0} bedrooms${bathrooms ? `, ${bathrooms} bathrooms` : ''} and ${square_feet || 'ample'} sq ft of elegant living space. Don't miss this opportunity!`,
        `Discover luxury living at this exquisite ${city || ''} ${type || 'property'}. Featuring ${bedrooms || 0} bedrooms, ${square_feet || 'generous'} sq ft, and premium finishes throughout. Schedule a viewing today!`
      ],
      rental: [
        `Beautiful ${bedrooms || 0}-bedroom rental available now in ${city || 'a great location'}. Includes ${square_feet || 'spacious'} sq ft of comfort${features?.length ? ` plus ${features.join(', ')}` : ''}. Move-in ready!`,
        `Looking for the perfect rental? This ${type || 'property'} in ${city || 'the area'} offers ${bedrooms || 0} bedrooms and ${square_feet || 'ample'} sq ft. Contact us to schedule a viewing.`,
        `Prime rental opportunity in ${city || 'this neighborhood'}! ${bedrooms || 0} bedroom${bathrooms ? `, ${bathrooms} bath` : ''} with ${features?.length ? features.join(', ') : 'great amenities'}. Available immediately.`
      ],
      commercial: [
        `Prime commercial space available in ${city || 'the business district'}. ${square_feet || 'Spacious'} sq ft suitable for office, retail, or mixed use. High foot traffic area with excellent visibility.`,
        `Exceptional business opportunity in ${city || 'this location'}. This commercial property offers ${square_feet || 'generous'} sq ft of versatile space. Ideal for growing businesses.`
      ],
      land: [
        `Prime land for sale in ${city || 'a developing area'}. ${square_feet || 'Large'} sq ft plot perfect for development. Great investment opportunity with high growth potential.`,
        `Rare opportunity to own ${square_feet || 'prime'} sq ft of land in ${city || 'this location'}. Suitable for residential or commercial development.`
      ]
    };
    
    const typeKey = type || 'property';
    const options = templates[typeKey] || templates.property;
    const description = options[Math.floor(Math.random() * options.length)];
    
    const tags = [
      typeKey, city, `${bedrooms || 0}-bedroom`,
      ...(features || []).slice(0, 3),
      'property', 'home', 'real estate'
    ].filter(Boolean);
    
    res.json({
      success: true,
      data: {
        description,
        short_description: description.substring(0, 155),
        tags: [...new Set(tags)],
        seo_title: `${title} in ${city} - $${req.body.price?.toLocaleString() || 'Contact'} | HavenFinder`,
        keywords: [...new Set(tags)].join(', '),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── AI Market Analysis ─────────────────────
app.get('/api/v1/ai/market-analysis', async (_req, res) => {
  try {
    const listings = await db.selectFrom('listings')
      .select(['city', 'price', 'type', 'view_count', 'property_type'])
      .where('status', '=', 'published')
      .execute();
    
    if (listings.length === 0) {
      return res.json({ success: true, data: { message: 'No data available' } });
    }
    
    // Calculate market stats
    const prices = listings.filter(l => l.price).map(l => Number(l.price));
    const avgPrice = prices.length ? prices.reduce((a,b) => a+b, 0) / prices.length : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    
    // City analysis
    const cityMap: Record<string, { count: number, avgPrice: number, views: number }> = {};
    listings.forEach(l => {
      if (!l.city) return;
      if (!cityMap[l.city]) cityMap[l.city] = { count: 0, avgPrice: 0, views: 0 };
      cityMap[l.city].count++;
      cityMap[l.city].avgPrice += Number(l.price || 0);
      cityMap[l.city].views += Number(l.view_count || 0);
    });
    
    const cityAnalysis = Object.entries(cityMap).map(([city, data]) => ({
      city,
      listings: data.count,
      avg_price: Math.round(data.avgPrice / data.count),
      total_views: data.views,
      demand: data.views > 100 ? 'High' : data.views > 20 ? 'Medium' : 'Low',
    })).sort((a, b) => b.total_views - a.total_views);
    
    // Type analysis
    const typeMap: Record<string, number> = {};
    listings.forEach(l => { typeMap[l.type] = (typeMap[l.type] || 0) + 1; });
    
    // Generate AI insights
    const insights = [];
    if (avgPrice > 0) insights.push(`Average property price is $${Math.round(avgPrice).toLocaleString()}`);
    if (maxPrice > avgPrice * 3) insights.push('There is significant price variation in the market');
    if (cityAnalysis.length > 0) {
      const top = cityAnalysis[0];
      insights.push(`${top.city} is the most active market with ${top.total_views} views`);
    }
    const totalTypes = Object.keys(typeMap).length;
    if (totalTypes > 3) insights.push('Diverse property types available');
    
    // Recommendations
    const recommendations = [];
    if (cityAnalysis.some(c => c.demand === 'High')) {
      recommendations.push('High demand in some cities - consider adding more listings there');
    }
    if (prices.filter(p => p < avgPrice * 0.5).length > 0) {
      recommendations.push('Some properties are priced well below average - potential bargains for buyers');
    }
    if (cityAnalysis.some(c => c.demand === 'Low')) {
      recommendations.push('Some cities have low visibility - boost marketing efforts there');
    }
    
    res.json({
      success: true,
      data: {
        market_summary: {
          total_properties: listings.length,
          average_price: Math.round(avgPrice),
          price_range: `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`,
          property_types: typeMap,
        },
        city_analysis: cityAnalysis.slice(0, 10),
        ai_insights: insights,
        ai_recommendations: recommendations,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── AI Property Recommendations ────────────
app.get('/api/v1/ai/recommendations', async (req, res) => {
  try {
    const { budget, city, bedrooms } = req.query as any;
    
    let query = db.selectFrom('listings')
      .select(['id','title','price','city','state','country','bedrooms','bathrooms','square_feet','property_type','main_image_url','view_count'])
      .where('status','=','published');
    
    if (city) query = query.where('city', 'ilike', `%${city}%`);
    if (bedrooms) query = query.where('bedrooms', '>=', Number(bedrooms));
    if (budget) query = query.where('price', '<=', Number(budget));
    
    const listings = await query.orderBy('view_count', 'desc').limit(6).execute();
    
    // Generate reasons
    const recommendations = listings.map(l => {
      const reasons = [];
      if (l.view_count > 50) reasons.push('Popular choice');
      if (l.price && Number(l.price) < 3000) reasons.push('Great value');
      if (l.square_feet && l.square_feet > 1000) reasons.push('Spacious');
      if (reasons.length === 0) reasons.push('Matches your criteria');
      return { ...l, reasons };
    });
    
    res.json({ success: true, data: recommendations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── AI Email Campaign Generator ────────────
app.post('/api/v1/ai/email-campaign', async (req, res) => {
  try {
    const { campaign_type, city, price_range } = req.body;
    
    const campaigns = {
      new_listing: {
        subject: `🏠 New Properties in ${city || 'Your Area'}!`,
        body: `Exciting news! We've just added new properties${city ? ` in ${city}` : ''}${price_range ? ` under $${price_range}` : ''}. From cozy apartments to luxury villas, find your perfect match today.`
      },
      price_drop: {
        subject: `💰 Price Drops in ${city || 'Your Area'}!`,
        body: `Great news for buyers! Several properties${city ? ` in ${city}` : ''} have reduced prices. Now is the perfect time to find your dream home at a better price.`
      },
      weekly_digest: {
        subject: `📊 This Week's Top Properties`,
        body: `Check out the most viewed properties this week. From ${city || 'across the region'}, these homes are getting attention. Don't miss out!`
      },
      seasonal: {
        subject: `🎉 Seasonal Property Deals!`,
        body: `Special seasonal offers available now! Browse ${city ? city + ' and ' : ''}surrounding areas for exclusive property deals. Limited time offers.`
      }
    };
    
    const campaign = campaigns[campaign_type] || campaigns.weekly_digest;
    
    res.json({ success: true, data: campaign });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── AI SEO Generator ───────────────────────
app.post('/api/v1/ai/seo-generator', async (req, res) => {
  try {
    const { title, city, price, type } = req.body;
    
    const seo = {
      title_tag: `${title} ${city ? `in ${city}` : ''} - $${price?.toLocaleString() || 'Contact'} | HavenFinder`,
      meta_description: `View ${title}${city ? ` in ${city}` : ''}${price ? ` for $${Number(price).toLocaleString()}` : ''}. Real photos, full details, and direct owner contact on HavenFinder.`,
      keywords: [type, city, 'property', 'home', 'real estate', 'buy', 'rent'].filter(Boolean).join(', '),
      h1: title,
      h2: `${type || 'Property'} Details in ${city || 'Your Area'}`,
      url_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
    
    res.json({ success: true, data: seo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

console.log('✅ AI Marketing routes defined');
