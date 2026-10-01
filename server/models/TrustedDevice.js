import mongoose from "mongoose";

const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceToken: { type: String, default: "" }, 
    browser: { type: String, default: "Unknown" },
    browserFull: { type: String, default: "" },
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Desktop" },
    deviceModel: { type: String, default: "Unknown" },
    ip: { type: String, default: "unknown" },
    city: { type: String, default: "Unknown" },
    state: { type: String, default: "Unknown" },
    country: { type: String, default: "Unknown" },
    lastUsedAt: { type: Date, default: Date.now },
    trustedUntil: { type: Date, required: true }, //after 7days,it will be expired.
  },
  { timestamps: true }
);

const TrustedDevice = mongoose.model("TrustedDevice", trustedDeviceSchema);

export default TrustedDevice;