import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",          // Ye channel kisi User ka hai
      required: true,
    },
    name: { type: String, required: true },
    handle: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    avatar: { type: String, default: "" },
    subscribers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
  },
  { timestamps: true }
);

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;