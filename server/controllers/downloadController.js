import User from "../models/User.js";
import Video from "../models/Video.js";
import Download from "../models/Download.js";
import TrustedDevice from "../models/TrustedDevice.js";
import { getClientInfo } from "../utils/clientInfo.js";

// daily + monthly download limits per plan (matches the frontend plans config)
const DOWNLOAD_LIMIT = { Free: 1, Bronze: 3, Silver: 5, Gold: 10 };
const MONTHLY_LIMIT = { Free: 5, Bronze: 40, Silver: 90, Gold: 250 };

// how many different devices a user may download from (device registration)
const MAX_DEVICES = 3;

// device + location info of the real visitor
const getDeviceInfo = async (req) => getClientInfo(req);

// start of today / this month (used for the quota resets)
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const startOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// effective plan of a user (expired plans fall back to Free)
const effectivePlan = (user) => {
  let plan = user.plan || "Free";
  if (plan !== "Free" && user.planExpiry && new Date(user.planExpiry) < new Date()) {
    plan = "Free";
  }
  return plan;
};

// counts only the downloads that actually used quota
const usedQuota = async (userId, since) => {
  const list = await Download.find({
    userId,
    status: "success",
    countsAgainstQuota: true,
    createdAt: { $gte: since },
  }).distinct("videoId");
  return list.length;
};

// POST /api/downloads - request a video download (quota checked)
const requestDownload = async (req, res) => {
  try {
    const { userId, videoId, deviceToken } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const plan = effectivePlan(user);
    const limit = DOWNLOAD_LIMIT[plan] || 1;
    const monthlyLimit = MONTHLY_LIMIT[plan] || 5;
    const info = await getDeviceInfo(req);

    // small helper so every blocked attempt is also stored for auditing
    const block = async (message, video) => {
      await Download.create({
        userId,
        videoId,
        title: video?.title || "",
        thumbnail: video?.thumbnail || "",
        videoUrl: video?.videoUrl || "",
        plan,
        ...info,
        deviceToken: deviceToken || "",
        status: "blocked",
        note: message,
        countsAgainstQuota: false,
      });
      return res.status(403).json({ success: false, message });
    };

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    // expired paid plan = Free limits again
    if (
      user.plan !== "Free" &&
      user.planExpiry &&
      new Date(user.planExpiry) < new Date()
    ) {
      await User.findByIdAndUpdate(userId, {
        plan: "Free",
        planStart: null,
        planExpiry: null,
      });
    }

    // device limit: downloads only from a few known devices
    if (deviceToken) {
      const usedTokens = await Download.find({
        userId,
        status: "success",
        deviceToken: { $ne: "" },
      }).distinct("deviceToken");
      if (
        usedTokens.length >= MAX_DEVICES &&
        !usedTokens.includes(deviceToken)
      ) {
        return block(
          `Download blocked: this account already downloads from ${MAX_DEVICES} devices. Remove a device from the security page first.`,
          video
        );
      }
    }

    // same video within 24h = re-download, does not consume quota
    const duplicate = await Download.findOne({
      userId,
      videoId,
      status: "success",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    let todayCount = await usedQuota(userId, startOfToday());
    const monthCount = await usedQuota(userId, startOfMonth());

    if (!duplicate && todayCount >= limit) {
      return block(
        `Daily download limit reached (${limit} per day for the ${plan} plan). Upgrade your plan or try again tomorrow.`,
        video
      );
    }
    if (!duplicate && monthCount >= monthlyLimit) {
      return block(
        `Monthly download limit reached (${monthlyLimit} per month for the ${plan} plan).`,
        video
      );
    }

    // file size from Cloudinary via HEAD request (3s timeout)
    let fileSize = 0;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const head = await fetch(video.videoUrl, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timer);
      fileSize = Number(head.headers.get("content-length") || 0);
    } catch (error) {
      console.log("File size lookup failed:", error.message);
    }

    const record = await Download.create({
      userId,
      videoId,
      title: video.title,
      thumbnail: video.thumbnail || "",
      videoUrl: video.videoUrl,
      plan,
      ...info,
      deviceToken: deviceToken || "",
      fileSize,
      status: "success",
      note: duplicate ? "Re-download within 24h (quota not used again)" : "",
      countsAgainstQuota: !duplicate,
    });

    if (!duplicate) todayCount += 1;

    res.status(200).json({
      success: true,
      data: {
        download: record,
        limit,
        monthlyLimit,
        plan,
        duplicate: Boolean(duplicate),
        remainingToday: Math.max(0, limit - todayCount),
        remainingMonth: Math.max(0, monthlyLimit - (duplicate ? monthCount : monthCount + 1)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/downloads/:id/status - mark a download failed/interrupted or completed
const updateDownloadStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowed = ["success", "failed", "interrupted"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Unknown status" });
    }

    const record = await Download.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Download not found" });
    }

    record.status = status;
    record.note = note || record.note;
    // a failed/interrupted download must not eat the user's quota
    if (status !== "success") record.countsAgainstQuota = false;
    await record.save();

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/downloads/user/:userId - download list + remaining quota
const getUserDownloads = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const plan = effectivePlan(user);
    const limit = DOWNLOAD_LIMIT[plan] || 1;
    const monthlyLimit = MONTHLY_LIMIT[plan] || 5;

    const downloads = await Download.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    const todayCount = await usedQuota(req.params.userId, startOfToday());
    const monthCount = await usedQuota(req.params.userId, startOfMonth());
    const devices = await TrustedDevice.find({ userId: req.params.userId }).countDocuments();

    res.status(200).json({
      success: true,
      data: {
        downloads,
        limit,
        monthlyLimit,
        plan,
        planExpiry: user.planExpiry,
        devices,
        maxDevices: MAX_DEVICES,
        usedToday: todayCount,
        remainingToday: Math.max(0, limit - todayCount),
        remainingMonth: Math.max(0, monthlyLimit - monthCount),
        resetsAt: new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { requestDownload, getUserDownloads, updateDownloadStatus };
