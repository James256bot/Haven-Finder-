import {
  pgTable, uuid, text, varchar, boolean, timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  // ── existing ─────────────────────────────────────────────
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false),
  role: varchar('role', { length: 50 }).default('user'),
  preferences: jsonb('preferences').default({}),
  isActive: boolean('is_active').default(true),
  isBanned: boolean('is_banned').default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // ── NEW international columns ────────────────────────────
  phoneE164: text('phone_e164'),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  countryCode: varchar('country_code', { length: 2 }),
  locale: varchar('locale', { length: 10 }).default('en-UG'),
  timezone: varchar('timezone', { length: 64 }).default('Africa/Kampala'),
  preferredCurrency: varchar('preferred_currency', { length: 3 }).default('UGX'),
  verification: varchar('verification', { length: 16 }).default('unverified'),
}, (t) => ({
  emailUniq: uniqueIndex('users_email_lower_uniq').on(t.email),
}));
