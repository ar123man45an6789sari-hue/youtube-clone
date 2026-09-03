import express from "express";
import { getComments, createComment } from "../controllers/commentController.js";

const router = express.Router();

// Route handles both GET (fetch) and POST (create) for a specific video
router.route("/:videoId").get(getComments).post(createComment);

export default router;