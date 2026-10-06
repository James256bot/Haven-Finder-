export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  listing_type: string | null;
  price_amount: string | null;
  price_usd_cents: string | null;
  currency: string | null;
  price_period: string | null;
  main_image_url: string | null;
  verification: string | null;
  is_featured: boolean;
  source_code: string | null;
  source_url: string | null;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};
