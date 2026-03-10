import "./db.js";  

import express from "express";
import http from "http";
import cors from "cors";
import { setupWebSocket } from "./server.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";

const app = express();
app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use("/auth", authRoutes);

// Protected routes (auth required)
app.use("/rooms", roomRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
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

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});