import {
  pgTable, uuid, text, varchar, char, integer, numeric,
  boolean, timestamp, doublePrecision, jsonb, index,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────
// Mirrors the EXISTING `listings` table 1:1. Only new columns are
// added. Nothing existing is renamed, retyped, or removed.
// TS export name is `properties` for query ergonomics.
// ─────────────────────────────────────────────────────────────
export const properties = pgTable('listings', {
  // ── existing ─────────────────────────────────────────────
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  categoryId: uuid('category_id'),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).default('property'),
  status: varchar('status', { length: 50 }).default('draft'),
  price: numeric('price', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  city: varchar('city', { length: 255 }),
  state: varchar('state', { length: 255 }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  bedrooms: integer('bedrooms'),
  bathrooms: numeric('bathrooms', { precision: 3, scale: 1 }),
  squareFeet: integer('square_feet'),
  propertyType: varchar('property_type', { length: 100 }),
  viewCount: integer('view_count').default(0),
  favoriteCount: integer('favorite_count').default(0),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }),
  reviewCount: integer('review_count').default(0),
  aiTags: text('ai_tags').array().default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  country: varchar('country', { length: 100 }).default('US'),
  mainImageUrl: text('main_image_url'),
  inquiryCount: integer('inquiry_count').default(0),

  // ── NEW international columns (nullable → additive only) ─
  listingType: varchar('listing_type', { length: 32 }),        // rent | sale | short_stay | commercial_lease | land_sale
  countryCode: char('country_code', { length: 2 }),            // ISO 3166-1 alpha-2
  locationId: uuid('location_id'),
  pricePeriod: varchar('price_period', { length: 16 }),        // nightly | monthly | yearly | total
  priceAmount: numeric('price_amount', { precision: 18, scale: 2 }),
  priceUsdCents: numeric('price_usd_cents', { precision: 18, scale: 2 }),
  addressLine: text('address_line'),
  floorAreaSqm: numeric('floor_area_sqm', { precision: 10, scale: 2 }),
  landAreaSqm: numeric('land_area_sqm', { precision: 12, scale: 2 }),
  furnishing: varchar('furnishing', { length: 16 }),           // unfurnished | semi_furnished | furnished
  availability: varchar('availability', { length: 16 }),       // available_now | available_soon | occupied | unavailable
  verification: varchar('verification', { length: 16 }).default('unverified'),
  isFeatured: boolean('is_featured').default(false),
  isSeed: boolean('is_seed').default(false),
  videoUrl: text('video_url'),
}, (t) => ({
  slugIdx:     index('properties_slug_idx').on(t.slug),
  locationIdx: index('properties_location_idx').on(t.locationId),
  countryIdx:  index('properties_country_idx').on(t.countryCode),
  priceIdx:    index('properties_price_idx').on(t.priceUsdCents),
  listingIdx:  index('properties_listing_idx').on(t.listingType),
  verificationIdx: index('properties_verification_idx').on(t.verification),
}));
