import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function main() {
  console.log('\n═══ Replacing seed placeholders with real photos ═══\n');

  // 1. Build pools of real image URLs from Untera, grouped by property type
  const { rows } = await pool.query(`
    SELECT property_type, main_image_url
    FROM listings
    WHERE source_code = 'untera'
      AND main_image_url IS NOT NULL
      AND main_image_url LIKE '%/images/%'
      AND property_type IS NOT NULL
    ORDER BY random()`);

  const byType: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const r of rows) {
    if (seen.has(r.main_image_url)) continue;
    seen.add(r.main_image_url);
    if (!byType[r.property_type]) byType[r.property_type] = [];
    byType[r.property_type].push(r.main_image_url);
  }

  console.log('Real image pool (unique URLs) by property type:');
  for (const [t, imgs] of Object.entries(byType).sort()) {
    console.log(`  ${t.padEnd(20)} ${imgs.length}`);
  }

  // Fallback pool: house → apartment → villa → any
  const fallback: string[] = [
    ...(byType.house ?? []),
    ...(byType.apartment ?? []),
    ...(byType.villa ?? []),
    ...Object.values(byType).flat().slice(0, 200),
  ];

  // 2. Find every seed listing that still points at picsum or is null
  const seeds = await pool.query(`
    SELECT id, property_type
    FROM listings
    WHERE is_seed = true
      AND (main_image_url IS NULL
           OR main_image_url LIKE '%picsum%'
           OR main_image_url LIKE '%placehold%')
  `);
  console.log(`\nSeeds to update: ${seeds.rowCount}\n`);

  // 3. Assign a matching real image to each seed
  let updated = 0;
  const used = new Set<string>();

  for (const s of seeds.rows) {
    const typePool = byType[s.property_type] ?? fallback;
    if (typePool.length === 0) continue;

    // Prefer an image not yet used to avoid repeats
    const candidates = typePool.filter(u => !used.has(u));
    const pick = (candidates.length > 0 ? candidates : typePool)[
      Math.floor(Math.random() * (candidates.length || typePool.length))
    ];
    used.add(pick);

    await pool.query(`UPDATE listings SET main_image_url = $1 WHERE id = $2`, [pick, s.id]);
    updated++;
  }

  console.log(`✅ Updated ${updated} seed listings with real Untera photos`);

  const verify = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE main_image_url LIKE '%picsum%') AS still_picsum,
      COUNT(*) FILTER (WHERE main_image_url LIKE '%untera%') AS untera_images,
      COUNT(*) AS total
    FROM listings WHERE is_seed = true`);
  console.log('   ', verify.rows[0]);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
