import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// ── exchange rates (dev approximations; real rates come from an API later)
const RATES: Record<string, number> = { UGX: 3800, KES: 130, NGN: 1550, USD: 1 };
const toUsd = (amount: number, currency: string) =>
  (amount / (RATES[currency] ?? 1)).toFixed(2);

// ── helpers
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rint = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// ═══════════════════════════════════════════════════════════════════
// 1. Currencies
// ═══════════════════════════════════════════════════════════════════
const CURRENCIES = [
  ['UGX', 'Ugandan Shilling', 'USh', 0],
  ['KES', 'Kenyan Shilling',   'KSh', 2],
  ['NGN', 'Nigerian Naira',    '₦',   2],
  ['USD', 'US Dollar',         '$',   2],
  ['TZS', 'Tanzanian Shilling','TSh', 0],
];

async function seedCurrencies(c: any) {
  for (const [code, name, symbol, minor] of CURRENCIES) {
    await c.query(
      `INSERT INTO currencies (code, name, symbol, minor_unit)
       VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`,
      [code, name, symbol, minor],
    );
  }
  console.log(`  ✓ currencies: ${CURRENCIES.length}`);
}

// ═══════════════════════════════════════════════════════════════════
// 2. Locations (hierarchical: country → city → neighborhood)
// ═══════════════════════════════════════════════════════════════════
type Loc = {
  country: string; countryCode: string; timezone: string; currency: string;
  city: string; cityLat: number; cityLng: number;
  hoods: [string, number, number][];
};

const LOCATIONS: Loc[] = [
  {
    country: 'Uganda', countryCode: 'UG', timezone: 'Africa/Kampala', currency: 'UGX',
    city: 'Kampala', cityLat: 0.3136, cityLng: 32.5811,
    hoods: [
      ['Kololo',    0.3341, 32.5914],
      ['Ntinda',    0.3606, 32.6125],
      ['Kisaasi',   0.3821, 32.6205],
      ['Naguru',    0.3392, 32.6081],
      ['Bukoto',    0.3450, 32.6001],
      ['Muyenga',   0.2907, 32.6114],
      ['Kira',      0.3975, 32.6630],
      ['Kyanja',    0.3838, 32.6310],
      ['Makindye',  0.2820, 32.5910],
      ['Wakiso',    0.4040, 32.4590],
    ],
  },
  {
    country: 'Kenya', countryCode: 'KE', timezone: 'Africa/Nairobi', currency: 'KES',
    city: 'Nairobi', cityLat: -1.2921, cityLng: 36.8219,
    hoods: [
      ['Westlands', -1.2686, 36.8110],
      ['Karen',     -1.3390, 36.7070],
      ['Kilimani',  -1.2900, 36.7870],
    ],
  },
  {
    country: 'Nigeria', countryCode: 'NG', timezone: 'Africa/Lagos', currency: 'NGN',
    city: 'Lagos', cityLat: 6.5244, cityLng: 3.3792,
    hoods: [
      ['Lekki',            6.4500, 3.4700],
      ['Ikoyi',            6.4541, 3.4348],
      ['Victoria Island',  6.4281, 3.4219],
    ],
  },
];

async function seedLocations(c: any) {
  let count = 0;
  const idBySlug: Record<string, string> = {};

  for (const L of LOCATIONS) {
    // Country
    let r = await c.query(
      `INSERT INTO locations (type, country_code, name, slug, timezone, default_currency, latitude, longitude)
       VALUES ('country',$1,$2,$3,$4,$5,NULL,NULL)
       ON CONFLICT (country_code, parent_id, slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [L.countryCode, L.country, slugify(L.country), L.timezone, L.currency],
    );
    const countryId = r.rows[0].id;
    idBySlug[`${L.countryCode}:${slugify(L.country)}`] = countryId;
    count++;

    // City
    r = await c.query(
      `INSERT INTO locations (parent_id, type, country_code, name, slug, timezone, default_currency, latitude, longitude)
       VALUES ($1,'city',$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (country_code, parent_id, slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [countryId, L.countryCode, L.city, slugify(L.city), L.timezone, L.currency, L.cityLat, L.cityLng],
    );
    const cityId = r.rows[0].id;
    idBySlug[`${L.countryCode}:${slugify(L.city)}`] = cityId;
    count++;

    // Neighborhoods
    for (const [name, lat, lng] of L.hoods) {
      r = await c.query(
        `INSERT INTO locations (parent_id, type, country_code, name, slug, timezone, default_currency, latitude, longitude)
         VALUES ($1,'neighborhood',$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (country_code, parent_id, slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cityId, L.countryCode, name, slugify(name), L.timezone, L.currency, lat, lng],
      );
      idBySlug[`${L.countryCode}:${slugify(name)}`] = r.rows[0].id;
      count++;
    }
  }
  console.log(`  ✓ locations: ${count}`);
  return idBySlug;
}

// ═══════════════════════════════════════════════════════════════════
// 3. Amenities
// ═══════════════════════════════════════════════════════════════════
const AMENITIES: [string, string, string][] = [
  ['parking',           'Parking',            'exterior'],
  ['security-24-7',     '24/7 Security',      'safety'],
  ['security-guard',    'Security Guard',     'safety'],
  ['cctv',              'CCTV',               'safety'],
  ['generator',         'Backup Generator',   'utilities'],
  ['solar',             'Solar Power',        'utilities'],
  ['borehole-water',    'Borehole Water',     'utilities'],
  ['piped-water',       'Piped Water',        'utilities'],
  ['internet-fibre',    'Fibre Internet',     'utilities'],
  ['wifi',              'Wi-Fi',              'utilities'],
  ['swimming-pool',     'Swimming Pool',      'leisure'],
  ['gym',               'Gym',                'leisure'],
  ['garden',            'Garden',             'exterior'],
  ['balcony',           'Balcony',            'exterior'],
  ['air-conditioning',  'Air Conditioning',   'comfort'],
  ['furnished',         'Furnished',          'comfort'],
  ['servant-quarters',  'Servant Quarters',   'exterior'],
  ['pet-friendly',      'Pet Friendly',       'lifestyle'],
  ['gated-community',   'Gated Community',    'safety'],
  ['lift',              'Elevator',           'building'],
];

async function seedAmenities(c: any) {
  for (const [slug, name, cat] of AMENITIES) {
    await c.query(
      `INSERT INTO amenities (slug, name, category, is_active)
       VALUES ($1,$2,$3,true)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [slug, name, cat],
    );
  }
  console.log(`  ✓ amenities: ${AMENITIES.length}`);
}

// ═══════════════════════════════════════════════════════════════════
// 4. Users (roles use existing CHECK: user | owner | provider | admin | super_admin)
// ═══════════════════════════════════════════════════════════════════
const USERS = [
  // admins
  { email: 'admin@havenfinder.test',        name: 'Aisha Nakato',     role: 'admin',       country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'superadmin@havenfinder.test',   name: 'Daniel Ssekandi',  role: 'super_admin', country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  // owners
  { email: 'owner1@havenfinder.test',       name: 'Grace Nabwire',    role: 'owner',       country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'owner2@havenfinder.test',       name: 'Samuel Okello',    role: 'owner',       country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'owner3@havenfinder.test',       name: 'Patricia Auma',    role: 'owner',       country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'owner4@havenfinder.test',       name: 'Joseph Muwanga',   role: 'owner',       country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'owner5@havenfinder.test',       name: 'Sarah Kirabo',     role: 'owner',       country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  // agents (mapped to 'provider' role)
  { email: 'agent1@havenfinder.test',       name: 'Brian Kigozi',     role: 'provider',    country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'agent2@havenfinder.test',       name: 'Mercy Atim',       role: 'provider',    country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'agent3@havenfinder.test',       name: 'Ibrahim Ssali',    role: 'provider',    country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'agent4@havenfinder.test',       name: 'Florence Adongo',  role: 'provider',    country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'agent5@havenfinder.test',       name: 'Peter Kiwanuka',   role: 'provider',    country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  // regular users
  { email: 'user1@havenfinder.test',        name: 'Linda Apio',       role: 'user',        country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'user2@havenfinder.test',        name: 'Kevin Tumwine',    role: 'user',        country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'user3@havenfinder.test',        name: 'Rose Kabatesi',    role: 'user',        country: 'UG', locale: 'en-UG', tz: 'Africa/Kampala', cur: 'UGX' },
  { email: 'user4@havenfinder.test',        name: 'Michael Barasa',   role: 'user',        country: 'KE', locale: 'en-KE', tz: 'Africa/Nairobi', cur: 'KES' },
  { email: 'user5@havenfinder.test',        name: 'Chiamaka Obi',     role: 'user',        country: 'NG', locale: 'en-NG', tz: 'Africa/Lagos',   cur: 'NGN' },
];

// Argon2id hash of "Password123!" — placeholder ONLY. Phase 1 will replace this
// with real per-user hashing using @node-rs/argon2.
const SEED_PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2VlZC1vbmx5LXNhbHQtbm90LXByb2R1Y3Rpb24$SEEDONLYHASHNOTREALxxxxxxxxxxxxxxxxxxxx';

async function seedUsers(c: any) {
  const ids: { role: string; id: string; country: string }[] = [];
  for (const u of USERS) {
    const r = await c.query(
      `INSERT INTO users
         (email, password_hash, full_name, role, country_code, locale, timezone, preferred_currency, verification, email_verified, email_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'verified',true,now())
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id, role`,
      [u.email, SEED_PASSWORD_HASH, u.name, u.role, u.country, u.locale, u.tz, u.cur],
    );
    ids.push({ role: r.rows[0].role, id: r.rows[0].id, country: u.country });
  }
  console.log(`  ✓ users: ${USERS.length} (5 owners, 5 agents, 5 users, 2 admins)`);
  return ids;
}

// ═══════════════════════════════════════════════════════════════════
// 5. Listings — 40 Kampala + 5 Nairobi + 5 Lagos
// ═══════════════════════════════════════════════════════════════════
const KAMPALA_TEMPLATES = [
  { pt: 'apartment', beds: 1, baths: 1, sqm: 55,  rent: [800_000, 1_500_000],  listing: 'rent' },
  { pt: 'apartment', beds: 2, baths: 2, sqm: 90,  rent: [1_200_000, 2_500_000], listing: 'rent' },
  { pt: 'apartment', beds: 3, baths: 2, sqm: 130, rent: [2_000_000, 4_000_000], listing: 'rent' },
  { pt: 'studio',    beds: 0, baths: 1, sqm: 35,  rent: [500_000, 1_200_000],  listing: 'rent' },
  { pt: 'house',     beds: 3, baths: 2, sqm: 180, rent: [2_500_000, 5_000_000], listing: 'rent' },
  { pt: 'house',     beds: 4, baths: 3, sqm: 250, rent: [4_000_000, 8_000_000], listing: 'rent' },
  { pt: 'villa',     beds: 5, baths: 4, sqm: 400, rent: [8_000_000, 15_000_000],listing: 'rent' },
  { pt: 'room',      beds: 1, baths: 1, sqm: 20,  rent: [300_000, 800_000],    listing: 'rent' },
  { pt: 'hostel',    beds: 1, baths: 1, sqm: 15,  rent: [250_000, 600_000],    listing: 'rent' },
  { pt: 'guest_house',beds: 2,baths: 1, sqm: 60,  rent: [180_000, 450_000],    listing: 'short_stay', period: 'nightly' },
  { pt: 'apartment', beds: 2, baths: 2, sqm: 95,  rent: [150_000, 400_000],    listing: 'short_stay', period: 'nightly' },
  { pt: 'office',    beds: 0, baths: 2, sqm: 120, rent: [2_000_000, 6_000_000], listing: 'commercial_lease' },
  { pt: 'shop',      beds: 0, baths: 1, sqm: 40,  rent: [800_000, 2_500_000],  listing: 'commercial_lease' },
  { pt: 'land',      beds: 0, baths: 0, sqm: 600, rent: [80_000_000, 400_000_000], listing: 'land_sale', period: 'total' },
  { pt: 'house',     beds: 4, baths: 3, sqm: 260, rent: [350_000_000, 900_000_000], listing: 'sale', period: 'total' },
];

const NAIROBI_TEMPLATES = [
  { pt: 'apartment', beds: 2, baths: 2, sqm: 90, rent: [60_000, 150_000], listing: 'rent' },
  { pt: 'house',     beds: 4, baths: 3, sqm: 220, rent: [120_000, 300_000], listing: 'rent' },
  { pt: 'villa',     beds: 5, baths: 4, sqm: 380, rent: [300_000, 700_000], listing: 'rent' },
  { pt: 'apartment', beds: 1, baths: 1, sqm: 55, rent: [8_000, 25_000],    listing: 'short_stay', period: 'nightly' },
  { pt: 'land',      beds: 0, baths: 0, sqm: 500, rent: [15_000_000, 60_000_000], listing: 'land_sale', period: 'total' },
];

const LAGOS_TEMPLATES = [
  { pt: 'apartment', beds: 2, baths: 2, sqm: 85, rent: [1_500_000, 4_500_000], listing: 'rent' },
  { pt: 'house',     beds: 4, baths: 3, sqm: 240, rent: [4_000_000, 12_000_000], listing: 'rent' },
  { pt: 'studio',    beds: 0, baths: 1, sqm: 35, rent: [700_000, 2_000_000],    listing: 'rent' },
  { pt: 'apartment', beds: 2, baths: 2, sqm: 95, rent: [80_000, 250_000],       listing: 'short_stay', period: 'nightly' },
  { pt: 'land',      beds: 0, baths: 0, sqm: 600, rent: [30_000_000, 200_000_000], listing: 'land_sale', period: 'total' },
];

const TITLE_WORDS = {
  apartment: ['Modern', 'Spacious', 'Elegant', 'Cozy', 'Bright', 'Luxury'],
  house:     ['Charming', 'Family', 'Executive', 'Gated', 'Serene', 'Modern'],
  villa:     ['Luxury', 'Executive', 'Grand', 'Premium', 'Stately'],
  studio:    ['Compact', 'Smart', 'Studio', 'Minimalist'],
  room:      ['Private', 'Furnished', 'Budget', 'Clean'],
  hostel:    ['Student', 'Budget', 'Affordable', 'Shared'],
  guest_house:['Comfortable', 'Charming', 'Guest'],
  office:    ['Prime', 'Modern', 'Corporate', 'Grade-A'],
  shop:      ['High-Traffic', 'Corner', 'Prime Retail'],
  land:      ['Prime', 'Ready-to-Build', 'Titled', 'Investment'],
};

function titleFor(pt: string, beds: number, hood: string) {
  const adj = pick(TITLE_WORDS[pt as keyof typeof TITLE_WORDS] ?? ['Nice']);
  const bed = beds > 0 ? `${beds}-Bedroom ` : '';
  const noun = pt.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return `${adj} ${bed}${noun} in ${hood}`;
}

function descFor(pt: string, beds: number, baths: number, sqm: number, hood: string, listing: string) {
  const bed = beds > 0 ? `${beds} bedroom${beds>1?'s':''}, ` : '';
  const bath = baths > 0 ? `${baths} bathroom${baths>1?'s':''}, ` : '';
  const verb = listing === 'sale' || listing === 'land_sale' ? 'for sale' : listing === 'short_stay' ? 'available for short stays' : 'available for rent';
  return `This ${pt.replace('_',' ')} is ${verb} in ${hood}. Features ${bed}${bath}approximately ${sqm} sqm. Located in a well-connected neighborhood with easy access to shops, schools, and public transport. Suitable for professionals, families, or students. Contact owner for viewing.`;
}

async function seedListings(c: any, locationIds: Record<string, string>, userIds: { role: string; id: string; country: string }[]) {
  const owners  = userIds.filter(u => u.role === 'owner'    || u.role === 'provider').map(u => u.id);
  const agents  = userIds.filter(u => u.role === 'provider').map(u => u.id);
  const pool_   = [...owners, ...agents];

  const groups: { country: string; city: string; hoods: string[]; currency: string; templates: any[] }[] = [
    { country: 'UG', city: 'kampala', currency: 'UGX', hoods: LOCATIONS[0].hoods.map(h => h[0]), templates: KAMPALA_TEMPLATES },
    { country: 'KE', city: 'nairobi', currency: 'KES', hoods: LOCATIONS[1].hoods.map(h => h[0]), templates: NAIROBI_TEMPLATES },
    { country: 'NG', city: 'lagos',   currency: 'NGN', hoods: LOCATIONS[2].hoods.map(h => h[0]), templates: LAGOS_TEMPLATES },
  ];

  const countPerGroup = [40, 5, 5];
  let created = 0;

  for (let g = 0; g < groups.length; g++) {
    const G = groups[g];
    for (let i = 0; i < countPerGroup[g]; i++) {
      const t = pick(G.templates);
      const hood = pick(G.hoods);
      const locId = locationIds[`${G.country}:${slugify(hood)}`];
      if (!locId) continue;

      const [minP, maxP] = t.rent;
      const amount = rint(minP, maxP);
      const period = t.period ?? (t.listing === 'sale' || t.listing === 'land_sale' ? 'total' : 'monthly');
      const title = titleFor(t.pt, t.beds, hood);
      const slug = `seed-${G.country.toLowerCase()}-${slugify(hood)}-${slugify(t.pt)}-${i+1}-${Math.random().toString(36).slice(2,7)}`;
      const owner = pick(pool_);
      const lat = (LOCATIONS[g].hoods.find(h => h[0] === hood)?.[1] ?? LOCATIONS[g].cityLat) + (Math.random() - 0.5) * 0.01;
      const lng = (LOCATIONS[g].hoods.find(h => h[0] === hood)?.[2] ?? LOCATIONS[g].cityLng) + (Math.random() - 0.5) * 0.01;
      const status = Math.random() < 0.85 ? 'published' : 'draft';
      const verification = Math.random() < 0.5 ? 'verified' : 'unverified';
      const furnishing = pick(['unfurnished', 'semi_furnished', 'furnished']);
      const availability = pick(['available_now', 'available_now', 'available_soon']);

      await c.query(
        `INSERT INTO listings (
           user_id, title, slug, description,
           type, status, price, currency,
           city, state, country, latitude, longitude,
           bedrooms, bathrooms, square_feet, property_type,
           main_image_url, published_at,
           listing_type, country_code, location_id,
           price_period, price_amount, price_usd_cents,
           floor_area_sqm, furnishing, availability, verification,
           is_seed, is_featured
         ) VALUES (
           $1,$2,$3,$4,
           'property','published',$5,$6,
           $7,$8,$9,$10,$11,
           $12,$13,$14,$15,
           $16,$17,
           $18,$19,$20,
           $21,$22,$23,
           $24,$25,$26,$27,
           true,$28
         ) ON CONFLICT (slug) DO NOTHING`,
        [
          owner, title, slug, descFor(t.pt, t.beds, t.baths, t.sqm, hood, t.listing),
          amount, G.currency,
          LOCATIONS[g].city, '', LOCATIONS[g].country, lat, lng,
          t.beds, t.baths, Math.round(t.sqm * 10.7639), t.pt,
          `https://picsum.photos/seed/${slug}/1200/800`,
          status === 'published' ? new Date() : null,
          t.listing, G.country, locId,
          period, amount, toUsd(amount, G.currency),
          t.sqm, furnishing, availability, verification,
          Math.random() < 0.1,
        ],
      );
      created++;
    }
  }
  console.log(`  ✓ listings: ${created} created (40 UG, 5 KE, 5 NG)`);
}

// ═══════════════════════════════════════════════════════════════════
// 6. Hide pre-existing connector rows from public view
// ═══════════════════════════════════════════════════════════════════
async function hideLegacyRows(c: any) {
  const r = await c.query(
    `UPDATE listings
       SET status = 'draft'
     WHERE is_seed = false
       AND listing_type IS NULL`,
  );
  console.log(`  ✓ legacy listings set to draft: ${r.rowCount}`);
}

// ═══════════════════════════════════════════════════════════════════
// main
// ═══════════════════════════════════════════════════════════════════
async function main() {
  const reset = process.argv.includes('--reset');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (reset) {
      console.log('  ⚠️  --reset: deleting all seed data');
      await client.query(`DELETE FROM listings WHERE is_seed = true`);
      await client.query(`DELETE FROM users WHERE email LIKE '%@havenfinder.test'`);
      await client.query(`DELETE FROM locations WHERE country_code IN ('UG','KE','NG')`);
      await client.query(`DELETE FROM amenities`);
    }

    console.log('🌱 Seeding HavenFinder…');
    await seedCurrencies(client);
    const locationIds = await seedLocations(client);
    await seedAmenities(client);
    const userIds = await seedUsers(client);
    await seedListings(client, locationIds, userIds);
    await hideLegacyRows(client);

    await client.query('COMMIT');

    const totals = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM listings)    AS listings,
        (SELECT COUNT(*) FROM listings WHERE is_seed = true) AS seeded_listings,
        (SELECT COUNT(*) FROM users)       AS users,
        (SELECT COUNT(*) FROM locations)   AS locations,
        (SELECT COUNT(*) FROM amenities)   AS amenities,
        (SELECT COUNT(*) FROM currencies)  AS currencies
    `);
    console.log('✅ Seed complete:', totals.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
