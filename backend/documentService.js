const pool = require("./db");

async function getDocument(id) {
  const result = await pool.query(
    "SELECT * FROM documents WHERE id = $1",
    [id]
  );
  return result.rows[0];
}

async function createDocument(id, content = "") {
  await pool.query(
    "INSERT INTO documents (id, content) VALUES ($1, $2)",
    [id, content]
  );
}

async function updateDocument(id, content) {
  await pool.query(
    "UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2",
    [content, id]
  );
}

module.exports = {
  getDocument,
  createDocument,
  updateDocument,
};