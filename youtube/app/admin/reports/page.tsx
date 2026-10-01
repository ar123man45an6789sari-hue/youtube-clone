"use client";
import { API } from "../../lib/api";

import { useEffect, useState } from "react";
export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const fetchReported = async () => {
    try {
      const res = await fetch(`${API}/api/comments/reported`);
      const data = await res.json();
      if (data.success) setReports(data.data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  };

  useEffect(() => {
    fetchReported();
  }, []);

  // admin decision: hide the comment or dismiss the reports
  const moderate = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API}/api/comments/moderate/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, by: "admin" }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(
          action === "hide"
            ? "Comment hidden from viewers."
            : action === "unhide"
            ? "Comment is visible again."
            : "Reports dismissed, comment kept."
        );
        fetchReported();
      }
    } catch (error) {
      console.error("Moderation failed:", error);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Reported Comments 🛡️</h1>
      <p className="text-sm text-gray-500">
        Moderation queue: reported comments land here for review.
      </p>

      {msg && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{msg}</p>
      )}

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
                • {r.reason} (reported by {r.reportedBy}) —{" "}
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
              </p>
            ))}
          </div>

          {(c.moderation || []).length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg border p-2 text-xs text-gray-500">
              <p className="font-medium">Moderation log</p>
              {c.moderation.map((m: any, i: number) => (
                <p key={i}>
                  • {m.action} by {m.by} on {new Date(m.at).toLocaleString()}
                </p>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => moderate(c._id, c.hidden ? "unhide" : "hide")}
              className="rounded-full border px-3 py-1 text-xs font-medium"
            >
              {c.hidden ? "Unhide comment" : "Hide comment"}
            </button>
            <button
              onClick={() => moderate(c._id, "dismiss")}
              className="rounded-full border px-3 py-1 text-xs font-medium"
            >
              Dismiss reports
            </button>
            <span className="text-xs text-gray-500">
              {c.hidden ? "Currently hidden" : "Currently visible"} •{" "}
              {(c.reports || []).length} report(s)
            </span>
          </div>
        </div>
      ))}
    </main>
  );
}