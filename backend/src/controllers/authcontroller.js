import dotenv from 'dotenv';
dotenv.config();
import pool from "../db.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "iamverysmart";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = generateOTP();

    await pool.query(
      "INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
      [email, otp]
    );

    console.log("OTP:", otp);
    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    console.log("📨 Verify OTP Request:", { email, otp, name });

    const result = await pool.query(
      "SELECT * FROM otps WHERE email=$1 AND otp=$2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp]
    );

    console.log("🔍 Query Result:", result.rows);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    await pool.query("DELETE FROM otps WHERE email=$1 AND otp=$2", [email, otp]);

    const userCheck = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    let user;

    if (userCheck.rows.length === 0) {
      const newUser = await pool.query(
        "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *",
        [email, name || "User"]
      );
      user = newUser.rows[0];
    } else {
      user = userCheck.rows[0];
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Token generated for:", user.email);

    res.json({
      success: true,
      token,
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};