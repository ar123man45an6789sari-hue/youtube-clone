"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Key } from "lucide-react";
import Link from "next/link";

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [formData, setFormData] = useState({
    resetCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const verifyCode = () => {
    const savedCode = localStorage.getItem(`resetCode-${email}`);
    
    if (!savedCode) {
      return showToast("No reset code found! Request a new one.", "error");
    }
    
    if (formData.resetCode !== savedCode) {
      return showToast("Invalid reset code! Please try again.", "error");
    }
    
    setVerified(true);
    showToast("Code verified! You can now reset your password.", "success");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verified) {
      return showToast("Please verify reset code first!", "error");
    }
    
    if (formData.newPassword.length < 6) {
      return showToast("Password must be at least 6 characters!", "error");
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      return showToast("Passwords do not match!", "error");
    }

    setLoading(true);
    try {
      // Find user and update password
      const res = await fetch("http://localhost:5000/api/users");
      const data = await res.json();
      
      const user = data.data.find((u: any) => u.email === email);
      
      if (!user) {
        return showToast("User not found!", "error");
      }

     // Update password in backend
const updateRes = await fetch(`http://localhost:5000/api/users/${user._id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: formData.newPassword }),
});

const updateData = await updateRes.json();

if (!updateRes.ok || !updateData.success) {
  
  throw new Error(updateData.message || "Failed to update password");
}

      // Clear reset code
      localStorage.removeItem(`resetCode-${email}`);
      
      showToast("Password reset successful! Please login.", "success");
      
      setTimeout(() => {
        router.push("/login");
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
            <Key className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold">Reset Password</h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          {email && <span>For: <strong>{email}</strong></span>}
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          {!verified ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Enter Reset Code
                </label>
                <input
                  type="text"
                  value={formData.resetCode}
                  onChange={(e) => setFormData({ ...formData, resetCode: e.target.value })}
                  placeholder="123456"
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={verifyCode}
                className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Verify Code
              </button>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
                <CheckCircle className="mx-auto mb-1 h-5 w-5" />
                Code Verified!
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="text-red-600 font-medium hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;