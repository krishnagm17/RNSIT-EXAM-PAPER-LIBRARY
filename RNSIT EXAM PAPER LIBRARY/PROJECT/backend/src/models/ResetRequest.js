import mongoose from 'mongoose';

const resetRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// TTL index to automatically delete expired documents after 10 minutes (600 seconds)
resetRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetRequest = mongoose.model('ResetRequest', resetRequestSchema);
