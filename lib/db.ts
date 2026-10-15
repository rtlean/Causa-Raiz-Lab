import { Pool } from 'pg';

// Pool único por processo. Em serverless (Netlify Functions) o pool é recriado
// a cada cold start, por isso ficamos com max baixo.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 3,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
