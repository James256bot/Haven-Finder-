import { pool } from '../lib/db';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── EMAIL TEMPLATES ──

function agentTemplate(name: string, listingCount: number, leadCount: number) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0a5cff;">HavenFinder for Agents</h2>
      <p>Hi ${name},</p>
      <p>You currently have <strong>${listingCount} active listings</strong> on HavenFinder.</p>
      <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <h1 style="margin: 0; color: #0f172a; font-size: 48px;">${leadCount}</h1>
        <p style="margin: 5px 0 0; color: #64748b;">Total leads generated</p>
      </div>
      <p>Agents who boost their listings get up to <strong>3x more leads</strong>. Tap below to promote your property to the top of the search results.</p>
      <a href="https://dist-black-six-60.vercel.app/my-listings" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Boost My Listings</a>
    </div>
  `;
}

function renterTemplate(name: string, city: string, listings: any[]) {
  const listingsHtml = listings.map(l => `
    <div style="border-bottom: 1px solid #e2e8f0; padding: 15px 0;">
      <a href="https://dist-black-six-60.vercel.app/listing/${l.slug}" style="text-decoration: none; color: #0f172a; font-weight: bold; font-size: 16px;">${l.title}</a>
      <p style="margin: 5px 0; color: #64748b; font-size: 14px;">${l.city} · ${l.bedrooms} Beds · ${l.currency} ${Number(l.price_amount).toLocaleString()}</p>
    </div>
  `).join('');

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0a5cff;">New properties in ${city}</h2>
      <p>Hi ${name},</p>
      <p>We found ${listings.length} new properties that match your recent searches.</p>
      ${listingsHtml}
      <a href="https://dist-black-six-60.vercel.app/search?city=${encodeURIComponent(city)}" style="display: inline-block; background: #0a5cff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">View All Results</a>
    </div>
  `;
}

// ── THE ENGINE ──

export async function runAdvancedEmailEngine() {
  console.log('[Email Engine] Starting advanced scan...');

  // ── 1. SCAN AGENTS ──
  const agents = await pool.query(`
    SELECT u.id, u.email, u.full_name,
           COUNT(DISTINCT l.id) as listings,
           COUNT(leads.id) as leads
    FROM users u
    JOIN listings l ON l.user_id = u.id
    LEFT JOIN leads ON leads.listing_id = l.id
    WHERE u.intent = 'agent' 
      AND l.deleted_at IS NULL
      AND u.email NOT LIKE '%@%.test'
      AND u.email NOT LIKE '%@example.com'
    GROUP BY u.id, u.email, u.full_name
  `);

  for (const agent of agents.rows) {
    if (process.env.GMAIL_USER) {
      await transporter.sendMail({
        from: `"HavenFinder" <${process.env.GMAIL_USER}>`,
        to: agent.email,
        subject: `Your HavenFinder performance update`,
        html: agentTemplate(agent.full_name || 'Agent', agent.listings, agent.leads),
      });
      console.log(`[Email Engine] Sent agent report to ${agent.email}`);
    } else {
      console.log(`[Email Mock] Would send agent report to ${agent.email}`);
    }
  }

  // ── 2. SCAN RENTERS (based on their saved searches) ──
  const renters = await pool.query(`
    SELECT u.id, u.email, u.full_name, ss.filters->>'city' as city
    FROM users u
    JOIN saved_searches ss ON ss.user_id = u.id
    WHERE u.intent = 'renter' 
      AND ss.filters->>'city' IS NOT NULL
      AND u.email NOT LIKE '%@%.test'
      AND u.email NOT LIKE '%@example.com'
  `);

  for (const renter of renters.rows) {
    // Find 3 new listings in the city they saved
    const city = renter.city;
    const newListings = await pool.query(`
      SELECT title, slug, city, bedrooms, price_amount, currency
      FROM listings
      WHERE LOWER(city) = LOWER($1) AND status = 'published' AND is_visible = true
      ORDER BY created_at DESC
      LIMIT 3
    `, [city]);

    if (newListings.rows.length > 0 && process.env.GMAIL_USER) {
      await transporter.sendMail({
        from: `"HavenFinder" <${process.env.GMAIL_USER}>`,
        to: renter.email,
        subject: `🏠 3 new properties in ${city}`,
        html: renterTemplate(renter.full_name || 'there', city, newListings.rows),
      });
      console.log(`[Email Engine] Sent renter digest to ${renter.email} for ${city}`);
    } else if (newListings.rows.length > 0) {
      console.log(`[Email Mock] Would send renter digest to ${renter.email} for ${city}`);
    }
  }

  console.log('[Email Engine] Scan complete.');
}
