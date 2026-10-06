import type { Pool } from 'pg';

type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price_amount: string | null;
  currency: string | null;
  price_period: string | null;
  property_type: string | null;
  listing_type: string | null;
  main_image_url: string | null;
};

const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://havenfinder.com';

function priceFmt(amount: string | null, currency: string | null, period: string | null): string {
  if (!amount || !currency) return '';
  const n = Number(amount);
  const formatted = new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);
  const suffix =
    period === 'monthly' ? '/month' :
    period === 'nightly' ? '/night' :
    period === 'yearly' ? '/year' : '';
  return `${currency} ${formatted}${suffix}`;
}

function beds(b: number | null, ba: number | null): string {
  const parts: string[] = [];
  if (b && b > 0) parts.push(`${b} bedroom${b > 1 ? 's' : ''}`);
  if (ba && ba > 0) parts.push(`${ba} bathroom${ba > 1 ? 's' : ''}`);
  return parts.join(', ');
}

function cityLine(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(', ');
}

// ── Instagram / Facebook caption ─────────────────────────
export function generateInstagramCaption(l: Listing): { content: string; hashtags: string[] } {
  const price = priceFmt(l.price_amount, l.currency, l.price_period);
  const specs = beds(l.bedrooms, l.bathrooms);
  const location = cityLine(l.city, l.country);
  const type = (l.property_type ?? 'property').replace(/_/g, ' ');
  const action = l.listing_type === 'rent' ? 'FOR RENT' :
                 l.listing_type === 'sale' ? 'FOR SALE' :
                 l.listing_type === 'short_stay' ? 'SHORT STAY' :
                 l.listing_type === 'land_sale' ? 'LAND FOR SALE' :
                 'AVAILABLE';

  const lines = [
    `🏡 ${action} — ${l.title}`,
    '',
    specs ? `🛏 ${specs}` : '',
    price ? `💰 ${price}` : '',
    location ? `📍 ${location}` : '',
    '',
    l.description?.slice(0, 180)?.trim() + (l.description && l.description.length > 180 ? '…' : ''),
    '',
    `See full details & photos 👉 ${PUBLIC_URL}/property/${l.slug}`,
    '',
    `DM us or comment "INTERESTED" to arrange a viewing.`,
  ].filter(Boolean);

  const hashtags = [
    '#HavenFinder',
    '#FindYourHaven',
    '#' + (l.city ?? 'Uganda').replace(/[^a-zA-Z0-9]/g, ''),
    '#' + (l.country ?? 'Uganda').replace(/[^a-zA-Z0-9]/g, ''),
    '#' + type.replace(/\s+/g, ''),
    l.listing_type === 'rent' ? '#ForRent' : l.listing_type === 'sale' ? '#ForSale' : '#RealEstate',
    '#PropertyUganda',
    '#UgandaRealEstate',
  ].filter(Boolean);

  return { content: lines.join('\n'), hashtags };
}

// ── Twitter / X ───────────────────────────────────────────
export function generateTweet(l: Listing): { content: string; hashtags: string[] } {
  const price = priceFmt(l.price_amount, l.currency, l.price_period);
  const specs = beds(l.bedrooms, l.bathrooms);
  const location = cityLine(l.city, l.country);

  const chunks = [
    `🏡 ${l.title}`,
    specs,
    price,
    location,
  ].filter(Boolean);

  const body = chunks.join(' • ');
  const link = `${PUBLIC_URL}/property/${l.slug}`;

  // Keep under 280 chars
  let content = `${body}\n\n${link}`;
  if (content.length > 278) {
    content = `${body.slice(0, 220)}…\n\n${link}`;
  }

  return {
    content,
    hashtags: ['#HavenFinder', '#Uganda'],
  };
}

// ── WhatsApp broadcast ────────────────────────────────────
export function generateWhatsApp(l: Listing): { content: string; hashtags: string[] } {
  const price = priceFmt(l.price_amount, l.currency, l.price_period);
  const specs = beds(l.bedrooms, l.bathrooms);
  const location = cityLine(l.city, l.country);
  const action = l.listing_type === 'rent' ? 'FOR RENT' :
                 l.listing_type === 'sale' ? 'FOR SALE' : 'AVAILABLE';

  const lines = [
    `*${action}* 🏡`,
    `*${l.title}*`,
    '',
    specs ? `🛏 ${specs}` : '',
    price ? `💰 ${price}` : '',
    location ? `📍 ${location}` : '',
    '',
    `Full details: ${PUBLIC_URL}/property/${l.slug}`,
    '',
    `Reply here for more info or to arrange a viewing.`,
  ].filter(Boolean);

  return { content: lines.join('\n'), hashtags: [] };
}

// ── Email digest (for saved-search subscribers) ──────────
export function generateEmailDigest(l: Listing, subscriberName: string): { subject: string; content: string } {
  const price = priceFmt(l.price_amount, l.currency, l.price_period);
  const location = cityLine(l.city, l.country);

  const subject = `New ${l.property_type ?? 'property'} in ${location} — ${price}`;

  const content = `Hi ${subscriberName},

A new property matching your interests was just listed on HavenFinder:

━━━━━━━━━━━━━━━━━━━━━━━━━
${l.title}
${price}
${location}
━━━━━━━━━━━━━━━━━━━━━━━━━

${l.description?.slice(0, 400) ?? ''}

View full details & photos:
${PUBLIC_URL}/property/${l.slug}

---
You're receiving this because you saved a search for properties in ${location}.
Manage your preferences: ${PUBLIC_URL}/dashboard`;

  return { subject, content };
}

// ── Orchestrator ──────────────────────────────────────────
export async function generateAllPosts(db: Pool, listing: Listing, userId: string) {
  const results = [];

  for (const platform of ['instagram', 'facebook', 'twitter', 'whatsapp'] as const) {
    let gen;
    if (platform === 'twitter') gen = generateTweet(listing);
    else if (platform === 'whatsapp') gen = generateWhatsApp(listing);
    else gen = generateInstagramCaption(listing);

    const ins = await db.query(
      `INSERT INTO marketing_posts
         (listing_id, user_id, platform, content, hashtags, media_urls, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       ON CONFLICT DO NOTHING
       RETURNING id, platform, status`,
      [
        listing.id,
        userId,
        platform,
        gen.content,
        gen.hashtags,
        listing.main_image_url ? [listing.main_image_url] : [],
      ],
    );
    if (ins.rowCount) results.push(ins.rows[0]);
  }

  return results;
}
