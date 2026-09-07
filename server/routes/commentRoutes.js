import express from "express";
import {
  getComments,
  createComment,
  reactComment,
  updateComment,
  deleteComment,
} from "../controllers/commentController.js";

const router = express.Router();

// GET = video ke comments, POST = naya comment / reply
router.route("/:videoId").get(getComments).post(createComment);

// PUT /api/comments/react/like/:id  (ya dislike)
router.route("/react/:type/:id").put(reactComment);

// PUT = edit own comment, DELETE = delete own comment
router.route("/:id").put(updateComment).delete(deleteComment);

export default router;