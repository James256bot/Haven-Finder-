import { z } from 'zod';

export const ParsedQuerySchema = z.object({
  q: z.string().max(200).default(''),

  propertyType: z.enum([
    'apartment','house','villa','condo','studio','room','hostel','guest_house',
    'office','shop','warehouse','restaurant_space','commercial_building',
    'land','farm','event_venue','hotel','lodge',
  ]).optional(),

  listingType: z.enum([
    'rent','sale','short_stay','commercial_lease','land_sale',
  ]).optional(),

  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),

  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  currency: z.string().length(3).optional(),

  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  neighborhood: z.string().max(100).optional(),

  furnished: z.boolean().optional(),
  verified: z.boolean().optional(),
  parking: z.boolean().optional(),
  pool: z.boolean().optional(),
  gym: z.boolean().optional(),
  aircon: z.boolean().optional(),
  garden: z.boolean().optional(),
  security: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  serviced: z.boolean().optional(),

  nearUniversity: z.string().max(50).optional(),
  maxCommuteMinutes: z.number().int().min(5).max(120).optional(),
  commuteTo: z.string().max(100).optional(),

  sortHint: z.enum(['price_asc', 'price_desc', 'newest', 'relevance']).optional(),
  confidence: z.number().min(0).max(1).default(0),
  parser: z.enum(['rules', 'llm', 'hybrid']).default('rules'),
  language: z.string().max(5).default('en'),
});

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;
