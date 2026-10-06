import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('server.ts', 'utf-8');

// Fix the listings create endpoint - replace returning('*') with explicit columns
content = content.replace(
  /\.returning\('\*'\)\.execute\(\);/g,
  ".returning(['id', 'user_id', 'title', 'slug', 'description', 'type', 'status', 'price', 'currency', 'city', 'state', 'bedrooms', 'bathrooms', 'square_feet', 'property_type', 'view_count', 'favorite_count', 'created_at', 'published_at']).execute();"
);

// Fix reviews returning
content = content.replace(
  /\.returning\('\*'\)\.execute\(\);/g,
  ".returning(['id', 'listing_id', 'reviewer_id', 'rating', 'content', 'created_at']).execute();"
);

// Fix user registration returning
content = content.replace(
  /\.returning\('\*'\)\.execute\(\);/g,
  ".returning(['id', 'email', 'full_name', 'role', 'email_verified', 'created_at']).execute();"
);

writeFileSync('server.ts', content);
console.log('✅ Fixed returning(*) in server.ts');
