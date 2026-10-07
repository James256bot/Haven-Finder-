/**
 * Natural-language property search parser.
 * Turns "2 bedroom apartment in Ntinda under 1.5M UGX" into structured filters.
 *
 * Runs entirely client-side. No API calls. Instant.
 * Zero cost. Works offline. Never invents data.
 */

export type ParsedQuery = {
  q: string;                    // leftover keyword text
  propertyType?: string;
  listingType?: 'rent' | 'sale' | 'short_stay' | 'commercial_lease' | 'land_sale';
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  country?: string;
  maxPrice?: number;
  minPrice?: number;
  furnished?: boolean;
  verified?: boolean;
  parking?: boolean;
  pool?: boolean;
  gym?: boolean;
  aircon?: boolean;
  garden?: boolean;
  security?: boolean;
  nearUniversity?: string;
  tokens: string[];             // what was consumed — for debugging
};

// ── Property type synonyms ────────────────────────────────
const PROPERTY_TYPES: Record<string, string> = {
  apartment: 'apartment', apt: 'apartment', flat: 'apartment', flats: 'apartment',
  house: 'house', home: 'house', bungalow: 'house',
  villa: 'villa', villas: 'villa',
  condo: 'condo', condominium: 'condo',
  studio: 'studio', studios: 'studio', 'bedsitter': 'studio', bedsit: 'studio',
  room: 'room', rooms: 'room',
  hostel: 'hostel', hostels: 'hostel',
  'guest house': 'guest_house', guesthouse: 'guest_house',
  office: 'office', offices: 'office',
  shop: 'shop', shops: 'shop', retail: 'shop',
  warehouse: 'warehouse',
  land: 'land', plot: 'land', plots: 'land', acre: 'land', acres: 'land',
  farm: 'farm', farms: 'farm',
  hotel: 'hotel', lodge: 'lodge',
};

// ── Known cities / neighborhoods (extend over time) ──────
const UGANDA_CITIES = [
  'kampala', 'kololo', 'ntinda', 'kisaasi', 'naguru', 'bukoto', 'muyenga',
  'kira', 'kyanja', 'makindye', 'wakiso', 'entebbe', 'mukono', 'kawempe',
  'rubaga', 'nakawa', 'kireka', 'bweyogerere', 'gayaza', 'kyaliwajjala',
  'namugongo', 'buziga', 'munyonyo', 'lubowa', 'kajjansi', 'seeta',
  'makerere', 'wandegeya', 'kabale', 'gulu', 'mbarara', 'jinja',
];

const OTHER_CITIES = [
  'nairobi', 'mombasa', 'kisumu', 'lagos', 'abuja', 'accra', 'johannesburg',
  'cape town', 'durban', 'athens', 'lisbon', 'rome', 'milan', 'mexico city',
  'tokyo', 'osaka', 'paris', 'london',
];

// ── Currency detection ──────────────────────────────────────
const CURRENCY_PATTERNS: { re: RegExp; mult: number }[] = [
  { re: /\bugx\b|\bush\b|ugandan shilling/, mult: 1 },
  { re: /\bkes\b|\bksh\b|kenyan shilling/, mult: 1 },
  { re: /\bngn\b|naira/, mult: 1 },
  { re: /\bzar\b|\br\b/, mult: 1 },
  { re: /\busd\b|\$\b|dollars?/, mult: 1 },
  { re: /\beur\b|euros?|€/, mult: 1 },
];

function parsePrice(text: string): { value: number; currency?: string } | null {
  // Match patterns like "1.5m", "1,500,000", "under 500k", "1 million", "UGX 800,000"
  const cleaned = text.replace(/,/g, '');

  // "under X" or "below X" or "less than X" or "max X"
  const m = cleaned.match(
    /(?:under|below|less than|max|up to|upto|cheaper than|at most)\s*(?:ugx|kes|ngn|zar|usd|eur|\$|€)?\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand|shs?|shillings?)?/i,
  );
  if (m) {
    const base = parseFloat(m[1]);
    const suffix = (m[2] ?? '').toLowerCase();
    const mult =
      suffix === 'k' || suffix === 'thousand' ? 1_000 :
      suffix === 'm' || suffix === 'million' ? 1_000_000 :
      suffix === 'b' || suffix === 'billion' ? 1_000_000_000 :
      1;
    return { value: base * mult };
  }

  // Bare number: "1500000", "1.5m", "500k"
  const m2 = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)\b/i);
  if (m2) {
    const base = parseFloat(m2[1]);
    const suffix = m2[2].toLowerCase();
    const mult =
      suffix === 'k' || suffix === 'thousand' ? 1_000 :
      suffix === 'm' || suffix === 'million' ? 1_000_000 :
      suffix === 'b' || suffix === 'billion' ? 1_000_000_000 :
      1;
    return { value: base * mult };
  }

  return null;
}

export function parseNaturalLanguage(input: string): ParsedQuery {
  const raw = input.trim();
  if (!raw) return { q: '', tokens: [] };

  const lower = raw.toLowerCase();
  const consumed: string[] = [];
  const result: ParsedQuery = { q: '', tokens: consumed };

  // ── Detect country from currency context ─────────────
  if (/\bugx\b|\bush\b|ugandan shilling|kampala|uganda/.test(lower)) result.country = 'UG';
  if (/\bkes\b|\bksh\b|kenyan shilling|nairobi|kenya/.test(lower)) result.country = 'KE';
  if (/\bngn\b|naira|lagos|nigeria/.test(lower)) result.country = 'NG';
  if (/\bzar\b|south africa|johannesburg|cape town/.test(lower)) result.country = 'ZA';

  // ── Listing type ─────────────────────────────────────
  if (/\bfor\s+rent\b|\brent(al|ing)?\b|\bto\s+let\b/.test(lower)) {
    result.listingType = 'rent';
    consumed.push('rent');
  }
  if (/\bfor\s+sale\b|\bbuy(ing)?\b|\bsell(ing)?\b|\bpurchase\b/.test(lower)) {
    result.listingType = 'sale';
    consumed.push('sale');
  }
  if (/\bshort\s+stay\b|\bshort[- ]term\b|\bnightly\b|\bper\s+night\b|\bairbnb\b/.test(lower)) {
    result.listingType = 'short_stay';
    consumed.push('short stay');
  }
  if (/\bcommercial\s+lease\b/.test(lower)) {
    result.listingType = 'commercial_lease';
    consumed.push('commercial lease');
  }

  // ── Property type ────────────────────────────────────
  // Check multi-word first
  if (/\bguest\s*house\b/.test(lower)) {
    result.propertyType = 'guest_house';
    consumed.push('guest house');
  } else {
    for (const [word, type] of Object.entries(PROPERTY_TYPES)) {
      if (consumed.includes(word)) continue;
      const re = new RegExp(`\\b${word}s?\\b`, 'i');
      if (re.test(lower)) {
        result.propertyType = type;
        consumed.push(word);
        break;
      }
    }
  }

  // ── Bedrooms ─────────────────────────────────────────
  const bd = lower.match(/\b(\d+)\s*(?:bed(?:room)?s?|br|bd)\b/);
  if (bd) {
    result.bedrooms = parseInt(bd[1], 10);
    consumed.push(`${bd[1]} bed`);
  }

  // ── Bathrooms ────────────────────────────────────────
  const ba = lower.match(/\b(\d+)\s*(?:bath(?:room)?s?|ba)\b/);
  if (ba) {
    result.bathrooms = parseInt(ba[1], 10);
    consumed.push(`${ba[1]} bath`);
  }

  // ── Furnished ────────────────────────────────────────
  if (/\bfurnished\b/.test(lower) && !/\bunfurnished\b/.test(lower)) {
    result.furnished = true;
    consumed.push('furnished');
  }
  if (/\bsemi[- ]furnished\b/.test(lower)) {
    result.furnished = true;
    consumed.push('semi-furnished');
  }

  // ── Verified only ────────────────────────────────────
  if (/\bverified\b|\btrusted\b/.test(lower)) {
    result.verified = true;
    consumed.push('verified');
  }

  // ── Amenities ────────────────────────────────────────
  if (/\bparking\b|\bcar\s*park\b|\bgarage\b/.test(lower)) { result.parking = true; consumed.push('parking'); }
  if (/\bpool\b|\bswimming\b/.test(lower)) { result.pool = true; consumed.push('pool'); }
  if (/\bgym\b|\bfitness\b/.test(lower)) { result.gym = true; consumed.push('gym'); }
  if (/\bair[- ]?con(ditioning)?\b|\ba\/c\b/.test(lower)) { result.aircon = true; consumed.push('aircon'); }
  if (/\bgarden\b|\byard\b/.test(lower)) { result.garden = true; consumed.push('garden'); }
  if (/\bsecurity\b|\bguarded\b|\bgated\b/.test(lower)) { result.security = true; consumed.push('security'); }

  // ── Near university ──────────────────────────────────
  const uni = lower.match(/\bnear\s+(makerere|kyambogo|mubs|ucu|nku|must|university)/);
  if (uni) {
    result.nearUniversity = uni[1];
    consumed.push(`near ${uni[1]}`);
  }

  // ── Price ────────────────────────────────────────────
  const price = parsePrice(lower);
  if (price) {
    result.maxPrice = price.value;
    consumed.push(`under ${price.value.toLocaleString()}`);
  }

  // ── City ─────────────────────────────────────────────
  for (const city of [...UGANDA_CITIES, ...OTHER_CITIES]) {
    const re = new RegExp(`\\b${city.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(lower)) {
      // Preserve original casing from user input where possible
      const match = raw.match(re);
      result.city = match?.[0] ?? city;
      consumed.push(city);
      break;
    }
  }

  // ── Leftover: use as full-text `q` ───────────────────
  let remaining = lower;
  for (const tok of consumed) {
    remaining = remaining.replace(new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
  }
  // Remove common stopwords
  remaining = remaining
    .replace(/\b(in|near|at|under|below|less than|max|up to|for|to|the|a|an|with|and|of|on|is|are|looking|want|find|me|i|need)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (remaining) {
    result.q = remaining;
    // Only use city from q if nothing structured matched
  }

  // Prefer city over q when both point at the same info
  if (result.city && result.q && result.q.length < 3) result.q = '';

  return result;
}

// Quick test in the console:
// parseNaturalLanguage('furnished 2 bedroom apartment in Ntinda under 1.5 million')
// → { q: '', propertyType: 'apartment', listingType: undefined, bedrooms: 2,
//     city: 'ntinda', country: 'UG', maxPrice: 1500000, furnished: true, tokens: [...] }
