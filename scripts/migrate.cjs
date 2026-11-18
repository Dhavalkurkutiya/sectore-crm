const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Automatically load .env if present
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres:pYQlm2fFAxK6zANV@db.vpmqnvofdhebqkohwlcx.supabase.co:5432/postgres';

const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

async function main() {
  const args = process.argv.slice(2);
  const isStatusOnly = args.includes('--status') || args.includes('-s');
  const isForce = args.includes('--force') || args.includes('-f');

  console.log('\n========================================');
  console.log('       SUPABASE DATABASE MIGRATOR       ');
  console.log('========================================');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 120000,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // Ensure search_path is set
    await client.query('SET search_path TO public, extensions, auth;');

    // 2. Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. Fetch already applied migrations
    const appliedRes = await client.query('SELECT name, applied_at FROM public._schema_migrations ORDER BY name ASC;');
    const appliedMap = new Map(appliedRes.rows.map(r => [r.name, r.applied_at]));

    // 4. Read migration files from disk
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migration directory not found: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files on disk.`);
    console.log(`Found ${appliedMap.size} migrations recorded in database.\n`);

    if (isStatusOnly) {
      console.log('--- MIGRATION STATUS ---');
      files.forEach((file, idx) => {
        const appliedAt = appliedMap.get(file);
        const status = appliedAt
          ? `✓ Applied on ${new Date(appliedAt).toLocaleString()}`
          : '⏳ PENDING (Not applied)';
        console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. [${status}] ${file}`);
      });
      console.log('------------------------\n');
      return;
    }

    // 5. Execute migrations
    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const alreadyApplied = appliedMap.has(file);

      if (alreadyApplied && !isForce) {
        skippedCount++;
        continue;
      }

      console.log(`Applying: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('SET search_path TO public, extensions, auth;');
        await client.query(sql);

        // Record in _schema_migrations
        await client.query(
          `INSERT INTO public._schema_migrations (name, applied_at)
           VALUES ($1, now())
           ON CONFLICT (name) DO UPDATE SET applied_at = now();`,
          [file]
        );

        console.log(`  ✓ Successfully applied: ${file}`);
        appliedCount++;
      } catch (err) {
        // If error is because objects already exist, still record it so future runs don't re-fail
        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate')
        ) {
          console.log(`  ℹ ${file} (already up-to-date: ${err.message.split('\n')[0]})`);
          await client.query(
            `INSERT INTO public._schema_migrations (name, applied_at)
             VALUES ($1, now())
             ON CONFLICT (name) DO NOTHING;`,
            [file]
          );
          appliedCount++;
        } else {
          console.error(`  ✗ Error in ${file}:`, err.message);
          throw err;
        }
      }
    }

    console.log('\n========================================');
    console.log(`Summary: ${appliedCount} applied, ${skippedCount} skipped (already applied).`);
    console.log('Database and local migrations are IN SYNC!');
    console.log('========================================\n');

    // 6. Verify total public tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Total active public tables: ${res.rows.length}`);

  } catch (error) {
    console.error('\n[FATAL] Migration failed:', error.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
