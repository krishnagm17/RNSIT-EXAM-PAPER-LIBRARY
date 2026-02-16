import mongoose from 'mongoose';

const tempUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 } // Automatically delete documents after they expire
}, { timestamps: true });

export const TempUser = mongoose.model('TempUser', tempUserSchema);
