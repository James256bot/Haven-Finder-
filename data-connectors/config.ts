export const CONFIG = {
  DATABASE_URL: 'postgresql://u0_a236@127.0.0.1:5432/havenfinder',
  RENTCAST_API_KEY: process.env.RENTCAST_API_KEY || '',
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '',
  // Cities to fetch properties from
  CITIES: [
    { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
    { name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
    { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
    { name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
    { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  ],
  MAX_LISTINGS_PER_CITY: 100,
};
