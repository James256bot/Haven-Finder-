import { Pool } from 'pg';
import 'dotenv/config';
import { createHash } from 'node:crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const KEY  = process.env.UNTERA_API_KEY!;
const BASE = 'https://api.untera.io/api/v1';

// Image host — swap based on which URL loads in the browser.
// If https://untera.io/images/... loads → leave as-is.
// If https://api.untera.io/images/... loads → change to that.
const IMAGE_HOST = 'https://api.untera.io';

const TARGET_COUNTRIES = ['UG','KE','NG','ZA','PT','ES','IT','GR','MX','JP'];

const RATES_TO_USD: Record<string, number> = {
  UGX: 3800, KES: 130, NGN: 1550, ZAR: 18, EUR: 0.92, USD: 1, MXN: 17, JPY: 150,
};
const toUsd = (amt: number, cur: string) => (amt / (RATES_TO_USD[cur] ?? 1)).toFixed(2);

// ─── property_subtype → our property_type values ─────────────
function mapPropertyType(subtype?: string | null, type?: string | null): string | null {
  const s = (subtype ?? '').toLowerCase();
  const t = (type ?? '').toLowerCase();
  const map: Record<string, string> = {
    apartment: 'apartment', flat: 'apartment',
    house: 'house', 'single family': 'house', townhouse: 'house',
    villa: 'villa', condo: 'condo', condominium: 'condo',
    studio: 'studio', room: 'room',
    hostel: 'hostel', 'guest house': 'guest_house', guesthouse: 'guest_house',
    office: 'office', shop: 'shop', retail: 'shop',
    warehouse: 'warehouse', restaurant: 'restaurant_space',
    land: 'land', plot: 'land', farm: 'farm',
    hotel: 'hotel', lodge: 'lodge',
  };
  if (map[s]) return map[s];
  if (t === 'commercial') return 'commercial_building';
  if (t === 'land') return 'land';
  if (t === 'residential') return 'house';
  return null;
}

// ─── "Puerto Aventuras, Quintana Roo, Mexico" → city guess ────
function parseCity(address?: string | null, country?: string): string | null {
  if (!address) return null;
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  // Second-to-last is usually the state/region; first is city
  return parts[0] ?? null;
}

// ─── Build absolute image URL ────────────────────────────────
function absolutizeImage(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Untera only serves /images/... paths — other raw paths 404 at the source
  if (!path.includes('/images/')) return null;
  return IMAGE_HOST + (path.startsWith('/') ? path : '/' + path);
}

function buildSlug(l: any) {
  const base = String(l.title ?? l.id)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);
  const hash = createHash('sha1').update(String(l.id)).digest('hex').slice(0, 12);
  return `untera-${String(l.country).toLowerCase()}-${base}-${hash}`;
}

async function fetchPage(country: string, page = 1, pageSize = 50) {
  const url = `${BASE}/listings/search?country=${country}&page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url, { headers: { 'X-API-Key': KEY } });
  if (!res.ok) {
    console.log(`  ❌ Untera ${country} p${page}: HTTP ${res.status}`);
    return { results: [] as any[] };
  }
  const json: any = await res.json();
  return { results: json.results ?? [] };
}

async function ensureSource() {
  await pool.query(
    `INSERT INTO listing_sources (code, name, base_url, is_live, is_trusted)
     VALUES ('untera','Untera','https://untera.io', true, false)
     ON CONFLICT (code) DO NOTHING`,
  );
}

async function saveListing(l: any, ownerId: string) {
  const slug = buildSlug(l);
  const cur  = l.original_currency ?? 'USD';
  const amt  = Number(l.original_price ?? 0);
  const usd  = l.price_usd ? Number(l.price_usd).toFixed(2) : toUsd(amt, cur);
  const images = Array.isArray(l.images) ? l.images : [];
  const mainImage = absolutizeImage(images[0] ?? null);
  const city = parseCity(l.address, l.country);
  const propertyType = mapPropertyType(l.property_subtype, l.type);
  const listingType =
    l.transaction === 'rent' ? 'rent'
    : l.transaction === 'sale'
      ? (propertyType === 'land' ? 'land_sale' : 'sale')
      : 'sale';
  const period = l.transaction === 'rent' ? 'monthly' : 'total';

  // Insert main listing
  const r = await pool.query(
    `INSERT INTO listings (
       user_id, title, slug, description,
       type, status, price, currency,
       city, country, latitude, longitude,
       bedrooms, bathrooms, square_feet, property_type,
       main_image_url, published_at,
       listing_type, country_code,
       price_period, price_amount, price_usd_cents,
       floor_area_sqm, address_line,
       verification, is_seed,
       source_code, source_listing_id, source_url, last_synced_at, raw_data
     ) VALUES (
       $1,$2,$3,$4,
       'property','published',$5,$6,
       $7,$8,$9,$10,
       $11,$12,$13,$14,
       $15, now(),
       $16,$17,
       $18,$19,$20,
       $21,$22,
       'unverified', false,
       'untera',$23,$24, now(), $25
     )
     ON CONFLICT (source_code, source_listing_id) DO UPDATE SET
       main_image_url  = EXCLUDED.main_image_url,
       city            = COALESCE(EXCLUDED.city, listings.city),
       property_type   = COALESCE(EXCLUDED.property_type, listings.property_type),
       floor_area_sqm  = COALESCE(EXCLUDED.floor_area_sqm, listings.floor_area_sqm),
       address_line    = COALESCE(EXCLUDED.address_line, listings.address_line),
       price_amount    = EXCLUDED.price_amount,
       price_usd_cents = EXCLUDED.price_usd_cents,
       last_synced_at  = now(),
       raw_data        = EXCLUDED.raw_data
     RETURNING id`,
    [
      ownerId, l.title ?? 'Untitled', slug, l.address ?? '',
      amt, cur,
      city, l.country, l.latitude ?? null, l.longitude ?? null,
      l.bedrooms ?? null, l.bathrooms ?? null,
      l.sqm ? Math.round(l.sqm * 10.7639) : null,
      propertyType,
      mainImage,
      listingType, l.country,
      period, amt, usd,
      l.sqm ?? null, l.address ?? null,
      String(l.id), l.url ?? null, JSON.stringify(l),
    ],
  );

  // Write remaining images to listing_images
  const listingId = r.rows[0].id;
  if (images.length > 1) {
    await pool.query(`DELETE FROM listing_images WHERE listing_id = $1`, [listingId]);
    for (let i = 0; i < images.length; i++) {
      const abs = absolutizeImage(images[i]);
      if (!abs) continue;
      await pool.query(
        `INSERT INTO listing_images (listing_id, url, sort_order, is_primary)
         VALUES ($1, $2, $3, $4)`,
        [listingId, abs, i, i === 0],
      );
    }
  }

  return true;
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  🌍 UNTERA GLOBAL PROPERTY CONNECTOR');
  console.log('══════════════════════════════════════════\n');
  console.log(`  Key length: ${KEY?.length ?? 0}`);
  console.log(`  Image host: ${IMAGE_HOST}\n`);

  await ensureSource();

  const ownerRes = await pool.query(
    `SELECT id FROM users WHERE role IN ('owner','provider') ORDER BY random() LIMIT 1`,
  );
  if (!ownerRes.rowCount) { console.error('No owner user found. Run seed first.'); process.exit(1); }
  const ownerId = ownerRes.rows[0].id;

  let saved = 0, seen = 0, errors = 0;

  for (const country of TARGET_COUNTRIES) {
    console.log(`  📍 ${country}...`);
    for (let page = 1; page <= 2; page++) {
      const { results } = await fetchPage(country, page, 50);
      if (!results.length) break;
      seen += results.length;
      for (const l of results) {
        try { await saveListing(l, ownerId); saved++; }
        catch (e: any) {
          errors++;
          if (errors <= 3) console.log(`     ⚠️  ${e.message.slice(0, 120)}`);
        }
      }
      await new Promise(r => setTimeout(r, 4500));
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  const totals = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE source_code='untera') AS untera,
      COUNT(*) FILTER (WHERE source_code='untera' AND main_image_url IS NOT NULL) AS with_image,
      COUNT(*) FILTER (WHERE source_code='untera' AND property_type IS NOT NULL) AS with_type,
      COUNT(*) FILTER (WHERE source_code='untera' AND city IS NOT NULL) AS with_city
    FROM listings`);
  console.log(`\n✅ Fetched ${seen} • saved ${saved} • errors ${errors}`);
  console.log('   DB totals:', totals.rows[0]);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
