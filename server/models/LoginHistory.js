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
    browserVersion: { type: String, default: "" },
    browserFull: { type: String, default: "" }, // e.g. "Chrome 131"
    deviceModel: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Desktop" }, // Desktop / Mobile / Tablet
    city: { type: String, default: "Unknown" },
    state: { type: String, default: "Unknown" },
    country: { type: String, default: "Unknown" },
       trusted: { type: Boolean, default: false }, // OTP verify / trusted device login
    deviceToken: { type: String, default: "" }, // browser identity
    reason: { type: String, default: "" }, // why OTP was asked (new device / new ip / new city)
    status: {
      type: String,
      default: "success", // success | otp_sent | otp_failed | blocked
    },
  },
  { timestamps: true } // createdAt = login's time
);

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

export default LoginHistory;