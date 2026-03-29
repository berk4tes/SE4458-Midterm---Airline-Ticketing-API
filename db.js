require('dotenv').config();
const { Pool, types } = require('pg');

// ── Type parser fix ────────────────────────────────────────────────────────────
// By default pg converts DATE columns to JS Date objects, which causes a UTC+x
// timezone shift (e.g. '2026-05-01' → 2026-04-30T21:00:00.000Z on UTC+3 systems).
// Returning the raw 'YYYY-MM-DD' string avoids all timezone arithmetic.
types.setTypeParser(1082, (val) => val); // DATE  → plain string
types.setTypeParser(1114, (val) => val); // TIMESTAMP → plain string

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Force every connection in the pool to use UTC so date literals inserted/queried
// as strings ('2026-05-01') are never shifted by the server session timezone.
pool.on('connect', (client) => {
  client.query("SET timezone = 'UTC'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
