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
  updateSubscription,
} from "../controllers/userController.js";

const router = express.Router();

// GET = all users, POST = new user
router.route("/").get(getUsers).post(createUser);

// POST = real login (trusted check + OTP flow)
router.route("/login").post(loginUser);

// POST = verify the OTP code
router.route("/verify-otp").post(verifyOtp);

// GET = login history of one user
router.route("/login-history/:userId").get(getLoginHistory);

// GET + DELETE = trusted devices
router.route("/trusted-devices/:userId").get(getTrustedDevices);
router.route("/trusted-devices/:id").delete(removeTrustedDevice);

// PUT = save theme preference
router.route("/:id/theme").put(updateUserTheme);

// PUT = update subscription plan
router.route("/:id/subscription").put(updateSubscription);

export default router;