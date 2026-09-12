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
    os: { type: String, default: "Unknown" },
    city: { type: String, default: "Unknown" },
    trustedUntil: { type: Date, required: true }, //after 7days,it will be expired.
  },
  { timestamps: true }
);

const TrustedDevice = mongoose.model("TrustedDevice", trustedDeviceSchema);

export default TrustedDevice;