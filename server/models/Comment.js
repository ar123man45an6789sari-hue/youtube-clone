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
      default: "", // logged-in user ki id (empty for guest)
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
      default: null, // null = top level comment, then  reply
    },
    likes: {
      type: [String],
      default: [], // ids of the users who liked this comment
    },
    dislikes: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
      default: "", // profile picture url (if the user has one)
    },
    city: { type: String, default: "" },   // where the comment was posted from
    country: { type: String, default: "" },
    lang: { type: String, default: "" },   // language guess of the comment text
    mentions: { type: [String], default: [] }, // @usernames inside the text
    editCount: { type: Number, default: 0 },
    editedAt: {
      type: Date,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false, // soft delete when the comment already has replies
    },
    reported: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false, // hidden by a moderator after review
    },
    moderation: {
      type: [{ action: String, by: String, at: Date }],
      default: [], // full moderation record
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