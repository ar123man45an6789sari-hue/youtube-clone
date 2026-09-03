"use client";

import { useEffect, useState } from "react";
import VideoCard from "../components/VideoCard";

// Watch History page: shows videos the user has watched
const HistoryPage = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      let ids: string[] = [];
      try {
        ids = JSON.parse(localStorage.getItem("history") || "[]");
      } catch {
        ids = [];
      }

      const list = await Promise.all(
        ids.map((id) =>
          fetch(`http://localhost:5000/api/videos/${id}`)
            .then((res) => res.json())
            .then((data) => data.data)
            .catch(() => null)
        )
      );

      setVideos(list.filter(Boolean));
      setLoading(false);
    };

    loadVideos();
  }, []);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Watch History</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : videos.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          No videos watched yet. Videos you watch will appear here!
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              id={video._id}
              title={video.title}
              channel={video.channel?.name || "Unknown Channel"}
              views={`${video.views || 0} views`}
              time={new Date(video.createdAt).toLocaleDateString()}
              seed={Math.floor(Math.random() * 1000)}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default HistoryPage;