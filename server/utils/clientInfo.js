// shared helper: real public IP + browser/os/device + city/state/country
// (used by login history, downloads and comments)

// Render/Vercel put the real visitor ip in x-forwarded-for
export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  let ip = "";
  if (typeof forwarded === "string" && forwarded.length > 0) {
    ip = forwarded.split(",")[0].trim();
  } else {
    ip = req.socket?.remoteAddress || "";
  }
  // ::ffff:1.2.3.4 -> 1.2.3.4 and ::1 -> empty (localhost)
  ip = ip.replace("::ffff:", "");
  if (ip === "::1" || ip === "127.0.0.1") ip = "";
  return ip;
};

// browser name + version, os, device type and device model from the user agent
export const parseUserAgent = (ua = "") => {
  let browser = "Unknown";
  let browserVersion = "";

  const match = (re) => {
    const m = ua.match(re);
    return m ? m[1] : "";
  };

  if (/Edg\//.test(ua)) {
    browser = "Edge";
    browserVersion = match(/Edg\/([\d.]+)/);
  } else if (/OPR\/|Opera/.test(ua)) {
    browser = "Opera";
    browserVersion = match(/(?:OPR|Opera)\/([\d.]+)/);
  } else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) {
    browser = "Chrome";
    browserVersion = match(/Chrome\/([\d.]+)/);
  } else if (/Firefox\//.test(ua)) {
    browser = "Firefox";
    browserVersion = match(/Firefox\/([\d.]+)/);
  } else if (/Safari\//.test(ua)) {
    browser = "Safari";
    browserVersion = match(/Version\/([\d.]+)/);
  }

  let os = "Unknown";
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  const deviceType = /iPad|Tablet/i.test(ua)
    ? "Tablet"
    : /Mobi|Android|iPhone/i.test(ua)
    ? "Mobile"
    : "Desktop";

  // device model: Android puts it inside the brackets, apple reports the family
  let deviceModel = "Unknown";
  if (/iPhone/.test(ua)) deviceModel = "iPhone";
  else if (/iPad/.test(ua)) deviceModel = "iPad";
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android [\d.]+;\s?([^;)]+)/);
    if (m) deviceModel = m[1].replace("Build", "").trim();
  } else if (deviceType === "Desktop") {
    deviceModel = os + " PC";
  }

  return {
    browser,
    browserVersion,
    browserFull: browserVersion ? `${browser} ${browserVersion.split(".")[0]}` : browser,
    os,
    deviceType,
    deviceModel,
  };
};

// approximate location of an ip (free ip-api service, 3s timeout)
export const lookupLocation = async (ip) => {
  const fallback = { city: "Unknown", state: "Unknown", country: "Unknown" };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    // empty ip = ask the service about the caller itself
    const geoRes = await fetch(`http://ip-api.com/json/${ip || ""}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const geo = await geoRes.json();
    if (geo.status === "success") {
      return {
        ip: ip || geo.query,
        city: geo.city || "Unknown",
        state: geo.regionName || "Unknown",
        country: geo.country || "Unknown",
      };
    }
  } catch (error) {
    console.log("Geo lookup failed:", error.message);
  }
  return { ip: ip || "unknown", ...fallback };
};

// one call that returns everything we store for auditing
export const getClientInfo = async (req) => {
  const ip = getClientIp(req);
  const ua = parseUserAgent(req.headers["user-agent"] || "");
  const geo = await lookupLocation(ip);
  return { ...ua, ...geo };
};

export default getClientInfo;
