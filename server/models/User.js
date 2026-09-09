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
  },
  { timestamps: true } 
);

const User = mongoose.model("User", userSchema);

export default User;