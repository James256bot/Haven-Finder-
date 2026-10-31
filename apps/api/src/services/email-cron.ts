import { pool } from '../lib/db';
import { sendLeadDigestEmail } from './mailer';

export async function sendWeeklyLeadDigests() {
  console.log('[Email Cron] Starting weekly lead digests...');

  // Find agents who had leads in the last 7 days
  const r = await pool.query(`
    SELECT 
      u.id as user_id, 
      u.email, 
      u.full_name,
      COUNT(l.id) as total_leads,
      COUNT(l.id) FILTER (WHERE l.created_at > now() - interval '7 days') as leads_this_week
    FROM users u
    JOIN listings li ON li.user_id = u.id
    JOIN leads l ON l.listing_id = li.id
    WHERE l.created_at > now() - interval '7 days'
    GROUP BY u.id, u.email, u.full_name
  `);

  console.log(`[Email Cron] Found ${r.rowCount} agents to email.`);

  for (const row of r.rows) {
    if (row.leads_this_week > 0) {
      try {
        await sendLeadDigestEmail(
          row.email,
          row.full_name || 'Agent',
          Number(row.total_leads),
          Number(row.leads_this_week)
        );
        console.log(`[Email Cron] Emailed ${row.email}`);
      } catch (err) {
        console.error(`[Email Cron] Failed to email ${row.email}:`, err);
      }
    }
  }
  console.log('[Email Cron] Done.');
}
