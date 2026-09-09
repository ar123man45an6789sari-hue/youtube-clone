"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const LoginPage = () => {
  const router = useRouter();
  const { login } = useAuth();
  const { applyTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return showToast("Please fill all fields!", "error");
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users");
      const data = await res.json();
      
      const user = data.data.find(
        (u: any) => u.email === formData.email && u.password === formData.password
      );

      if (!user) {
        return showToast("Invalid email or password!", "error");
      }

            // Time-based theme: 5 AM - 12 PM IST = light, or dark
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

      // auto theme ko profile mein save karo
      if (user.themeAuto !== false) {
        fetch(`http://localhost:5000/api/users/${user._id}/theme`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: finalTheme, themeAuto: true }),
        }).catch(() => {});
      }

      // Update global auth state so the navbar refreshes instantly
      login(user);
      
      showToast("✅ Welcome back, " + user.name + "!");
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error: any) {
      showToast("Login failed: " + error.message, "error");
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

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-red-600 font-medium hover:underline">
            Sign Up
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-gray-600">
  <Link href="/forgot-password" className="text-red-600 font-medium hover:underline">
    Forgot Password?
  </Link>
</p>
      </div>
    </div>
  );
};

export default LoginPage;