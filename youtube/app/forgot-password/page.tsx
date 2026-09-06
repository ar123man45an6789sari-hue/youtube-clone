"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      return showToast("Please enter your email address!", "error");
    }

    setLoading(true);
    try {
      // Check if user exists
      const res = await fetch("http://localhost:5000/api/users");
      const data = await res.json();
      
      const user = data.data.find((u: any) => u.email === email);

      if (!user) {
        return showToast("No account found with this email!", "error");
      }

      // Generate reset token (simple 6-digit code)
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In real app, send email here
      // For demo, show code in alert
      alert(`Password Reset Code for ${email}:\n\n${resetCode}\n\n(Note: In production, this would be sent to your email)`);
      
      // Store reset code in localStorage (demo purpose)
      localStorage.setItem(`resetCode-${email}`, resetCode);
      
      setSent(true);
      showToast("Reset code generated! Check alert.", "success");
      
      // Redirect to reset page with email
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 1500);
      
    } catch (error: any) {
      showToast("Error: " + error.message, "error");
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
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Mail className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold">Forgot Password?</h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a code to reset your password
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Sending Code..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-4 text-green-600">
              <CheckCircle className="mx-auto h-12 w-12" />
            </div>
            <p className="text-sm text-gray-600">
              Reset code sent to <strong>{email}</strong>
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link href="/login" className="text-red-600 font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;