import User from "../models/User.js";
import Video from "../models/Video.js";
import Download from "../models/Download.js";

// daily download limits per plan (matches the frontend plans config)
const DOWNLOAD_LIMIT = { Free: 1, Bronze: 3, Silver: 5, Gold: 10 };

// device info from user-agent + geo service (3s timeout)
const getDeviceInfo = async (req) => {
  let ip = "unknown";
  let city = "Unknown";
  let state = "Unknown";
  let country = "Unknown";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const geoRes = await fetch("http://ip-api.com/json/", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const geo = await geoRes.json();
    if (geo.status === "success") {
      ip = geo.query;
      city = geo.city;
      state = geo.regionName;
      country = geo.country;
    }
  } catch (error) {
    console.log("Geo lookup failed:", error.message);
  }

  const ua = req.headers["user-agent"] || "";
  const browser = ua.includes("Edg")
    ? "Edge"
    : ua.includes("Chrome")
    ? "Chrome"
    : ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Safari")
    ? "Safari"
    : "Unknown";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac")
    ? "macOS"
    : ua.includes("Android")
    ? "Android"
    : ua.includes("iPhone")
    ? "iOS"
    : ua.includes("Linux")
    ? "Linux"
    : "Unknown";
  const deviceType = /Mobi|Android|iPhone/i.test(ua)
    ? "Mobile"
    : /Tablet|iPad/i.test(ua)
    ? "Tablet"
    : "Desktop";

  return { ip, city, state, country, browser, os, deviceType };
};

// start of today (server local time) for the daily quota reset
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// effective plan of a user (expired plans fall back to Free)
const effectivePlan = (user) => {
  let plan = user.plan || "Free";
  if (plan !== "Free" && user.planExpiry && new Date(user.planExpiry) < new Date()) {
    plan = "Free";
  }
  return plan;
};

// POST /api/downloads - request a video download (quota checked)
const requestDownload = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const plan = effectivePlan(user);
    const limit = DOWNLOAD_LIMIT[plan] || 1;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    // same video within 24h = re-download, does not consume quota
    const duplicate = await Download.findOne({
      userId,
      videoId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    // unique videos downloaded today (duplicates don't add up)
    const todayIds = await Download.find({
      userId,
      createdAt: { $gte: startOfToday() },
    }).distinct("videoId");
    let todayCount = todayIds.length;

    if (!duplicate && todayCount >= limit) {
      return res.status(403).json({
        success: false,
        message: `Daily download limit reached (${limit} per day for ${plan} plan).`,
      });
    }

    const info = await getDeviceInfo(req);

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
      fileSize,
      status: "success",
    });

    if (!duplicate) todayCount += 1;

    res.status(200).json({
      success: true,
      data: {
        download: record,
        limit,
        plan,
        remainingToday: Math.max(0, limit - todayCount),
      },
    });
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

    const downloads = await Download.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    const todayIds = await Download.find({
      userId: req.params.userId,
      createdAt: { $gte: startOfToday() },
    }).distinct("videoId");

    res.status(200).json({
      success: true,
      data: {
        downloads,
        limit,
        plan,
        remainingToday: Math.max(0, limit - todayIds.length),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { requestDownload, getUserDownloads };