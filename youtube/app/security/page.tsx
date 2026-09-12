"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

// account security page: login history + trusted devices (Task 5)
const SecurityPage = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const load = async () => {
    if (!user?._id) return;
    try {
      const [h, d] = await Promise.all([
        fetch(`http://localhost:5000/api/users/login-history/${user._id}`).then((r) => r.json()),
        fetch(`http://localhost:5000/api/users/trusted-devices/${user._id}`).then((r) => r.json()),
      ]);
      if (h.success) setHistory(h.data);
      if (d.success) setDevices(d.data);
    } catch (error) {
      console.error("Failed to load security data:", error);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const removeDevice = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/users/trusted-devices/${id}`, {
        method: "DELETE",
      });
      load();
    } catch (error) {
      console.error("Remove failed:", error);
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">Account Security 🔐</h1>
        <p className="mt-4 text-sm text-gray-600">
          Please sign in to view your security page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Sign In
        </Link>
      </main>
    );
  }

  const statusColor = (s: string) =>
    s === "success" ? "text-green-600" : s === "otp_sent" ? "text-yellow-600" : "text-red-600";

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Account Security </h1>

      {/* trusted devices */}
      <section className="space-y-3 rounded-xl border p-5 shadow-sm">
        <h2 className="font-medium">Trusted Devices</h2>
        {devices.length === 0 && (
          <p className="text-sm text-gray-500">No trusted devices yet.</p>
        )}
        {devices.map((d) => (
          <div
            key={d._id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {d.browser} on {d.os}
              </p>
              <p className="text-xs text-gray-500">
                {d.city} • trusted until {new Date(d.trustedUntil).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => removeDevice(d._id)}
              className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      {/* login history */}
      <section className="space-y-3 rounded-xl border p-5 shadow-sm">
        <h2 className="font-medium">Login History & OTP Attempts</h2>
        {history.length === 0 && (
          <p className="text-sm text-gray-500">No login records yet.</p>
        )}
        {history.map((h) => (
          <div key={h._id} className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {h.browser} • {h.os} • {h.deviceType}
              </p>
              <span className={`text-xs font-semibold ${statusColor(h.status)}`}>
                {h.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {new Date(h.createdAt).toLocaleString()} • {h.city}, {h.state}, {h.country} • IP {h.ip}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
};

export default SecurityPage;