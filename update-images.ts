import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder' });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

// Real property images from Unsplash (free stock photos)
const propertyImages = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', // Apartment
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop', // Luxury house
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop', // Villa
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', // Modern house
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop', // House exterior
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop', // Interior
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop', // Home
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop', // Pool house
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=600&fit=crop', // Interior
  'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&h=600&fit=crop', // Apartment
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop', // Modern
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop', // Interior
  'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop', // Home
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800&h=600&fit=crop', // Interior
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop', // Pool
  'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800&h=600&fit=crop', // Interior
  'https://images.unsplash.com/photo-1600607688066-890987f18a86?w=800&h=600&fit=crop', // Living room
  'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&h=600&fit=crop', // House
  'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&h=600&fit=crop', // Kitchen
];

async function updateListings() {
  console.log('🏠 Updating listings with real images...');
  
  // Get all listings
  const listings = await db.selectFrom('listings').selectAll().execute();
  
  for (let i = 0; i < listings.length; i++) {
    const imageUrl = propertyImages[i % propertyImages.length];
    await db.updateTable('listings')
      .set({ main_image_url: imageUrl })
      .where('id', '=', listings[i].id)
      .execute();
  }
  
  console.log(`✅ Updated ${listings.length} listings with real images`);
  
  // Create sample listings with real data if database is empty
  if (listings.length === 0) {
    console.log('📝 Creating sample listings with real images...');
    
    const sampleListings = [
      {
        title: 'Modern Luxury Villa with Pool',
        description: 'Stunning 5-bedroom villa featuring an infinity pool, panoramic city views, and designer interiors throughout.',
        price: 12500, city: 'Beverly Hills', state: 'CA', bedrooms: 5, bathrooms: 5,
        square_feet: 5500, property_type: 'villa', image: propertyImages[4],
      },
      {
        title: 'Downtown Penthouse Suite',
        description: 'Spectacular penthouse with floor-to-ceiling windows, private terrace, and 360-degree skyline views.',
        price: 8500, city: 'San Francisco', state: 'CA', bedrooms: 3, bathrooms: 3,
        square_feet: 2800, property_type: 'penthouse', image: propertyImages[2],
      },
      {
        title: 'Charming Family Home',
        description: 'Beautiful 4-bedroom family home in a quiet neighborhood with a large backyard and modern kitchen.',
        price: 4500, city: 'Palo Alto', state: 'CA', bedrooms: 4, bathrooms: 3,
        square_feet: 2400, property_type: 'house', image: propertyImages[0],
      },
      {
        title: 'Cozy Studio Apartment',
        description: 'Perfect starter apartment with abundant natural light, in-unit laundry, and great location.',
        price: 1800, city: 'Berkeley', state: 'CA', bedrooms: 0, bathrooms: 1,
        square_feet: 500, property_type: 'studio', image: propertyImages[3],
      },
      {
        title: 'Waterfront Condo with Marina View',
        description: 'Luxurious 2-bedroom condo overlooking the marina with resort-style amenities.',
        price: 6200, city: 'San Diego', state: 'CA', bedrooms: 2, bathrooms: 2,
        square_feet: 1400, property_type: 'condo', image: propertyImages[9],
      },
      {
        title: 'Modern Office Space',
        description: 'Prime commercial space in the financial district with open floor plan and modern finishes.',
        price: 7500, city: 'San Francisco', state: 'CA', bedrooms: null, bathrooms: null,
        square_feet: 3200, property_type: 'office', image: propertyImages[13],
      },
      {
        title: 'Suburban Dream Home',
        description: 'Spacious 3-bedroom home with a private garden, perfect for families seeking tranquility.',
        price: 3200, city: 'San Jose', state: 'CA', bedrooms: 3, bathrooms: 2,
        square_feet: 1800, property_type: 'house', image: propertyImages[7],
      },
      {
        title: 'Luxury Apartment with Rooftop',
        description: 'Modern 2-bedroom apartment featuring a shared rooftop deck with BBQ area.',
        price: 2800, city: 'Los Angeles', state: 'CA', bedrooms: 2, bathrooms: 2,
        square_feet: 1100, property_type: 'apartment', image: propertyImages[11],
      },
    ];
    
    // Get first user (admin/owner)
    const user = await db.selectFrom('users').select('id').limit(1).executeTakeFirst();
    
    if (user) {
      for (const l of sampleListings) {
        const slug = l.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
        await db.insertInto('listings').values({
          user_id: user.id, title: l.title, slug, description: l.description,
          type: 'property', status: 'published', price: l.price,
          city: l.city, state: l.state, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
          square_feet: l.square_feet, property_type: l.property_type,
          main_image_url: l.image, published_at: new Date().toISOString(),
        }).execute();
      }
      console.log(`✅ Created ${sampleListings.length} sample listings with real images`);
    }
  }
  
  await pool.end();
  process.exit(0);
}

updateListings().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
