import express from 'express';
import cors from 'cors';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

const app = express();
app.use(cors());

const pool = new Pool({ connectionString: 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder' });
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

app.get('/api/v1/health', async (_req, res) => {
  try { await sql`SELECT 1`.execute(db); res.json({ status: 'healthy' }); }
  catch (e) { res.json({ status: 'error', error: String(e) }); }
});

app.get('/api/v1/listings', async (_req, res) => {
  try {
    const count = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const listings = await db.selectFrom('listings').selectAll().limit(50).execute();
    res.json({ success: true, data: listings, count: listings.length, db_count: Number(count?.c||0) });
  } catch (e) { res.json({ success: false, error: String(e) }); }
});

app.get('/api/v1/stats', async (_req, res) => {
  try {
    const l = await db.selectFrom('listings').select(sql`count(*)`.as('c')).executeTakeFirst();
    const u = await db.selectFrom('users').select(sql`count(*)`.as('c')).executeTakeFirst();
    res.json({ success: true, data: { total_listings: Number(l?.c||0), total_users: Number(u?.c||0) } });
  } catch (e) { res.json({ success: false, error: String(e) }); }
});

app.listen(8000, '0.0.0.0', () => {
  console.log('✅ Test server on 8000');
});
