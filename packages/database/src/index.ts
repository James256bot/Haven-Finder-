import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

export interface DB {
  users: any;
  refresh_tokens: any;
  categories: any;
  amenities: any;
  listings: any;
  listing_images: any;
  favorites: any;
  conversations: any;
  messages: any;
  reviews: any;
  notifications: any;
}

const connectionString = process.env.DATABASE_URL || 
  'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder';

const pool = new Pool({ connectionString, min: 1, max: 5 });

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});

export { sql, pool };

export async function healthCheck(): Promise<boolean> {
  try { await sql`SELECT 1`.execute(db); return true; } catch { return false; }
}

export async function disconnect(): Promise<void> {
  await db.destroy();
  await pool.end();
}
