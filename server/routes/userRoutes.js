import express from "express";
import {
  getUsers,
  createUser,
  updateUserTheme,
  loginUser,
  getLoginHistory,
} from "../controllers/userController.js";

const router = express.Router();

// GET = all users, POST = new user
router.route("/").get(getUsers).post(createUser);

// POST = real login (login history record karta hai)
router.route("/login").post(loginUser);

// GET = ek user ki login history
router.route("/login-history/:userId").get(getLoginHistory);

// PUT /api/users/:id/theme - save theme preference
router.route("/:id/theme").put(updateUserTheme);

export default router;