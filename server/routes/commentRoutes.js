import express from "express";
import {
  getComments,
  createComment,
  reactComment,
  updateComment,
  deleteComment,
  reportComment,
  getReportedComments,
} from "../controllers/commentController.js";

const router = express.Router();

// moderation list (must be before /:videoId route)
router.route("/reported").get(getReportedComments);

// PUT /api/comments/react/like/:id 
router.route("/react/:type/:id").put(reactComment);

// PUT /api/comments/report/:id
router.route("/report/:id").put(reportComment);

// PUT = edit own comment, DELETE = delete own comment
router.route("/:id").put(updateComment).delete(deleteComment);

// GET = video ke comments, POST = naya comment / reply
router.route("/:videoId").get(getComments).post(createComment);

export default router;