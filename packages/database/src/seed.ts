import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder'
});
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

async function seed() {
  console.log('🌱 Seeding database...');
  
  const hash = await bcrypt.hash('Password123!', 10);
  
  // Admin user
  await sql`INSERT INTO users (email, password_hash, full_name, role, email_verified) VALUES ('admin@havenfinder.com', ${hash}, 'Admin User', 'super_admin', true) ON CONFLICT (email) DO NOTHING`.execute(db);
  
  // Test user
  await sql`INSERT INTO users (email, password_hash, full_name, role, email_verified) VALUES ('user@havenfinder.com', ${hash}, 'Test User', 'user', true) ON CONFLICT (email) DO NOTHING`.execute(db);
  
  // Owner user
  await sql`INSERT INTO users (email, password_hash, full_name, role, email_verified) VALUES ('owner@havenfinder.com', ${hash}, 'Property Owner', 'owner', true) ON CONFLICT (email) DO NOTHING`.execute(db);
  
  // Categories
  const categories = [
    { name: 'Apartments', slug: 'apartments', icon: 'building' },
    { name: 'Houses', slug: 'houses', icon: 'home' },
    { name: 'Condos', slug: 'condos', icon: 'building-2' },
    { name: 'Townhouses', slug: 'townhouses', icon: 'building' },
    { name: 'Land', slug: 'land', icon: 'trees' },
    { name: 'Commercial', slug: 'commercial', icon: 'briefcase' },
    { name: 'Short-term', slug: 'short-term', icon: 'calendar' },
    { name: 'Services', slug: 'services', icon: 'wrench' },
  ];
  
  for (const c of categories) {
    await sql`INSERT INTO categories (name, slug, icon) VALUES (${c.name}, ${c.slug}, ${c.icon}) ON CONFLICT (slug) DO NOTHING`.execute(db);
  }
  
  // Amenities
  const amenities = [
    'Parking', 'Swimming Pool', 'Gym', 'Pet Friendly', 'Laundry',
    'Furnished', 'Balcony', 'Air Conditioning', 'Heating', 'Security',
    'Elevator', 'Storage', 'Internet', 'Garden', 'Rooftop', 'Concierge',
  ];
  
  for (const a of amenities) {
    await sql`INSERT INTO amenities (name, slug, category) VALUES (${a}, ${a.toLowerCase().replace(/\s+/g, '-')}, 'property') ON CONFLICT (slug) DO NOTHING`.execute(db);
  }
  
  console.log('✅ Seed complete!');
  console.log('');
  console.log('👤 Users:');
  console.log('   Admin: admin@havenfinder.com / Password123!');
  console.log('   User:  user@havenfinder.com / Password123!');
  console.log('   Owner: owner@havenfinder.com / Password123!');
  console.log('');
  console.log(`📁 ${categories.length} categories created`);
  console.log(`🏗️  ${amenities.length} amenities created`);
  
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
