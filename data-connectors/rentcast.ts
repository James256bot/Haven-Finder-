import { Pool } from 'pg';
import { CONFIG } from './config.ts';

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL });

interface RentCastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  price: number;
  status: string;
  listedDate: string;
  daysOnMarket: number;
  photoUrl?: string;
}

async function fetchRentCast(city: string, state: string, limit = 50) {
  if (!CONFIG.RENTCAST_API_KEY) {
    console.log(`  ⚠️  No RentCast API key - skipping ${city}`);
    return [];
  }

  console.log(`  📍 Fetching ${city}, ${state}...`);
  
  const url = `https://api.rentcast.io/v1/listings/rental/long-term?city=${city}&state=${state}&limit=${limit}&status=Active`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': CONFIG.RENTCAST_API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.log(`  ❌ RentCast error: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    console.log(`  ✅ Got ${data.length} listings from RentCast`);
    return data;
  } catch (e: any) {
    console.log(`  ❌ Error: ${e.message}`);
    return [];
  }
}

async function saveListing(listing: RentCastListing) {
  const slug = listing.formattedAddress
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 100) + '-' + listing.id;

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
      ON CONFLICT (slug) DO UPDATE SET
        price = EXCLUDED.price,
        updated_at = NOW()
    `, [
      userId,
      listing.formattedAddress,
      slug,
      `${listing.bedrooms} bed, ${listing.bathrooms} bath ${listing.propertyType} in ${listing.city}, ${listing.state}. ${listing.squareFootage} sqft. Built ${listing.yearBuilt}. Listed ${listing.daysOnMarket} days ago.`,
      'rental',
      'published',
      listing.price,
      listing.city,
      listing.state,
      'USA',
      listing.latitude,
      listing.longitude,
      listing.bedrooms,
      listing.bathrooms,
      listing.squareFootage,
      listing.propertyType,
      listing.photoUrl || `https://source.unsplash.com/800x600/?house,${listing.propertyType}`,
      listing.listedDate || new Date().toISOString(),
    ]);
    return true;
  } catch (e: any) {
    console.log(`  ⚠️  Save error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🏠 RENTCAST CONNECTOR');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  
  let totalSaved = 0;
  
  for (const city of CONFIG.CITIES) {
    const listings = await fetchRentCast(city.name, city.state, 50);
    
    for (const listing of listings) {
      if (await saveListing(listing)) totalSaved++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('');
  console.log(`✅ Total saved: ${totalSaved} real listings`);
  
  const count = await pool.query('SELECT COUNT(*) FROM listings');
  console.log(`📊 Total in DB: ${count.rows[0].count}`);
  
  await pool.end();
  process.exit(0);
}

main().catch(console.error);
