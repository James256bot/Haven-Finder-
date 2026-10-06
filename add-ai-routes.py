import re

with open('add-marketing-endpoint.ts', 'r') as f:
    content = f.read()

# Find the app.listen line
listen_marker = "app.listen(8000"

# AI routes to insert BEFORE app.listen
ai_routes = '''
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

'''

if listen_marker in content:
    content = content.replace(listen_marker, ai_routes + '\n' + listen_marker)
    with open('add-marketing-endpoint.ts', 'w') as f:
        f.write(content)
    print('✅ AI routes added to add-marketing-endpoint.ts')
else:
    print('❌ Could not find listen marker')
