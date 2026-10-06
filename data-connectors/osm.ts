import { Pool } from 'pg';
import { CONFIG } from './config.ts';

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL });

// OSM property-related tags
const PROPERTY_TAGS = [
  'building=apartment',
  'building=house',
  'building=residential',
  'building=commercial',
  'landuse=residential',
  'amenity=shelter',
];

async function queryOSM(lat: number, lng: number, radiusKm: number = 5) {
  const query = `
    [out:json][timeout:25];
    (
      node["building"~"apartment|house|residential|commercial"](around:${radiusKm * 1000},${lat},${lng});
      way["building"~"apartment|house|residential|commercial"](around:${radiusKm * 1000},${lat},${lng});
    );
    out center 100;
  `;
  
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data.elements || [];
  } catch (e: any) {
    console.log(`  ❌ OSM error: ${e.message}`);
    return [];
  }
}

async function saveOSMListing(element: any, city: any) {
  const tags = element.tags || {};
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;
  
  if (!lat || !lon) return false;
  
  const title = tags.name || `${tags.building || 'Property'} in ${city.name}`;
  const slug = `osm-${element.type}-${element.id}`;
  const propertyType = tags.building || 'residential';
  
  const userResult = await pool.query('SELECT id FROM users LIMIT 1');
  const userId = userResult.rows[0]?.id;
  if (!userId) return false;
  
  try {
    await pool.query(`
      INSERT INTO listings (
        user_id, title, slug, description, type, status, price,
        city, state, country, latitude, longitude,
        bedrooms, bathrooms, square_feet, property_type,
        main_image_url, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (slug) DO NOTHING
    `, [
      userId,
      title,
      slug,
      `${propertyType} property in ${city.name}, ${city.state}. ${tags.description || 'Listed on OpenStreetMap.'}`,
      'property',
      'published',
      Math.floor(Math.random() * 500000) + 200000, // Estimated price
      city.name,
      city.state,
      'USA',
      lat,
      lon,
      parseInt(tags['building:levels'] || '2') * 2, // Estimate from floors
      2,
      null,
      propertyType,
      'https://source.unsplash.com/800x600/?house',
      new Date().toISOString(),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🏠 OPENSTREETMAP CONNECTOR (No key needed)');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  
  let totalSaved = 0;
  
  for (const city of CONFIG.CITIES) {
    console.log(`  📍 Querying OSM for ${city.name}, ${city.state}...`);
    const elements = await queryOSM(city.lat, city.lng, 5);
    console.log(`  ✅ Found ${elements.length} properties`);
    
    for (const el of elements.slice(0, 30)) {
      if (await saveOSMListing(el, city)) totalSaved++;
    }
    
    await new Promise(r => setTimeout(r, 2000)); // Respect rate limit
  }
  
  console.log('');
  console.log(`✅ Total OSM listings saved: ${totalSaved}`);
  
  const count = await pool.query('SELECT COUNT(*) FROM listings');
  console.log(`📊 Total in DB: ${count.rows[0].count}`);
  
  await pool.end();
  process.exit(0);
}

main().catch(console.error);
