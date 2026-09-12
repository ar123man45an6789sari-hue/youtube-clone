import User from "../models/User.js";
import LoginHistory from "../models/LoginHistory.js";
import TrustedDevice from "../models/TrustedDevice.js";
const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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
const sendOtpEmail = async (to, code) => {
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_PASS;
     if (!mailUser || !mailPass) {
    console.log("MAIL_USER/MAIL_PASS not set - using demo mode");
    return false;
  }
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: mailUser, pass: mailPass },
    });
    await transporter.sendMail({
      from: mailUser,
      to,
      subject: "Your YouTube Clone login OTP",
      text: `Your one-time login code is ${code}. It expires in 10 minutes. If you did not try to login, please ignore this email.`,
    });
    return true;
  } catch (error) {
    console.log("Email send failed:", error.message);
    return false;
  }
};
const getDeviceInfo = async (req) => {
  let ip = "unknown";
  let city = "Unknown";
  let state = "Unknown";
  let country = "Unknown";
  try {
    const geoRes = await fetch("http://ip-api.com/json/");
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

    const info = await getDeviceInfo(req);
    const token = deviceToken || "";

    // pehle se trusted device? seedha andar
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


    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = code;
    user.otpExpires = new Date(Date.now() + 10 * 60000);
    await user.save();

    const emailed = await sendOtpEmail(user.email, code);

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
        : "New device detected! (Demo mode)",
      demoOtp: emailed ? undefined : code,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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


    user.otpCode = "";
    user.otpExpires = null;
    await user.save();

    
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

// (session management)
const removeTrustedDevice = async (req, res) => {
  try {
    await TrustedDevice.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: { id: req.params.id } });
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
};