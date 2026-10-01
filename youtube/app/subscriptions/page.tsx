"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API } from "../lib/api";
import { getStoredIds } from "../lib/localStore";
import VideoCard from "../components/VideoCard";

// channels the user subscribed to + their latest videos
const SubscriptionsPage = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const ids = getStoredIds("subscriptions");
      try {
        const [chRes, vdRes] = await Promise.all([
          fetch(`${API}/api/channels`).then((r) => r.json()),
          fetch(`${API}/api/videos`).then((r) => r.json()),
        ]);
        const allChannels = chRes.success ? chRes.data : [];
        const allVideos = vdRes.success ? vdRes.data : [];
        setChannels(allChannels.filter((c: any) => ids.includes(c._id)));
        setVideos(allVideos.filter((v: any) => ids.includes(v.channel?._id)));
      } catch (error) {
        console.error("Failed to load subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && channels.length === 0 && (
        <p className="rounded-xl border px-4 py-6 text-sm text-gray-500">
          You have not subscribed to any channel yet. Open a video and press
          Subscribe to follow a creator.{" "}
          <Link href="/" className="font-medium text-red-600 hover:underline">
            Browse videos
          </Link>
        </p>
      )}

      {channels.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {channels.map((c) => (
            <Link
              key={c._id}
              href={`/channel/${c._id}`}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-500/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-medium text-white">
                {c.name?.charAt(0)?.toUpperCase() || "C"}
              </span>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Latest from your channels</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v: any) => (
              <VideoCard
                key={v._id}
                id={v._id}
                title={v.title}
                thumbnail={v.thumbnail}
                channel={v.channel?.name || "Unknown"}
                views={`${v.views || 0} views`}
                time={new Date(v.createdAt).toLocaleDateString()}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
};

export default SubscriptionsPage;
