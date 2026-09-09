"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const SignupPage = () => {
  const router = useRouter();
  const { login } = useAuth();
    const { applyTheme } = useTheme();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      return showToast("Please fill all fields!", "error");
    }
    if (formData.password !== formData.confirmPassword) {
      return showToast("Passwords do not match!", "error");
    }
    if (formData.password.length < 6) {
      return showToast("Password must be at least 6 characters!", "error");
    }

    setLoading(true);
    try {
      // Check if user already exists
      const usersRes = await fetch("http://localhost:5000/api/users");
      const usersData = await usersRes.json();
      const existingUser = usersData.data.find((u: any) => u.email === formData.email);

      if (existingUser) {
        return showToast("User already exists! Please login.", "error");
      }

      // Create new user
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      
            // for new account , time-based theme (5 AM - 12 PM IST = light)
      const istHour = Number(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          hour12: false,
        })
      );
      const autoTheme = istHour >= 5 && istHour < 12 ? "light" : "dark";
      applyTheme(autoTheme, false);

      // save auto theme in the new profile
      fetch(`http://localhost:5000/api/users/${data.data._id}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: autoTheme, themeAuto: true }),
      }).catch(() => {});

      // Update global auth state so the navbar refreshes instantly
      login(data.data);
      
      showToast("✅ Account created successfully! Welcome, " + formData.name + "!");
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error: any) {
      showToast("Signup failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {/* Toast Notification */}
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
        <h1 className="mb-6 text-center text-2xl font-semibold">Create Account</h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Join YouTube to share your videos with the world
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

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
              placeholder="Minimum 6 characters"
              className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
              className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-red-600 font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;