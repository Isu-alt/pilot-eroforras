import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     || 'pilot_eroforras',
});

pool.on('error', (err) => {
  console.error('[db] Váratlan pool hiba:', err.message);
});

/**
 * query — Paraméterezett lekérdezés a pool-ból.
 * @param {string} text  SQL szöveg ($1, $2, ... placeholderekkel)
 * @param {any[]}  [params]  Paraméterek tömbje
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[db]', { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

/**
 * getClient — Tranzakcióhoz dedikált kliens.
 * Használat: const client = await getClient(); try { await client.query('BEGIN'); ... } finally { client.release(); }
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
