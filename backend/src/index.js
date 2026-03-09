import "./db.js";  

import express from "express";
import http from "http";
import cors from "cors";
import { setupWebSocket } from "./server.js";
import authRoutes from "./routes/authRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import pool from "./db.js";

const app = express();


// Configure CORS with allowed origins

app.use(cors({
  origin: '*',
  credentials: false
}));

// Parse JSON
app.use(express.json());

// Public routes (no auth required)
app.use("/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Test DB route
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM otps");
    res.json({ success: true, otps: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Protected route example: get current user info
app.get("/user", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

const server = http.createServer(app);

setupWebSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});