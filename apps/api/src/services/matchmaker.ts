import { pool } from '../lib/db';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function runMatchmakerEngine() {
  console.log('[Matchmaker] Starting scan...');

  // 1. Get all open "Wanted" requests (from the last 30 days)
  const wanted = await pool.query(`
    SELECT * FROM wanted_requests 
    WHERE created_at > now() - interval '30 days'
  `);

  for (const req of wanted.rows) {
    // 2. Find matching listings
    // Only real, complete listings go into emails
    const matches = await pool.query(`
      SELECT id, title, slug, city, price_amount, currency, main_image_url, bedrooms
      FROM listings
      WHERE status = 'published'
        AND is_visible = true
        AND deleted_at IS NULL
        AND main_image_url IS NOT NULL
        AND main_image_url != ''
        AND price_amount IS NOT NULL
        AND price_amount > 0
        AND slug IS NOT NULL
        AND LOWER(city) LIKE LOWER($1)
        AND bedrooms >= $2
        AND ($3::numeric IS NULL OR price_amount <= $3)
      ORDER BY created_at DESC
      LIMIT 3
    `, [`%${req.city}%`, req.bedrooms || 1, req.max_price]);

    if (matches.rows.length > 0 && process.env.GMAIL_USER) {
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0a5cff;">Good news! We found properties for you.</h2>
          <p>Hi there,</p>
          <p>You recently told us you were looking for: <strong>"${req.title}"</strong> in ${req.city}.</p>
          <p>We just found ${matches.rows.length} properties that match your criteria:</p>
          
          ${matches.rows.map(l => `
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 15px 0;">
              <img src="${l.main_image_url}" alt="${l.title}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
              <div style="padding: 15px;">
                <a href="http://localhost:5218/listing/${l.slug}" style="text-decoration: none; color: #0f172a; font-weight: bold; font-size: 16px;">${l.title}</a>
                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">📍 ${l.city} · 🛏 ${l.bedrooms} beds</p>
                <p style="margin: 8px 0 0; color: #10b981; font-weight: bold; font-size: 18px;">${l.currency} ${Number(l.price_amount).toLocaleString()}</p>
                <a href="http://localhost:5218/listing/${l.slug}" style="display: inline-block; margin-top: 10px; background: #0a5cff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: bold;">View Property</a>
              </div>
            </div>
          `).join('')}

          <a href="http://localhost:5218/search?city=${encodeURIComponent(req.city)}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">View These Properties</a>
        </div>
      `;

      // We don't have the renter's email in wanted_requests, so we use a mock for now
      // In production, you would add an 'email' column to wanted_requests
      const mockEmail = 'jameskajura3232@gmail.com'; 
      
      await transporter.sendMail({
        from: `"HavenFinder Matches" <${process.env.GMAIL_USER}>`,
        to: mockEmail,
        subject: `🏠 We found ${matches.rows.length} properties for you in ${req.city}`,
        html: html,
      });
      console.log(`[Matchmaker] Sent match email for request: "${req.title}"`);
    }
  }
  console.log('[Matchmaker] Scan complete.');
}
