import { Pool } from 'pg';
import { CONFIG } from './config.ts';

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL });

async function fetchRealtor(city: string, state: string, limit = 50) {
  if (!CONFIG.RAPIDAPI_KEY) {
    console.log(`  ⚠️  No RapidAPI key - skipping ${city}`);
    return [];
  }

  console.log(`  📍 Fetching ${city}, ${state}...`);
  
  try {
    const res = await fetch(
      `https://realtor16.p.rapidapi.com/for-sale?location=${city}%2C%20${state}&limit=${limit}`,
      {
        headers: {
          'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'realtor16.p.rapidapi.com',
        },
      }
    );
    
    if (!res.ok) {
      console.log(`  ❌ Realtor API error: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const listings = data.data?.home_search?.results || [];
    console.log(`  ✅ Got ${listings.length} listings`);
    return listings;
  } catch (e: any) {
    console.log(`  ❌ Error: ${e.message}`);
    return [];
  }
}

async function saveRealtorListing(listing: any, city: any) {
  const userResult = await pool.query('SELECT id FROM users LIMIT 1');
  const userId = userResult.rows[0]?.id;
  if (!userId) return false;

  const loc = listing.location?.address || {};
  const desc = listing.description || {};
  const photo = listing.photos?.[0]?.href || 'https://source.unsplash.com/800x600/?house';
  
  const slug = `realtor-${listing.property_id}`;
  
  try {
    await pool.query(`
      INSERT INTO listings (
        user_id, title, slug, description, type, status, price,
        city, state, country, latitude, longitude,
        bedrooms, bathrooms, square_feet, property_type,
        main_image_url, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (slug) DO UPDATE SET
        price = EXCLUDED.price,
        updated_at = NOW()
    `, [
      userId,
      loc.line || listing.property_id,
      slug,
      desc.text || `Property for sale in ${city.name}`,
      'property',
      'published',
      listing.list_price || 0,
      city.name,
      city.state,
      'USA',
      listing.location?.coordinate?.lat || city.lat,
      listing.location?.coordinate?.lon || city.lng,
      desc.beds || 3,
      desc.baths || 2,
      desc.sqft || 1500,
      desc.type || 'house',
      photo,
      new Date().toISOString(),
    ]);
    return true;
  } catch (e: any) {
    return false;
  }
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🏠 REALTOR.COM CONNECTOR');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  
  let totalSaved = 0;
  
  for (const city of CONFIG.CITIES) {
    const listings = await fetchRealtor(city.name, city.state, 50);
    
    for (const listing of listings) {
      if (await saveRealtorListing(listing, city)) totalSaved++;
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log('');
  console.log(`✅ Total realtor listings saved: ${totalSaved}`);
  
  const count = await pool.query('SELECT COUNT(*) FROM listings');
  console.log(`📊 Total in DB: ${count.rows[0].count}`);
  
  await pool.end();
  process.exit(0);
}

main().catch(console.error);
