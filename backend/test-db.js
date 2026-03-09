console.log("Starting DB test...");

const pool = require("./db");

async function test() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB Connected:", res.rows[0]);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit();
  }
}

test();p