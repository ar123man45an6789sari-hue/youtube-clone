import express from "express";
import {
  getUsers,
  createUser,
  updateUserTheme,
} from "../controllers/userController.js";

const router = express.Router();

// GET = all users, POST = new user
router.route("/").get(getUsers).post(createUser);

// PUT /api/users/:id/theme - save theme preference
router.route("/:id/theme").put(updateUserTheme);

export default router;