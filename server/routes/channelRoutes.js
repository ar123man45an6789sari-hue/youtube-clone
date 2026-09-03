import express from "express";
import { getChannels, createChannel } from "../controllers/channelController.js";

const router = express.Router();

router.route("/").get(getChannels).post(createChannel);

export default router;