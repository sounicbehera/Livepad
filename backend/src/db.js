import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "collab_editor",
  password: "swayam@1983",
  port: 5432,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.connect()
  .then((client) => {
    console.log("✅ Database connected");
    client.release();
  })
  .catch(err => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

// Test query
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Test query failed:', err);
  } else {
    console.log('✅ Test query successful:', res.rows[0]);
  }
});

export default pool;