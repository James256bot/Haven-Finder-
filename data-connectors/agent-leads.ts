import { ApifyClient } from 'apify-client';
import { writeFileSync } from 'node:fs';
import 'dotenv/config';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN! });

const QUERIES = [
  'real estate agency Kampala',
  'property broker Kampala',
  'property manager Kampala',
  'landlord Kampala',
  'houses for rent Kampala',
  'apartments for rent Kampala',
  'real estate agent Ntinda',
  'real estate agent Kololo',
  'real estate agent Muyenga',
  'real estate agent Wakiso',
  'real estate agent Kira',
  'real estate agency Entebbe',
];

type Place = {
  title?: string;
  categoryName?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  website?: string;
  phone?: string;
  phoneUnformatted?: string;
  totalScore?: number;
  reviewsCount?: number;
  url?: string;
  location?: { lat: number; lng: number };
};

function cleanPhone(p?: string | null): string | null {
  if (!p) return null;
  return p.replace(/[^0-9+]/g, '');
}

function whatsappLink(phone?: string | null): string {
  const clean = cleanPhone(phone);
  if (!clean) return '';
  // Uganda numbers already include +256
  return `https://wa.me/${clean.replace(/^\+/, '')}`;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  🇺🇬  KAMPALA PROPERTY AGENT LEAD HARVESTER');
  console.log('══════════════════════════════════════════\n');
  console.log(`Running ${QUERIES.length} Google Maps queries...\n`);

  const run = await client.actor('compass/crawler-google-places').call({
    searchStringsArray: QUERIES,
    locationQuery: 'Kampala, Uganda',
    maxCrawledPlacesPerSearch: 40,
    language: 'en',
    skipClosedPlaces: true,
    scrapeContacts: true,
  });

  console.log(`Run status: ${run.status}`);
  console.log(`Cost: $${(run.usageTotalUsd ?? 0).toFixed(4)}\n`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`Fetched ${items.length} places\n`);

  // Filter + dedupe
  const seen = new Set<string>();
  const unique: Place[] = [];

  for (const item of items as Place[]) {
    if (!item.phoneUnformatted) continue;
    const key = item.phoneUnformatted.replace(/\D/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  console.log(`Unique agents with phone: ${unique.length}\n`);

  // Sort: high rating + many reviews first
  unique.sort((a, b) => {
    const scoreA = (a.totalScore ?? 0) * Math.log10((a.reviewsCount ?? 0) + 10);
    const scoreB = (b.totalScore ?? 0) * Math.log10((b.reviewsCount ?? 0) + 10);
    return scoreB - scoreA;
  });

  // Write CSV
  const header = [
    'rank',
    'name',
    'phone',
    'whatsapp_url',
    'rating',
    'reviews',
    'category',
    'address',
    'neighborhood',
    'website',
    'google_maps_url',
  ].join(',');

  const rows = unique.map((p, i) => [
    i + 1,
    csvEscape(p.title),
    csvEscape(p.phoneUnformatted ?? p.phone),
    csvEscape(whatsappLink(p.phoneUnformatted ?? p.phone)),
    p.totalScore ?? '',
    p.reviewsCount ?? '',
    csvEscape(p.categoryName),
    csvEscape(p.address),
    csvEscape(p.neighborhood),
    csvEscape(p.website),
    csvEscape(p.url),
  ].join(','));

  const csv = [header, ...rows].join('\n');
  const path = `${process.env.HOME}/havenfinder/data-connectors/agent-leads.csv`;
  writeFileSync(path, csv);

  console.log(`✅ Saved ${unique.length} leads to ${path}\n`);
  console.log('Top 5 by rating:');
  unique.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} — ${p.phoneUnformatted} (${p.totalScore}★, ${p.reviewsCount} reviews)`);
  });
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
