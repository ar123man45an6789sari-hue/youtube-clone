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
      unique: true, // Ek email se do account nahi banenge
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "", // Profile photo ka link (baad mein Firebase se aayega)
    },
  },
  { timestamps: true } // Ye createdAt aur updatedAt ka time khud save karega
);

const User = mongoose.model("User", userSchema);

export default User;