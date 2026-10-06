import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder'
});
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

async function migrate() {
  console.log('🔄 Running database migrations...');
  
  // Create migrations tracking table
  await sql`CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE, executed_at TIMESTAMPTZ DEFAULT NOW())`.execute(db);
  
  // Check if already migrated
  const { rows } = await sql<{ name: string }>`SELECT name FROM _migrations WHERE name = '001_schema'`.execute(db);
  
  if (rows.length === 0) {
    console.log('  📝 Executing 001_schema...');
    const migrationPath = join(__dirname, '..', 'migrations', '001_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    await db.transaction().execute(async (trx) => {
      await trx.executeQuery(sql.raw(migrationSQL).compile(trx));
    });
    
    await sql`INSERT INTO _migrations (name) VALUES ('001_schema')`.execute(db);
    console.log('  ✅ Migration complete!');
  } else {
    console.log('  ⏭️  Schema already migrated');
  }
  
  console.log('✅ All migrations complete');
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
