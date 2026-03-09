import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"LivePad" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Your LivePad OTP Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">LivePad</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Real-time Collaborative Editor</p>
          </div>
          
          <!-- Content -->
          <div style="background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 12px 12px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0; font-weight: 500;">Hi there,</p>
            
            <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
              Your OTP code for LivePad login is:
            </p>
            
            <!-- OTP Code Box -->
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0; border: 2px solid #7c3aed;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">Your OTP Code</p>
              <h2 style="color: #7c3aed; font-size: 42px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace; font-weight: 700;">${otp}</h2>
            </div>
            
            <!-- Info -->
            <div style="background: rgba(124, 58, 237, 0.1); padding: 16px; border-radius: 8px; border-left: 4px solid #7c3aed; margin: 30px 0;">
              <p style="color: #666; font-size: 13px; margin: 0;">
                ⏰ This code expires in <strong>5 minutes</strong>. Don't share it with anyone.
              </p>
            </div>
            
            <!-- Footer -->
            <p style="color: #999; font-size: 13px; margin: 30px 0 0 0; border-top: 1px solid #ddd; padding-top: 20px;">
              If you didn't request this OTP, please ignore this email. Your account is safe.
            </p>
            
            <p style="color: #999; font-size: 12px; margin: 15px 0 0 0; text-align: center;">
              © 2026 LivePad. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `Your LivePad OTP code is: ${otp}\n\nThis code expires in 5 minutes.\n\nDo not share this code with anyone.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    return false;
  }
};

export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (err) {
    console.error('❌ Email service error:', err.message);
    return false;
  }
};