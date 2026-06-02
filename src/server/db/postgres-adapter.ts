import pg from 'pg';
import { loadAppConfig } from '../config.js';

const config = loadAppConfig();

const pool = new pg.Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.username,
  password: config.database.password,
  database: config.database.name,
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function getClient() {
  return pool.connect();
}

export async function closePool() {
  await pool.end();
}

export default pool;
