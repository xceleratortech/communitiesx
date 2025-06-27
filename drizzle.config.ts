// Load environment variables.
// Prefer .env.local if it exists, but fall back to .env.
import { config } from 'dotenv';

// Attempt to load .env.local first (non-fatal if it doesn't exist)
config({ path: '.env.local', override: false });

// Then load .env (if present) so that it can fill in any missing vars
config();

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
}); 