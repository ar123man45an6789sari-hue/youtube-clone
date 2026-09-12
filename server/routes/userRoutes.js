import express from "express";
import {
  getUsers,
  createUser,
  updateUserTheme,
  loginUser,
  verifyOtp,
  getLoginHistory,
  getTrustedDevices,
  removeTrustedDevice,
} from "../controllers/userController.js";

const router = express.Router();

// GET = all users, POST = new user
router.route("/").get(getUsers).post(createUser);

// POST = real login (trusted check + OTP flow)
router.route("/login").post(loginUser);

// POST = OTP verify karo
router.route("/verify-otp").post(verifyOtp);

// GET =one user's login history
router.route("/login-history/:userId").get(getLoginHistory);

// GET + DELETE = trusted devices
router.route("/trusted-devices/:userId").get(getTrustedDevices);
router.route("/trusted-devices/:id").delete(removeTrustedDevice);

// PUT /api/users/:id/theme - save theme preference
router.route("/:id/theme").put(updateUserTheme);

export default router;