import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    videoUrl: { type: String, required: true },   // Cloudinary wala link
    thumbnail: { type: String, default: "" },     // Cloudinary wala image link
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",        // Video kisi Channel ki hai
      required: true,
    },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);

export default Video;