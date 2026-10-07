import { pool } from '../lib/db';
import { computeTrust, type TrustResult } from './trust-engine';

export async function getListingTrust(listingId: string): Promise<TrustResult | null> {
  const r = await pool.query(
    `SELECT l.price_usd, l.bedrooms, l.city, l.country_code, l.source_code,
            l.main_image_url, l.description, l.created_at,
            u.verification AS owner_verification,
            u.created_at AS owner_created_at,
            (SELECT COUNT(*)::int FROM listings WHERE user_id = l.user_id) AS owner_listing_count,
            (SELECT COUNT(*)::int FROM listing_images WHERE listing_id = l.id) AS image_count
     FROM listings l
     LEFT JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [listingId],
  );
  if (!r.rowCount) return null;
  const row = r.rows[0];

  return computeTrust({
    priceUsd: Number(row.price_usd ?? 0),
    bedrooms: row.bedrooms,
    city: row.city,
    countryCode: row.country_code,
    sourceCode: row.source_code,
    hasImages: !!row.main_image_url,
    imageCount: row.image_count ?? 0,
    descriptionLength: (row.description ?? '').length,
    createdDaysAgo: Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000),
    ownerVerification: row.owner_verification ?? 'unverified',
    ownerListingCount: row.owner_listing_count ?? 0,
    ownerAccountAgeDays: row.owner_created_at
      ? Math.floor((Date.now() - new Date(row.owner_created_at).getTime()) / 86400000)
      : 0,
  });
}
