import dotenv from 'dotenv';
dotenv.config();
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "../emailService.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SEND OTP
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = generateOTP();

    // Save OTP to database
    await pool.query(
      "INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
      [email, otp]
    );

    console.log(`📨 OTP generated for ${email}: ${otp}`);

    // Send email
    const emailSent = await sendOTPEmail(email, otp);

    if (emailSent) {
      res.json({ 
        success: true, 
        message: "OTP sent to your email",
        email: email
      });
    } else {
      // Email failed but OTP is in DB - still inform user
      console.warn(`⚠️ Email send failed for ${email}, but OTP stored`);
      res.json({ 
        success: true, 
        message: "OTP generated (email service may have an issue)",
        email: email
      });
    }
  } catch (err) {
    console.error("❌ Send OTP error:", err);
    res.status(500).json({ error: "Server error - could not process request" });
  }
};

// VERIFY OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    if (!email || !otp || !name) {
      return res.status(400).json({ error: "Email, OTP, and name are required" });
    }

    console.log("📨 Verify OTP Request:", { email, otp, name });

    // Query OTP from database with expiry check
    const result = await pool.query(
      "SELECT * FROM otps WHERE email=$1 AND otp=$2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp]
    );

    console.log("🔍 Query Result:", result.rows.length, "rows found");

    if (result.rows.length === 0) {
      console.log("❌ OTP not found or expired for:", email);
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Delete the used OTP so it can't be reused
    await pool.query("DELETE FROM otps WHERE email=$1 AND otp=$2", [email, otp]);

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    let user;

    if (userCheck.rows.length === 0) {
      // Create new user
      const newUser = await pool.query(
        "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *",
        [email, name || "User"]
      );
      user = newUser.rows[0];
      console.log("✅ New user created:", user.id);
    } else {
      // Use existing user
      user = userCheck.rows[0];
      console.log("✅ Existing user found:", user.id);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Token generated for:", user.email);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    res.status(500).json({ error: "Server error - verification failed" });
  }
};

// Get current user (protected route)
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      "SELECT id, email, name, created_at FROM users WHERE id=$1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};