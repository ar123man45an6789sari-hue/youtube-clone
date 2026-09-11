import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ip: { type: String, default: "unknown" },
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Desktop" }, // Desktop / Mobile / Tablet
    city: { type: String, default: "Unknown" },
    state: { type: String, default: "Unknown" },
    country: { type: String, default: "Unknown" },
    trusted: { type: Boolean, default: false }, // Day 10: OTP verify ke baad true hogi
  },
  { timestamps: true } // createdAt = login ka time
);

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

export default LoginHistory;