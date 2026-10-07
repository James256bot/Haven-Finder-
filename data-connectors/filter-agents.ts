import { readFileSync, writeFileSync } from 'node:fs';

const INCLUDE_CATEGORIES = [
  'real estate',
  'property',
  'housing',
  'landlord',
  'estate agent',
  'broker',
];

const EXCLUDE_NAMES = [
  'supermarket',
  'capital city authority',
  'cleaning',
  'gamers',
  'hotel chain',
  'restaurant',
];

const input = readFileSync(
  `${process.env.HOME}/havenfinder/data-connectors/agent-leads.csv`,
  'utf8',
);
const lines = input.trim().split('\n');
const [header, ...rows] = lines;

// Parse CSV with proper quote handling
function parseCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function csvEscape(v: string): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

const kept: string[] = [];
const seen = new Set<string>();

for (const line of rows) {
  const cols = parseCsv(line);
  const rank = cols[0];
  const name = cols[1] ?? '';
  const phone = cols[2] ?? '';
  const whatsapp = cols[3] ?? '';
  const rating = cols[4] ?? '';
  const reviews = cols[5] ?? '';
  const category = (cols[6] ?? '').toLowerCase();
  const address = cols[7] ?? '';
  const neighborhood = cols[8] ?? '';
  const website = cols[9] ?? '';
  const mapsUrl = cols[10] ?? '';

  // Skip non-property businesses
  const nameLower = name.toLowerCase();
  if (EXCLUDE_NAMES.some(x => nameLower.includes(x))) continue;

  // Require a property-related category
  const isProperty = INCLUDE_CATEGORIES.some(c => category.includes(c));
  if (!isProperty) continue;

  // Dedupe by phone
  const phoneDigits = phone.replace(/\D/g, '');
  if (seen.has(phoneDigits)) continue;
  seen.add(phoneDigits);

  // Require a real phone (not KCCA's)
  if (phoneDigits.length < 10) continue;

  kept.push([
    kept.length + 1,
    csvEscape(name),
    csvEscape(phone),
    csvEscape(whatsapp),
    rating,
    reviews,
    csvEscape(category),
    csvEscape(address),
    csvEscape(neighborhood),
    csvEscape(website),
    csvEscape(mapsUrl),
  ].join(','));
}

const filtered = [header, ...kept].join('\n');
writeFileSync(
  `${process.env.HOME}/havenfinder/data-connectors/kampala-agents.csv`,
  filtered,
);

console.log(`Original: ${rows.length} rows`);
console.log(`Filtered: ${kept.length} property agencies`);
console.log(`Saved: ~/havenfinder/data-connectors/kampala-agents.csv`);
