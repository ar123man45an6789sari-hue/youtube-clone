import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    userId: {
      type: String,
      default: "", // logged-in user ki id (guests ke liye khali)
    },
    userName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // null = top level comment, warna reply
    },
    likes: {
      type: [String],
      default: [], // jin users ne like kiya unki ids
    },
    dislikes: {
      type: [String],
      default: [],
    },
    editedAt: {
      type: Date,
      default: null,
    },
    reported: {
      type: Boolean,
      default: false,
    },
    reports: {
      type: [{ reason: String, reportedBy: String, createdAt: Date }],
      default: [],
    },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
);

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;