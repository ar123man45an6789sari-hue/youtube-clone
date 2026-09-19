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
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Desktop" },
    fileSize: { type: Number, default: 0 }, // in bytes
    status: { type: String, default: "success" },
  },
  { timestamps: true }
);

const Download = mongoose.model("Download", downloadSchema);

export default Download;