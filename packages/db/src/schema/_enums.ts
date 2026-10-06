import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'user', 'owner', 'agent', 'manager', 'admin',
]);

export const locationTypeEnum = pgEnum('location_type', [
  'country', 'region', 'city', 'district', 'neighborhood',
]);

export const propertyTypeEnum = pgEnum('property_type', [
  'apartment', 'house', 'villa', 'condo', 'studio', 'room',
  'hostel', 'guest_house',
  'office', 'shop', 'warehouse', 'restaurant_space', 'commercial_building',
  'land', 'farm', 'event_venue', 'hotel', 'lodge',
]);

export const listingTypeEnum = pgEnum('listing_type', [
  'rent', 'sale', 'short_stay', 'commercial_lease', 'land_sale',
]);

export const pricePeriodEnum = pgEnum('price_period', [
  'nightly', 'weekly', 'monthly', 'yearly', 'total',
]);

export const furnishingEnum = pgEnum('furnishing', [
  'unfurnished', 'semi_furnished', 'furnished',
]);

export const availabilityEnum = pgEnum('availability', [
  'available_now', 'available_soon', 'occupied', 'unavailable',
]);

export const listingStatusEnum = pgEnum('listing_status', [
  'draft', 'pending_review', 'published', 'paused', 'rejected', 'suspended',
]);

export const verificationEnum = pgEnum('verification_status', [
  'unverified', 'pending', 'verified', 'suspended',
]);

export const viewingStatusEnum = pgEnum('viewing_status', [
  'pending', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'rejected',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending', 'confirmed', 'cancelled', 'completed', 'expired',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid', 'pending', 'paid', 'refunded', 'failed',
]);
