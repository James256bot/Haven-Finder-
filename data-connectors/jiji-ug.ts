import { Pool } from 'pg';
import 'dotenv/config';
import { createHash } from 'node:crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const TOKEN = process.env.APIFY_TOKEN!;
const ACTOR = 'logiover~jiji-africa-scraper';

// ── Apify API helpers ─────────────────────────────────────────
async function startRun(input: any) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/runs?waitForFinish=300`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
  const json: any = await res.json();
  if (json.error) throw new Error(`Apify: ${json.error.message}`);
  return json.data;
}

async function fetchItems(datasetId: string) {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?limit=1000`,
    { headers: { 'Authorization': `Bearer ${TOKEN}` } },
  );
  return (await res.json()) as any[];
}

// ── Field mappers ─────────────────────────────────────────────
function titleToPropertyType(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes('studio')) return 'studio';
  if (t.includes('villa')) return 'villa';
  if (t.includes('apartment')) return 'apartment';
  if (t.includes('house') || t.includes('duplex')) return 'house';
  if (t.includes('room')) return 'room';
  if (t.includes('land') || t.includes('plot')) return 'land';
  if (t.includes('shop')) return 'shop';
  if (t.includes('office')) return 'office';
  if (t.includes('warehouse')) return 'warehouse';
  return null;
}

function listingTypeFromCategory(slug: string): string {
  if (slug.includes('rent')) return 'rent';
  if (slug.includes('land')) return 'land_sale';
  if (slug.includes('sale')) return 'sale';
  return 'sale';
}

function periodFromJiji(p: string | null): string {
  if (!p) return 'total';
  const s = p.toLowerCase();
  if (s.includes('month')) return 'monthly';
  if (s.includes('year')) return 'yearly';
  if (s.includes('night')) return 'nightly';
  if (s.includes('week')) return 'weekly';
  return 'total';
}

function parseSqm(raw?: string | null): number | null {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseFurnishing(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('unfurnished')) return 'unfurnished';
  if (s.includes('semi')) return 'semi_furnished';
  if (s.includes('furnished')) return 'furnished';
  return null;
}

// Rough neighborhood centroids so pins appear on the map
const HOOD_CENTERS: Record<string, [number, number]> = {
  'kololo':    [0.3341, 32.5914],
  'ntinda':    [0.3606, 32.6125],
  'kisaasi':   [0.3821, 32.6205],
  'naguru':    [0.3392, 32.6081],
  'bukoto':    [0.3450, 32.6001],
  'muyenga':   [0.2907, 32.6114],
  'kira':      [0.3975, 32.6630],
  'kyanja':    [0.3838, 32.6310],
  'makindye':  [0.2820, 32.5910],
  'wakiso':    [0.4040, 32.4590],
  'kampala':   [0.3136, 32.5811],
  'entebbe':   [0.0512, 32.4637],
  'mukono':    [0.3533, 32.7553],
  'kawempe':   [0.3867, 32.5644],
  'rubaga':    [0.3096, 32.5490],
  'nakawa':    [0.3316, 32.6231],
  'kireka':    [0.3560, 32.6598],
  'bweyogerere': [0.3583, 32.6670],
};

function hoodCoords(regionName?: string | null, regionParent?: string | null) {
  const candidates = [
    (regionName ?? '').toLowerCase().trim(),
    (regionParent ?? '').toLowerCase().trim(),
    'kampala',
  ];
  for (const c of candidates) {
    for (const [key, coord] of Object.entries(HOOD_CENTERS)) {
      if (c.includes(key) || key.includes(c)) {
        // small jitter so multiple listings in same hood don't overlap
        const j = () => (Math.random() - 0.5) * 0.008;
        return { lat: coord[0] + j(), lng: coord[1] + j() };
      }
    }
  }
  return { lat: 0.3136, lng: 32.5811 };
}

// ── Save one listing ─────────────────────────────────────────
async function saveListing(item: any, ownerId: string) {
  const advertId = String(item.advertId ?? item.guid);
  if (!advertId) return false;

  const slugBase = String(item.title)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);
  const hash = createHash('sha1').update(advertId).digest('hex').slice(0, 12);
  const slug = `jiji-ug-${slugBase}-${hash}`;

  const attrs = item.attributes ?? {};
  const propertyType = titleToPropertyType(item.title) ?? null;
  const listingType = listingTypeFromCategory(item.categorySlug ?? '');
  const period = periodFromJiji(item.pricePeriod);
  const sqm = parseSqm(attrs['Property size']);
  const furnishing = parseFurnishing(attrs['Furnishing']);
  const bedrooms = attrs['Bedrooms'] ? parseInt(attrs['Bedrooms'], 10) : null;
  const bathrooms = attrs['Bathrooms'] ? parseInt(attrs['Bathrooms'], 10) : null;
  const coords = hoodCoords(item.regionName, item.regionParent);

  const priceAmount = Number(item.price) || null;
  const currency = item.currency ?? 'UGX';
  // UGX to USD rate (approximate; will be replaced by exchange_rates lookup later)
  const priceUsd = priceAmount ? (priceAmount / 3800).toFixed(2) : null;

  const images: string[] = (item.imageUrls ?? '')
    .split(',').map((s: string) => s.trim()).filter(Boolean);
  const mainImage = item.mainImage ?? images[0] ?? null;

  const r = await pool.query(
    `INSERT INTO listings (
       user_id, title, slug, description,
       type, status, price, currency,
       city, state, country, latitude, longitude,
       bedrooms, bathrooms, property_type,
       main_image_url, published_at,
       listing_type, country_code,
       price_period, price_amount, price_usd,
       floor_area_sqm, furnishing, address_line,
       verification, is_seed, is_featured,
       source_code, source_listing_id, source_url, last_synced_at, raw_data
     ) VALUES (
       $1,$2,$3,$4,
       'property','published',$5,$6,
       $7,$8,$9,$10,$11,
       $12,$13,$14,
       $15, now(),
       $16,$17,
       $18,$19,$20,
       $21,$22,$23,
       'unverified', false, $24,
       'jiji',$25,$26, now(), $27
     )
     ON CONFLICT (source_code, source_listing_id) DO UPDATE SET
       price_amount    = EXCLUDED.price_amount,
       price_usd = EXCLUDED.price_usd,
       main_image_url  = EXCLUDED.main_image_url,
       last_synced_at  = now(),
       raw_data        = EXCLUDED.raw_data
     RETURNING id`,
    [
      ownerId, item.title ?? 'Untitled', slug, item.description ?? '',
      priceAmount, currency,
      item.regionParent ?? 'Kampala',
      item.regionName ?? null,
      'Uganda',
      coords.lat, coords.lng,
      bedrooms, bathrooms, propertyType,
      mainImage,
      listingType, 'UG',
      period, priceAmount, priceUsd,
      sqm, furnishing, item.region ?? null,
      item.isPromoted === true,
      advertId, item.url ?? null, JSON.stringify(item),
    ],
  );

  const listingId = r.rows[0].id;

  // Store additional images
  if (images.length > 1) {
    await pool.query(`DELETE FROM listing_images WHERE listing_id = $1`, [listingId]);
    for (let i = 0; i < images.length; i++) {
      await pool.query(
        `INSERT INTO listing_images (listing_id, url, sort_order, is_primary)
         VALUES ($1, $2, $3, $4)`,
        [listingId, images[i], i, i === 0],
      );
    }
  }

  return true;
}

// ── Main ──────────────────────────────────────────────────────
const RUNS = [
  { categorySlug: 'houses-apartments-for-rent',  maxResults: 300, label: 'Rentals' },
  { categorySlug: 'houses-apartments-for-sale',  maxResults: 200, label: 'Sales' },
  { categorySlug: 'land-plots-for-sale',         maxResults: 100, label: 'Land' },
];

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  🇺🇬  JIJI UGANDA CONNECTOR (via Apify)');
  console.log('══════════════════════════════════════════\n');

  // Pick a seed owner
  const ownerRes = await pool.query(
    `SELECT id FROM users WHERE role IN ('owner','provider') ORDER BY random() LIMIT 1`,
  );
  if (!ownerRes.rowCount) { console.error('No owner user found. Run seed first.'); process.exit(1); }
  const ownerId = ownerRes.rows[0].id;

  // Ensure source row
  await pool.query(
    `INSERT INTO listing_sources (code, name, base_url, is_live, is_trusted)
     VALUES ('jiji', 'Jiji Uganda', 'https://jiji.ug', true, false)
     ON CONFLICT (code) DO NOTHING`,
  );

  let totalSaved = 0, totalSeen = 0;

  for (const r of RUNS) {
    console.log(`\n📍 ${r.label} — ${r.categorySlug} (max ${r.maxResults})\n`);

    console.log('  Starting Apify run...');
    const run = await startRun({
      market: 'ug',
      categorySlug: r.categorySlug,
      maxResults: r.maxResults,
    });
    console.log(`  Status: ${run.status}  (cost $${(run.usageTotalUsd ?? 0).toFixed(4)})`);

    if (run.status !== 'SUCCEEDED') {
      console.log(`  ❌ Run failed: ${run.statusMessage ?? run.status}`);
      continue;
    }

    const items = await fetchItems(run.defaultDatasetId);
    console.log(`  Fetched ${items.length} items`);
    totalSeen += items.length;

    let saved = 0, errors = 0;
    for (const item of items) {
      try {
        if (await saveListing(item, ownerId)) saved++;
        else errors++;
      } catch (e: any) {
        errors++;
        if (errors <= 3) console.log(`     ⚠️  ${e.message.slice(0, 120)}`);
      }
    }
    console.log(`  ✅ Saved ${saved}  •  errors ${errors}`);
    totalSaved += saved;
  }

  console.log(`\n${'═'.repeat(44)}`);
  console.log(`✅ Total: seen ${totalSeen}, saved ${totalSaved}`);

  const s = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE source_code='jiji') AS jiji_total,
      COUNT(DISTINCT regionName) FROM listings WHERE source_code='jiji'`);
  const summary = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE main_image_url IS NOT NULL)::int AS with_image
    FROM listings WHERE source_code='jiji'`);
  console.log('   Jiji listings in DB:', summary.rows[0]);

  const byType = await pool.query(`
    SELECT listing_type, COUNT(*)::int FROM listings
    WHERE source_code='jiji' GROUP BY listing_type`);
  console.log('   By listing_type:', byType.rows);

  const byHood = await pool.query(`
    SELECT city, COUNT(*)::int FROM listings
    WHERE source_code='jiji' GROUP BY city ORDER BY 2 DESC LIMIT 8`);
  console.log('   By city:', byHood.rows);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
