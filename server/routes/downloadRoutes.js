import express from "express";
import {
  requestDownload,
  getUserDownloads,
  updateDownloadStatus,
} from "../controllers/downloadController.js";

const router = express.Router();

// POST = request a video download (quota checked)
router.route("/").post(requestDownload);

// PUT = mark a download failed / interrupted / completed
router.route("/:id/status").put(updateDownloadStatus);

// GET = download list + remaining quota of one user
router.route("/user/:userId").get(getUserDownloads);

export default router;
