#!/bin/bash
# Simple listing insertion script

ADMIN_ID=$(psql -d havenfinder -t -c "SELECT id FROM users LIMIT 1;" | xargs)
echo "Admin ID: $ADMIN_ID"

if [ -z "$ADMIN_ID" ]; then
    echo "ERROR: No user found in database"
    exit 1
fi

# Insert listings using psql variables
psql -d havenfinder -v user_id="$ADMIN_ID" << 'SQLEOF'
INSERT INTO listings (user_id, title, slug, description, type, status, price, city, state, country, bedrooms, bathrooms, square_feet, property_type, main_image_url, published_at) VALUES
(:'user_id', 'Modern Luxury Villa', 'modern-luxury-villa-1', 'Stunning villa with pool', 'property', 'published', 12500, 'Beverly Hills', 'CA', 'USA', 5, 5, 5500, 'villa', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Downtown Penthouse', 'downtown-penthouse-1', 'Skyline views', 'property', 'published', 8500, 'San Francisco', 'CA', 'USA', 3, 3, 2800, 'penthouse', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Family Home', 'family-home-1', '4 bed in Palo Alto', 'property', 'published', 4500, 'Palo Alto', 'CA', 'USA', 4, 3, 2400, 'house', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Cozy Studio', 'cozy-studio-1', 'Perfect starter', 'rental', 'published', 1800, 'Berkeley', 'CA', 'USA', 0, 1, 500, 'studio', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Kampala Residence', 'kampala-residence-1', 'Kololo area', 'rental', 'published', 1500, 'Kampala', 'Central', 'Uganda', 4, 3, 2200, 'house', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'London Townhouse', 'london-townhouse-1', 'Kensington', 'property', 'published', 8500000, 'London', 'England', 'UK', 5, 4, 3500, 'townhouse', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Dubai Marina', 'dubai-marina-1', 'Luxury views', 'property', 'published', 1200000, 'Dubai', 'Dubai', 'UAE', 3, 3, 2000, 'apartment', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Sydney Harbour', 'sydney-harbour-1', 'Harbour views', 'property', 'published', 2800000, 'Sydney', 'NSW', 'Australia', 3, 2, 1500, 'apartment', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Nairobi Westlands', 'nairobi-westlands-1', 'Upscale area', 'rental', 'published', 1200, 'Nairobi', 'Nairobi', 'Kenya', 3, 2, 1400, 'apartment', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', NOW()),
(:'user_id', 'Tokyo Shibuya', 'tokyo-shibuya-1', 'Vibrant area', 'rental', 'published', 3000, 'Tokyo', 'Tokyo', 'Japan', 1, 1, 550, 'apartment', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop', NOW());
SQLEOF

echo "Insert completed"
psql -d havenfinder -c "SELECT count(*) FROM listings;"
