import pkg from "pg";
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

let pool;

if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // Production: Use Railway's DATABASE_URL
  console.log('📍 Connecting to Railway PostgreSQL...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Development: Use individual env vars
  console.log('📍 Connecting to local PostgreSQL...');
  pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "collab_editor",
    password: process.env.DB_PASS,
    port: process.env.DB_PORT || 5432,
  });
}

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.connect()
  .then((client) => {
    console.log("✅ Database connected successfully!");
    client.release();
  })
  .catch(err => {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  });

export default pool;