import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
        avatar: {
      type: String,
      default: "", 
    },
    theme: {
      type: String,
      default: "dark", // "light" or "dark"
    },
        themeAuto: {
      type: Boolean,
      default: true,
    },
   otpCode: { type: String, default: "" },
    otpExpires: { type: Date, default: null },
    plan: { type: String, default: "Free" }, // Free | Bronze | Silver | Gold
    planStart: { type: Date, default: null },
    planExpiry: { type: Date, default: null },
  },
  { timestamps: true } 
);

const User = mongoose.model("User", userSchema);

export default User;