import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rnsit.ac.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rnsit@2025';
const RNSIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@rnsit\.ac\.in$/;

const sanitizeUser = (userDoc) => ({
  id: userDoc._id.toString(),
  name: userDoc.name,
  email: userDoc.email,
  role: userDoc.role
});

import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rnsit-secret-key-change-me';

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!RNSIT_EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Please use a valid @rnsit.ac.in email address.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'STUDENT'
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setTokenCookie(res, token);

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }

    const payload = await verifyGoogleToken(token);
    if (!payload) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { email, name, sub: googleId } = payload;

    if (!RNSIT_EMAIL_REGEX.test(email)) {
      return res.status(403).json({ message: 'Only @rnsit.ac.in emails are allowed.' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create new student user
      user = await User.create({
        name,
        email,
        passwordHash: 'GOOGLE_AUTH_NO_PASSWORD', // Placeholder, cannot login with password
        role: 'STUDENT',
        googleId
      });
    }

    const sessionToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setTokenCookie(res, sessionToken);

    return res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Google login failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    if (isAdmin || email === ADMIN_EMAIL) {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUser = {
          id: 'admin',
          name: 'Administrator',
          email: ADMIN_EMAIL,
          role: 'ADMIN'
        };
        const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '7d' });
        setTokenCookie(res, token);
        return res.json(adminUser);
      }
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setTokenCookie(res, token);

    return res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to login' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'ADMIN') {
      return res.json({
        id: 'admin',
        name: 'Administrator',
        email: ADMIN_EMAIL,
        role: 'ADMIN'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    res.clearCookie('token');
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
});


import { TempUser } from '../models/TempUser.js';
import { sendOtpEmail } from '../utils/email.js';

// --- OTP Registration Flow ---

// Step 1: Initialize Signup (Validate inputs, check duplicates, send OTP)
router.post('/signup-init', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!RNSIT_EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Please use a valid @rnsit.ac.in email address.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert TempUser (overwrite if exists)
    await TempUser.findOneAndUpdate(
      { email },
      { name, email, passwordHash, otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send Email
    const emailSent = await sendOtpEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email.' });
    }

    console.log(`DEV ONLY: OTP for ${email} is ${otp}`);

    res.json({ message: 'OTP sent successfully. Please check your email.' });
  } catch (error) {
    console.error('Signup Init Error:', error);
    res.status(500).json({ message: 'Failed to initialize signup' });
  }
});

// Step 2: Complete Signup (Verify OTP, create User)
router.post('/signup-complete', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) {
      return res.status(400).json({ message: 'Invalid or expired registration request.' });
    }

    if (tempUser.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > tempUser.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Create real user
    const user = await User.create({
      name: tempUser.name,
      email: tempUser.email,
      passwordHash: tempUser.passwordHash,
      role: 'STUDENT'
    });

    // Delete temp user
    await TempUser.deleteOne({ _id: tempUser._id });

    // Login (Generate Token)
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setTokenCookie(res, token);

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    console.error('Signup Complete Error:', error);
    res.status(500).json({ message: 'Failed to complete registration' });
  }
});

export default router;

