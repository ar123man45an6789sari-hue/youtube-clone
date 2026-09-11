import User from "../models/User.js";
import LoginHistory from "../models/LoginHistory.js";
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

// real login: password verify + login history record (Task 5)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password!" });
    }

    // --- login record: ip + location (free geo service) ---
    let ip = "unknown";
    let city = "Unknown";
    let state = "Unknown";
    let country = "Unknown";
    try {
      // ip-api.com server ki public ip se location bata deta hai
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

    // --- browser / os / device user-agent se ---
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

    await LoginHistory.create({
      userId: user._id,
      ip,
      browser,
      os,
      deviceType,
      city,
      state,
      country,
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

export { getUsers, createUser, updateUserTheme, loginUser, getLoginHistory };