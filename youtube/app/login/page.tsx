"use client";
import { API } from "../lib/api";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const LoginPage = () => {
  const router = useRouter();
  const { login } = useAuth();
  const { applyTheme } = useTheme();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [otpInput, setOtpInput] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [deviceToken, setDeviceToken] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [demoCode, setDemoCode] = useState("");

  // unique identity per browser (for trusted devices)
  useEffect(() => {
    let token = localStorage.getItem("deviceToken");
    if (!token) {
      token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("deviceToken", token);
    }
    setDeviceToken(token);
  }, []);

  // resend OTP countdown timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // common work after login: theme, auth state and redirect
  const finishLogin = (user: any) => {
    const istHour = Number(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      })
    );
    const autoTheme = istHour >= 5 && istHour < 12 ? "light" : "dark";
    const finalTheme =
      user.themeAuto === false && user.theme ? user.theme : autoTheme;
    applyTheme(finalTheme, false);

    if (user.themeAuto !== false) {
      fetch(`${API}/api/users/${user._id}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: finalTheme, themeAuto: true }),
      }).catch(() => {});
    }

    login(user);
    showToast("✅ Welcome back, " + (user.name || "friend") + "!");
    setTimeout(() => router.push("/"), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return showToast("Please fill all fields!", "error");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          deviceToken,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return showToast(data.message || "Invalid email or password!", "error");
      }

      // new device -> open the OTP step
      if (data.otpRequired) {
        setStep("otp");
        setDemoCode(data.demoOtp || "");
        setResendIn(30);
        showToast(
          data.demoOtp
            ? `Email failed - demo code: ${data.demoOtp}`
            : "OTP sent to your registered email!",
          "success"
        );
        return;
      }

      finishLogin(data.data);
    } catch (error: any) {
      showToast("Login failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      return showToast("Please enter the code!", "error");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: otpInput,
          deviceToken,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return showToast(data.message || "Invalid code!", "error");
      }

      finishLogin(data.data);
    } catch (error: any) {
      showToast("Verification failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // resend OTP (same login call again, generates a fresh code)
  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          deviceToken,
        }),
      });
      const data = await res.json();

      if (data.success && data.otpRequired) {
        setDemoCode(data.demoOtp || "");
        setResendIn(30);
        showToast(
          data.demoOtp
            ? `Email failed - demo code: ${data.demoOtp}`
            : "New code sent to your email!",
          "success"
        );
      } else {
        showToast(data.message || "Resend failed!", "error");
      }
    } catch (error: any) {
      showToast("Resend failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-lg">
        {step === "login" ? (
          <>
            <h1 className="mb-6 text-center text-2xl font-semibold">Sign In</h1>
            <p className="mb-6 text-center text-sm text-gray-600">
              Welcome back to YouTube
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              <Link href="/forgot-password" className="text-red-600 font-medium hover:underline">
                Forgot Password?
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <ShieldCheck className="h-7 w-7 text-blue-600" />
              </div>
            </div>
            <h1 className="mb-2 text-center text-2xl font-semibold">Verify It's You</h1>
            <p className="mb-6 text-center text-sm text-gray-600">
              We detected a new device. Enter the 6-digit code sent to{" "}
              <strong>{formData.email}</strong>
            </p>

            <form onSubmit={handleOtp} className="space-y-4">
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full rounded-lg border px-4 py-3 text-center text-xl tracking-widest focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
            </form>

            {/* shown only when the email could not be delivered */}
            {demoCode && (
              <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-center text-xs text-yellow-700">
                Email not delivered - demo code: <strong>{demoCode}</strong>
              </p>
            )}

            <p className="mt-4 text-center text-xs text-gray-500">
              Didn't get the code?{" "}
              {resendIn > 0 ? (
                <span>Resend in {resendIn}s</span>
              ) : (
                <button onClick={handleResend} className="font-medium text-blue-600">
                  Resend Code
                </button>
              )}{" "}
              • Wrong device?{" "}
              <button onClick={() => setStep("login")} className="text-red-600 font-medium">
                Go back
              </button>
            </p>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-red-600 font-medium hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;