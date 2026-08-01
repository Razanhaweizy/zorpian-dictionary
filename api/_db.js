import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it in your Vercel project settings (or .env for local dev).');
}

export const sql = neon(process.env.DATABASE_URL);
