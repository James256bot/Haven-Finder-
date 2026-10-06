import { pgTable, char, text, smallint, boolean, numeric, timestamp, index } from 'drizzle-orm/pg-core';

export const currencies = pgTable('currencies', {
  code: char('code', { length: 3 }).primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  minorUnit: smallint('minor_unit').notNull().default(2),
  isActive: boolean('is_active').notNull().default(true),
});

export const exchangeRates = pgTable('exchange_rates', {
  id: text('id').primaryKey(),
  baseCode: char('base_code', { length: 3 }).notNull(),
  quoteCode: char('quote_code', { length: 3 }).notNull(),
  rate: numeric('rate', { precision: 20, scale: 10 }).notNull(),
  source: text('source').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairIdx: index('exchange_rates_pair_idx').on(t.baseCode, t.quoteCode, t.fetchedAt),
}));
