import express from "express";
import {
  requestDownload,
  getUserDownloads,
} from "../controllers/downloadController.js";

const router = express.Router();

// POST = request a video download (quota checked)
router.route("/").post(requestDownload);

// GET = download list + remaining quota of one user
router.route("/user/:userId").get(getUserDownloads);

export default router;
