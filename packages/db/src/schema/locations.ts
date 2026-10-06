import { pgTable, uuid, text, char, numeric, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { locationTypeEnum } from './_enums';

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  type: locationTypeEnum('type').notNull(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  timezone: text('timezone').notNull().default('UTC'),
  defaultCurrency: char('default_currency', { length: 3 }).notNull().default('USD'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  parentIdx:  index('locations_parent_idx').on(t.parentId),
  countryIdx: index('locations_country_idx').on(t.countryCode),
  slugIdx:    uniqueIndex('locations_slug_uniq').on(t.countryCode, t.parentId, t.slug),
}));
