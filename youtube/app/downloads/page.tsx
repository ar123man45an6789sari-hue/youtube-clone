"use client";
import { API } from "../lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// convert bytes into a readable MB string
const formatSize = (bytes: number) => {
  if (!bytes) return "Unknown size";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

// downloads library: saved downloads + today's quota meter (Task 2)
const DownloadsPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user?._id) return;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/downloads/user/${user._id}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (error) {
        console.error("Failed to load downloads:", error);
      }
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">My Downloads</h1>
        <p className="mt-4 text-sm text-gray-600">
          Please sign in to view your downloads.
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

  const downloads = data?.downloads || [];
  const limit = data?.limit || 0;
  const remaining = data?.remainingToday || 0;
  const used = Math.max(0, limit - remaining);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">My Downloads</h1>

      {/* quota meter */}
      <section className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{data?.plan || "Free"} plan</p>
            <p className="text-sm text-gray-600">
              {remaining} of {limit} downloads left today
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {used}/{limit} used
          </span>
        </div>
        <div className="mt-4 h-2 w-full rounded bg-gray-200">
          <div
            className="h-full rounded bg-blue-600"
            style={{ width: limit ? `${(used / limit) * 100}%` : "0%" }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Quota resets at the start of each new day.
        </p>
      </section>

      {/* downloads list */}
      <section className="space-y-3">
        {downloads.length === 0 && (
          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            No downloads yet. Videos you download will appear here.
          </p>
        )}
        {downloads.map((d: any) => (
          <div
            key={d._id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border p-4 shadow-sm"
          >
            <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-200">
              {d.thumbnail ? (
                <img
                  src={d.thumbnail}
                  alt={d.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <Download size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.title || "Untitled video"}</p>
              <p className="text-xs text-gray-500">
                {new Date(d.createdAt).toLocaleString()} • {formatSize(d.fileSize)} •{" "}
                {d.plan} plan • {d.deviceType}
              </p>
            </div>
            <a
              href={d.videoUrl}
              target="_blank"
              rel="noopener"
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Re-download
            </a>
          </div>
        ))}
      </section>
    </main>
  );
};

export default DownloadsPage;