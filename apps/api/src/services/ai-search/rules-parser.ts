import type { ParsedQuery } from './schema';

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};


const PROPERTY_TYPES: Record<string, string> = {
  apartment: 'apartment', apt: 'apartment', flat: 'apartment', flats: 'apartment',
  house: 'house', home: 'house', bungalow: 'house',
  villa: 'villa', villas: 'villa',
  condo: 'condo', condominium: 'condo',
  studio: 'studio', studios: 'studio', bedsitter: 'studio', bedsit: 'studio',
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

const UGANDA_LOCATIONS = [
  'kampala','kololo','ntinda','kisaasi','naguru','bukoto','muyenga',
  'kira','kyanja','makindye','wakiso','entebbe','mukono','kawempe',
  'rubaga','nakawa','kireka','bweyogerere','gayaza','kyaliwajjala',
  'namugongo','buziga','munyonyo','lubowa','kajjansi','seeta',
  'makerere','wandegeya','najjera','nansana','kyenjojo','hoima',
  'fort portal','masaka','jinja','mbarara','gulu',
];

const GLOBAL_LOCATIONS = [
  'nairobi','mombasa','kisumu','lagos','abuja','accra',
  'johannesburg','cape town','durban','athens','lisbon','rome',
  'milan','mexico city','tokyo','osaka','paris','london','dubai',
];

const COUNTRY_MAP: Record<string, string> = {
  nairobi: 'KE', mombasa: 'KE', kisumu: 'KE',
  lagos: 'NG', abuja: 'NG', accra: 'GH',
  johannesburg: 'ZA', 'cape town': 'ZA', durban: 'ZA',
  athens: 'GR', lisbon: 'PT', rome: 'IT', milan: 'IT',
  'mexico city': 'MX', tokyo: 'JP', osaka: 'JP',
  paris: 'FR', london: 'GB', dubai: 'AE',
};

function parsePrice(text: string): { value: number; currency?: string } | null {
  const cleaned = text.replace(/,/g, '');
  let currency: string | undefined;
  if (/\bugx\b|\bush\b|ugandan shilling/.test(text)) currency = 'UGX';
  else if (/\bkes\b|\bksh\b|kenyan shilling/.test(text)) currency = 'KES';
  else if (/\bngn\b|naira/.test(text)) currency = 'NGN';
  else if (/\bzar\b/.test(text)) currency = 'ZAR';
  else if (/\busd\b|\$|dollars?/.test(text)) currency = 'USD';
  else if (/\beur\b|euros?|€/.test(text)) currency = 'EUR';

  const m = cleaned.match(
    /(?:under|below|less than|max|maximum|up to|upto|cheaper than|at most|budget of|within)\s*(?:ugx|kes|ngn|zar|usd|eur|\$|€)?\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?/i,
  );
  if (m) {
    const base = parseFloat(m[1]);
    const suffix = (m[2] ?? '').toLowerCase();
    const mult =
      suffix === 'k' || suffix === 'thousand' ? 1_000 :
      suffix === 'm' || suffix === 'million' ? 1_000_000 :
      suffix === 'b' || suffix === 'billion' ? 1_000_000_000 : 1;
    return { value: base * mult, currency };
  }

  const m2 = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)\b/i);
  if (m2) {
    const base = parseFloat(m2[1]);
    const suffix = m2[2].toLowerCase();
    const mult =
      suffix === 'k' || suffix === 'thousand' ? 1_000 :
      suffix === 'm' || suffix === 'million' ? 1_000_000 :
      suffix === 'b' || suffix === 'billion' ? 1_000_000_000 : 1;
    return { value: base * mult, currency };
  }

  return null;
}

function detectLanguage(text: string): string {
  if (/\b(naomba|nyumba|karibu|bei|chumba|kodi)\b/i.test(text)) return 'sw';
  if (/\b(ndaga|ennyumba|ssente|wano)\b/i.test(text)) return 'lg';
  return 'en';
}

export function parseQueryRules(input: string): ParsedQuery {
  const raw = input.trim();
  if (!raw) return { q: '', confidence: 0, parser: 'rules', language: 'en' };

  const lower = raw.toLowerCase();
  const consumed: string[] = [];
  const result: ParsedQuery = {
    q: '',
    confidence: 0,
    parser: 'rules',
    language: detectLanguage(lower),
  };

  // Listing type
  if (/\bfor\s+rent\b|\brent(al|ing)?\b|\bto\s+let\b|\bkodi\b/.test(lower)) {
    result.listingType = 'rent'; consumed.push('rent');
  }
  if (/\bfor\s+sale\b|\bbuy(ing)?\b|\bsell(ing)?\b|\bpurchase\b/.test(lower)) {
    result.listingType = 'sale'; consumed.push('sale');
  }
  if (/\bshort\s+stay\b|\bshort[- ]term\b|\bnightly\b|\bper\s+night\b|\bairbnb\b/.test(lower)) {
    result.listingType = 'short_stay'; consumed.push('short stay');
  }
  if (/\bcommercial\s+lease\b/.test(lower)) {
    result.listingType = 'commercial_lease'; consumed.push('commercial lease');
  }

  // Property type
  if (/\bguest\s*house\b/.test(lower)) {
    result.propertyType = 'guest_house'; consumed.push('guest house');
  } else {
    for (const [word, type] of Object.entries(PROPERTY_TYPES)) {
      const re = new RegExp(`\\b${word}s?\\b`, 'i');
      if (re.test(lower)) {
        result.propertyType = type as any;
        consumed.push(word);
        break;
      }
    }
  }

  // Bedrooms / bathrooms
  const bd = lower.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed(?:room)?s?|br|bd)\b/);
  if (bd) {
    const raw = String(bd[1]).toLowerCase();
    const n = WORD_NUM[raw] ?? parseInt(raw, 10);
    if (!Number.isNaN(n)) { result.bedrooms = n; consumed.push(`${raw} bed`); }
  }
  const ba = lower.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bath(?:room)?s?|ba)\b/);
  if (ba) {
    const raw = String(ba[1]).toLowerCase();
    const n = WORD_NUM[raw] ?? parseInt(raw, 10);
    if (!Number.isNaN(n)) { result.bathrooms = n; consumed.push(`${raw} bath`); }
  }

  // Furnishing
  if (/\bfurnished\b/.test(lower) && !/\bunfurnished\b/.test(lower)) {
    result.furnished = true; consumed.push('furnished');
  }
  if (/\bsemi[- ]furnished\b/.test(lower)) {
    result.furnished = true; consumed.push('semi-furnished');
  }

  // Verified
  if (/\bverified\b|\btrusted\b|\blegit\b/.test(lower)) {
    result.verified = true; consumed.push('verified');
  }

  // Amenities
  const amenityPatterns: [RegExp, keyof ParsedQuery][] = [
    [/\bparking\b|\bcar\s*park\b|\bgarage\b/, 'parking'],
    [/\bpool\b|\bswimming\b/, 'pool'],
    [/\bgym\b|\bfitness\b/, 'gym'],
    [/\bair[- ]?con(ditioning)?\b|\ba\/c\b/, 'aircon'],
    [/\bgarden\b|\byard\b/, 'garden'],
    [/\bsecurity\b|\bguarded\b|\bgated\b/, 'security'],
    [/\bpet[- ]friendly\b|\bdogs?\s+allowed\b/, 'petFriendly'],
    [/\bserviced\b/, 'serviced'],
  ];
  for (const [re, field] of amenityPatterns) {
    if (re.test(lower)) { (result as any)[field] = true; consumed.push(String(field)); }
  }

  // University proximity
  const uni = lower.match(/\bnear\s+(?:the\s+)?(makerere|kyambogo|mubs|ucu|nku|must|kyu|isu)\b/);
  if (uni) { result.nearUniversity = uni[1]; consumed.push(`near ${uni[1]}`); }

  // Commute
  const commute = lower.match(/\b(?:within|under|less than)\s+(\d+)\s*(?:min|mins|minutes)\s*(?:of|to|from)\s+([a-z\s]+?)(?:\.|,|$)/);
  if (commute) {
    result.maxCommuteMinutes = parseInt(commute[1], 10);
    result.commuteTo = commute[2].trim().slice(0, 100);
    consumed.push(`${commute[1]}min`);
  }

  // Price
  const price = parsePrice(lower);
  if (price) {
    result.maxPrice = price.value;
    if (price.currency) result.currency = price.currency;
    consumed.push(`under ${price.value}`);
  }

  // CBD / central business district inference
  if (/\bcbd\b|central\s+business|downtown|city\s+centre|city\s+center/.test(lower)) {
    if (!result.neighborhood) result.neighborhood = 'central';
    result.city = result.city ?? 'kampala';
    result.country = result.country ?? 'UG';
    consumed.push('cbd');
  }

  // Sort hints from subjective words
  if (/\b(cheap|affordable|budget|low[- ]?cost|low[- ]?end|inexpensive)\b/.test(lower)) {
    result.sortHint = 'price_asc';
    consumed.push('cheap', 'affordable', 'budget', 'inexpensive');
  }
  if (/\b(luxury|premium|expensive|high[- ]?end|exclusive|upscale)\b/.test(lower)) {
    result.sortHint = 'price_desc';
  }
  if (/\b(new|newest|latest|recent)\b/.test(lower) && !result.sortHint) {
    result.sortHint = 'newest';
  }


  // Location
  for (const city of [...UGANDA_LOCATIONS, ...GLOBAL_LOCATIONS]) {
    const re = new RegExp(`\\b${city.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(lower)) {
      if (city === 'kampala') {
        result.city = city;
      } else if (UGANDA_LOCATIONS.includes(city)) {
        result.neighborhood = city;
        result.country = 'UG';
      } else if (GLOBAL_LOCATIONS.includes(city)) {
        result.city = city;
        if (COUNTRY_MAP[city]) result.country = COUNTRY_MAP[city];
      }
      consumed.push(city);
      break;
    }
  }

  // Currency → country inference
  if (!result.country && result.currency) {
    const map: Record<string, string> = {
      UGX: 'UG', KES: 'KE', NGN: 'NG', ZAR: 'ZA', TZS: 'TZ', RWF: 'RW',
    };
    if (map[result.currency]) result.country = map[result.currency];
  }

  // Leftover keywords — strip structured fragments by pattern, not by token list
  let remaining = lower;

  // 1. Strip every consumed keyword (literal)
  for (const tok of consumed) {
    remaining = remaining.replace(new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
  }

  // 2. Strip any price expressions ("1.5m", "under 500k", "ugx 1,500,000")
  remaining = remaining.replace(
    /(?:under|below|less than|max|maximum|up to|upto|budget of|within)\s*(?:ugx|kes|ngn|zar|usd|eur|\$|€)?\s*\d+(?:\.\d+)?\s*(?:k|m|b|million|billion|thousand)?/gi,
    ' ',
  );
  remaining = remaining.replace(/\b(?:ugx|kes|ngn|zar|usd|eur)\b/gi, ' ');
  remaining = remaining.replace(/\b\d+(?:\.\d+)?\s*(?:k|m|b|million|billion|thousand)\b/gi, ' ');

  // 3. Strip bedroom/bathroom fragments
  remaining = remaining.replace(/\b\d+\s*(?:bed(?:room)?s?|br|bd|bath(?:room)?s?|ba)\b/gi, ' ');

  // 4. Strip stopwords
  remaining = remaining
    .replace(/\b(in|near|at|under|below|less than|max|up to|for|to|the|a|an|with|and|of|on|is|are|looking|want|find|me|i|need|somewhere|place|property|properties|space|area|cbd|central|business|district|downtown|uptown|suburb|zone)\b/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (remaining.length >= 3) result.q = remaining.slice(0, 200);

  // Confidence
  const signals = [
    result.propertyType, result.listingType, result.bedrooms, result.bathrooms,
    result.city, result.neighborhood, result.maxPrice, result.furnished,
    result.nearUniversity, result.maxCommuteMinutes,
  ].filter(v => v !== undefined).length;
  result.confidence = Math.min(1, signals / 6);

  return result;
}
