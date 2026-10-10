import { execSync } from 'node:child_process'

import { config } from 'dotenv'

/**
 * Once per e2e run: bring the test database to the current schema, empty it and seed the
 * catalogue. Tests then create their own users and orders with unique data.
 */
export default function setup() {
  config({ quiet: true })
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see .env.example)')
  const env = { ...process.env, DATABASE_URL: url }
  const run = (cmd: string, input?: string) =>
    execSync(cmd, { env, input, stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'] })

  run('npx prisma migrate deploy')
  run(
    'npx prisma db execute --stdin',
    `DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
  END LOOP;
END $$;`,
  )
  run('npx tsx prisma/seed.ts')
}
