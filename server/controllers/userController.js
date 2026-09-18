import User from "../models/User.js";
import LoginHistory from "../models/LoginHistory.js";
import TrustedDevice from "../models/TrustedDevice.js";

// fetch all users from the database
const getUsers = async (req, res) => {
  try {
        const users = await User.find({});
    for (const u of users) {
      await applyExpiryCheck(u);
    }
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// save a new user in the database
const createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// save the user's theme preference (auto or manual)
const updateUserTheme = async (req, res) => {
  try {
    const { theme, themeAuto } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme, themeAuto },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// send the OTP email (Nodemailer), falls back to demo mode if not configured
const sendOtpEmail = async (to, code) => {
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_PASS;
  if (!mailUser || !mailPass) {
    console.log("MAIL_USER/MAIL_PASS not set - using demo mode");
    return false;
  }

  const mailBody = {
    from: mailUser,
    to,
    subject: "Your YouTube Clone login OTP",
    text: `Your one-time login code is ${code}. It expires in 10 minutes. If you did not try to login, please ignore this email.`,
  };

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: mailUser, pass: mailPass },
      connectionTimeout: 4000, // fail fast instead of hanging
      greetingTimeout: 4000,
      socketTimeout: 6000,
    });

    try {
      await transporter.sendMail(mailBody);
      return true;
    } catch (firstError) {
      // retry once, network hiccups happen
      console.log("Email retry after:", firstError.message);
      await transporter.sendMail(mailBody);
      return true;
    }
  } catch (error) {
    console.log("Email send failed:", error.message);
    return false;
  }
};

// collect device and location info from user-agent and geo service
const getDeviceInfo = async (req) => {
  let ip = "unknown";
  let city = "Unknown";
  let state = "Unknown";
  let country = "Unknown";

  try {
    // 3 second timeout so login never waits on the geo service
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
// if the plan has expired, downgrade the user back to Free (data preserved)
const applyExpiryCheck = async (user) => {
  if (
    user.plan &&
    user.plan !== "Free" &&
    user.planExpiry &&
    new Date(user.planExpiry) < new Date()
  ) {
    user.plan = "Free";
    user.planStart = null;
    user.planExpiry = null;
    await user.save();
  }
  return user;
};
// real login: password verify + trusted device check + OTP (Task 5)
const loginUser = async (req, res) => {
  try {
    const { email, password, deviceToken } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password!" });
    }
        await applyExpiryCheck(user);

    const info = await getDeviceInfo(req);
    const token = deviceToken || "";

    // already a trusted device? login directly
    const trusted = await TrustedDevice.findOne({
      userId: user._id,
      deviceToken: token,
      trustedUntil: { $gt: new Date() },
    });

    if (trusted) {
      await LoginHistory.create({
        userId: user._id,
        ...info,
        trusted: true,
        status: "success",
        deviceToken: token,
      });
      return res.status(200).json({ success: true, data: user });
    }

    // new device -> generate an OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = code;
    user.otpExpires = new Date(Date.now() + 10 * 60000); // valid for 10 minutes
    await user.save();

    // start the email now but wait at most 5 seconds for it,
    // so a slow mail server never keeps the user buffering
    const emailPromise = sendOtpEmail(user.email, code);
    const emailed = await Promise.race([
      emailPromise,
      new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    emailPromise.catch(() => {}); // finishes in background, errors logged inside

    await LoginHistory.create({
      userId: user._id,
      ...info,
      trusted: false,
      status: "otp_sent",
      deviceToken: token,
    });

    res.status(200).json({
      success: true,
      otpRequired: true,
      message: emailed
        ? "OTP sent to your registered email!"
        : "New device detected! Verify with the code shown below.",
      demoOtp: emailed ? undefined : code,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// verify the OTP code, mark the device trusted on success
const verifyOtp = async (req, res) => {
  try {
    const { email, code, deviceToken } = req.body;
    const token = deviceToken || "";

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const valid =
      user.otpCode &&
      user.otpCode === code &&
      user.otpExpires &&
      user.otpExpires > new Date();

    if (!valid) {
      // record the failed OTP attempt
      await LoginHistory.create({
        userId: user._id,
        ip: "unknown",
        browser: "Unknown",
        os: "Unknown",
        deviceType: "Unknown",
        city: "Unknown",
        state: "Unknown",
        country: "Unknown",
        trusted: false,
        status: "otp_failed",
        deviceToken: token,
      });
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired code. Please try again." });
    }

    // clear the used OTP
    user.otpCode = "";
    user.otpExpires = null;
    await user.save();

    // copy device info from the last otp_sent attempt
    const lastAttempt = await LoginHistory.findOne({
      userId: user._id,
      deviceToken: token,
      status: "otp_sent",
    }).sort({ createdAt: -1 });

    const info = lastAttempt
      ? {
          ip: lastAttempt.ip,
          browser: lastAttempt.browser,
          os: lastAttempt.os,
          deviceType: lastAttempt.deviceType,
          city: lastAttempt.city,
          state: lastAttempt.state,
          country: lastAttempt.country,
        }
      : {
          ip: "unknown",
          browser: "Unknown",
          os: "Unknown",
          deviceType: "Unknown",
          city: "Unknown",
          state: "Unknown",
          country: "Unknown",
        };

    // mark this device trusted for 7 days
    await TrustedDevice.create({
      userId: user._id,
      deviceToken: token,
      browser: info.browser,
      os: info.os,
      city: info.city,
      trustedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await LoginHistory.create({
      userId: user._id,
      ...info,
      trusted: true,
      status: "success",
      deviceToken: token,
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// full login history of one user (for the security page)
const getLoginHistory = async (req, res) => {
  try {
    const history = await LoginHistory.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// trusted devices list
const getTrustedDevices = async (req, res) => {
  try {
    const list = await TrustedDevice.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// remove a trusted device (session management)
const removeTrustedDevice = async (req, res) => {
  try {
    await TrustedDevice.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// update subscription plan (demo activation today, Razorpay verification from Day 15)
const updateSubscription = async (req, res) => {
  try {
    const { plan, months } = req.body;
    const allowed = ["Free", "Bronze", "Silver", "Gold"];
    if (!allowed.includes(plan)) {
      return res.status(400).json({ success: false, message: "Unknown plan" });
    }

    const update = { plan };
    if (plan === "Free") {
      update.planStart = null;
      update.planExpiry = null;
    } else {
      const now = new Date();
      update.planStart = now;
      update.planExpiry = new Date(now.getTime() + (months || 1) * 30 * 24 * 60 * 60 * 1000);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  getUsers,
  createUser,
  updateUserTheme,
  loginUser,
  verifyOtp,
  getLoginHistory,
  getTrustedDevices,
  removeTrustedDevice,
  updateSubscription,
};