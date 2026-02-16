import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { ResetRequest } from '../models/ResetRequest.js';
import { User } from '../models/User.js';

const router = express.Router();

// Transporter will be initialized inside the route handler to ensure env vars are loaded




router.post('/request', async (req, res) => {
  let email;
  try {
    email = req.body.email;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate Secure Token (Reset Link)
    const socket = await import('crypto');
    var token = socket.randomBytes(32).toString('hex'); // using var or let for scope safety if needed, but actually 'token' might be needed in catch.
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Upsert Reset Request
    await ResetRequest.findOneAndUpdate(
      { email },
      { email, otp: token, expiresAt, verified: false }, // Store token in 'otp' field
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Configure Email Transporter (Lazy load to ensure env vars are ready)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '',
      }
    });

    // Check Creds
    const hasValidCredentials =
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_USER !== 'your_email@gmail.com' &&
      process.env.EMAIL_PASS !== 'your_app_password';

    const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const resetLink = `${clientUrl}/?token=${token}&email=${email}`;

    if (hasValidCredentials) {
      // Log link to console as backup (for dev/debugging)
      console.log("------------------------------------------------");
      console.log(` [INFO] Email sent to ${email}`);
      console.log(` [INFO] Backup Link: ${resetLink}`);
      console.log("------------------------------------------------");

      await transporter.sendMail({
        from: `"RNSIT Library" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Link - RNSIT Library',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Password Reset Request</h2>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">Reset Password</a>
            <p style="font-size: 12px; color: #666;">Or copy this link: ${resetLink}</p>
            <p>This link is valid for 15 minutes.</p>
          </div>
        `
      });
      res.status(200).json({ message: 'Reset link sent to your email.' });
    } else {
      console.log("------------------------------------------------");
      console.log(" [DEV MODE] Email credentials not configured.");
      console.log(` [DEV MODE] Reset Link for ${email}:`);
      console.log(` ${resetLink}`);
      console.log("------------------------------------------------");
      res.status(200).json({ message: 'Reset link generated (Check Console)' });
    }

  } catch (error) {
    console.error('Reset request error:', error);
    const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const resetLink = token ? `${clientUrl}/?token=${token}&email=${email}` : '#';

    if (error.code === 'EAUTH' || error.response?.includes('Authentication required')) {
      console.log("------------------------------------------------");
      console.log(" [DEV MODE] Email send failed (Invalid Credentials).");
      console.log(` [DEV MODE] Reset Link for ${email}:`);
      console.log(` ${resetLink}`);
      console.log("------------------------------------------------");
      return res.status(200).json({ message: 'Reset link generated (Check Backend Console)' });
    }
    res.status(500).json({ message: 'Failed to send reset link.' });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const request = await ResetRequest.findOne({ email });

    if (!request) {
      return res.status(400).json({ message: "Invalid or expired request" });
    }

    if (request.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > request.expiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Update User Password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Delete the request
    await ResetRequest.deleteOne({ email });

    res.json({ message: "Password reset successfully. You can now login." });

  } catch (error) {
    console.error("Confirm reset error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
