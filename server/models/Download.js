import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    title: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    plan: { type: String, default: "Free" }, // plan used at download time
    ip: { type: String, default: "unknown" },
    browser: { type: String, default: "Unknown" },
    browserFull: { type: String, default: "" },
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Desktop" },
    deviceModel: { type: String, default: "Unknown" },
    deviceToken: { type: String, default: "" }, // which registered browser/device
    city: { type: String, default: "Unknown" },
    state: { type: String, default: "Unknown" },
    country: { type: String, default: "Unknown" },
    fileSize: { type: Number, default: 0 }, // in bytes
    // success | blocked (quota/plan) | failed (interrupted) | re-download
    status: { type: String, default: "success" },
    note: { type: String, default: "" }, // why a download was blocked or failed
    countsAgainstQuota: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Download = mongoose.model("Download", downloadSchema);

export default Download;
