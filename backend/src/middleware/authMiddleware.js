import dotenv from 'dotenv';
dotenv.config();
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "iamverysmart";

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const extractToken = (authHeader) => {
  if (!authHeader) return null;
  return authHeader.split(" ")[1];
};

export { JWT_SECRET };