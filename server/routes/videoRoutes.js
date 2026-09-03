import express from "express";
import {
  getVideos,
  getVideoById,
  createVideo,
  incrementViews,
  toggleLike,
  toggleDislike,
  getVideosByChannel,
  searchVideos,
} from "../controllers/videoController.js";

const router = express.Router();

router.route("/").get(getVideos).post(createVideo);
router.route("/search").get(searchVideos);
router.route("/channel/:channelId").get(getVideosByChannel);
router.route("/:id").get(getVideoById);
router.route("/:id/views").post(incrementViews);
router.route("/:id/like").post(toggleLike);
router.route("/:id/dislike").post(toggleDislike);

export default router;