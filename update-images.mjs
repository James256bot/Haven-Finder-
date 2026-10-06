import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder' });

const images = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
];

async function main() {
  console.log('🏠 Adding real images to listings...');
  
  // Check if main_image_url column exists
  try {
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS main_image_url TEXT");
    console.log('✅ Column exists');
  } catch (e) {
    console.log('Column check:', e.message);
  }
  
  // Get existing listings
  const existing = await pool.query('SELECT id FROM listings');
  console.log(`Found ${existing.rows.length} existing listings`);
  
  // Update existing listings with images
  for (let i = 0; i < existing.rows.length; i++) {
    const img = images[i % images.length];
    await pool.query('UPDATE listings SET main_image_url = $1 WHERE id = $2', [img, existing.rows[i].id]);
  }
  console.log(`✅ Updated ${existing.rows.length} listings`);
  
  // Create sample listings if less than 5
  if (existing.rows.length < 5) {
    console.log('📝 Creating sample listings...');
    
    const samples = [
      ['Modern Luxury Villa', 'Stunning 5-bedroom villa with pool', 12500, 'Beverly Hills', 'CA', 5, 5, 5500, 'villa', images[4]],
      ['Downtown Penthouse', 'Spectacular penthouse with views', 8500, 'San Francisco', 'CA', 3, 3, 2800, 'penthouse', images[2]],
      ['Family Home', 'Beautiful family home with backyard', 4500, 'Palo Alto', 'CA', 4, 3, 2400, 'house', images[0]],
      ['Cozy Studio', 'Perfect starter apartment', 1800, 'Berkeley', 'CA', 0, 1, 500, 'studio', images[3]],
      ['Waterfront Condo', 'Luxury condo with marina view', 6200, 'San Diego', 'CA', 2, 2, 1400, 'condo', images[5]],
    ];
    
    // Get a user ID
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      for (const [title, desc, price, city, state, beds, baths, sqft, type, img] of samples) {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
        await pool.query(
          'INSERT INTO listings (user_id, title, slug, description, type, status, price, city, state, bedrooms, bathrooms, square_feet, property_type, main_image_url, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
          [userId, title, slug, desc, 'property', 'published', price, city, state, beds, baths, sqft, type, img, new Date().toISOString()]
        );
      }
      console.log(`✅ Created ${samples.length} sample listings`);
    }
  }
  
  await pool.end();
  console.log('✅ Done!');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
