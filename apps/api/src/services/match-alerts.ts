import { pool } from '../lib/db';

/**
 * Given a listing id, check all saved searches and create notifications
 * for users whose saved filters match this listing.
 */
export async function matchListingAgainstSavedSearches(listingId: string) {
  const listingQ = await pool.query(
    `SELECT id, slug, title, city, country_code, bedrooms, property_type,
            price_amount, price_usd, listing_type, main_image_url
     FROM listings WHERE id = $1 AND status = 'published'`,
    [listingId],
  );
  if (!listingQ.rowCount) return;
  const l = listingQ.rows[0];

  const savedQ = await pool.query(
    `SELECT id, user_id, name, filters FROM saved_searches`,
  );

  for (const s of savedQ.rows) {
    const f = s.filters ?? {};
    let ok = true;

    if (f.bedrooms && l.bedrooms < Number(f.bedrooms)) ok = false;
    if (f.maxPrice && l.price_usd && Number(l.price_usd) > Number(f.maxPrice)) ok = false;
    if (f.minPrice && l.price_usd && Number(l.price_usd) < Number(f.minPrice)) ok = false;
    if (f.propertyType && l.property_type !== f.propertyType) ok = false;
    if (f.listingType && l.listing_type !== f.listingType) ok = false;
    if (f.country && l.country_code !== f.country.toUpperCase()) ok = false;
    if (f.city && !(l.city ?? '').toLowerCase().includes(String(f.city).toLowerCase())) ok = false;

    if (!ok) continue;

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'saved_search_match', $2, $3)`,
      [
        s.user_id,
        `New match for "${s.name}"`,
        `${l.title} — ${l.city ?? ''}`,
      ],
    );
  }
}
