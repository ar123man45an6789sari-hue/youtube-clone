"use client";

import { useEffect, useState } from "react";

// simple moderation list: users ne jin comments ko report kiya
export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReported = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/comments/reported");
        const data = await res.json();
        if (data.success) setReports(data.data);
      } catch (error) {
        console.error("Failed to load reports:", error);
      }
    };
    fetchReported();
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Reported Comments 🛡️</h1>
      <p className="text-sm text-gray-500">
        Moderation queue: reported comments yahan review ke liye aate hain.
      </p>

      {reports.length === 0 && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          No reported comments right now. Community is clean!
        </p>
      )}

      {reports.map((c) => (
        <div key={c._id} className="rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{c.userName}</p>
            <span className="text-xs text-gray-500">
              {new Date(c.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-sm">{c.text}</p>
          <div className="mt-3 space-y-1 rounded-lg bg-red-50 p-2 text-xs text-red-700">
            {(c.reports || []).map((r: any, i: number) => (
              <p key={i}>
                • {r.reason} (reported by {r.reportedBy})
              </p>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}