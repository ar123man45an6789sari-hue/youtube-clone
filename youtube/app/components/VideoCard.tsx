"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type VideoCardProps = {
  id: string | number;
  title: string;
  channel: string;
  views: string;
  time: string;
  thumbnail?: string; // real thumbnail from database (optional)
};

// stable placeholder seed derived from the video id
// (Math.random renders differently on server and client -> hydration error)
const seedFromId = (id: string) => {
  let n = 0;
  for (let i = 0; i < id.length; i++) {
    n = (n * 31 + id.charCodeAt(i)) % 1000000;
  }
  return n;
};

const VideoCard = ({ id, title, channel, views, time, thumbnail }: VideoCardProps) => {
  const [percent, setPercent] = useState(0);
  const [completed, setCompleted] = useState(false);

  // read the watch position saved by the video player (browser only)
  useEffect(() => {
    const saved = Number(localStorage.getItem(`progress-${id}`) || 0);
    const duration = Number(localStorage.getItem(`duration-${id}`) || 0);
    const done = localStorage.getItem(`completed-${id}`) === "true";
    setCompleted(done);
    if (!done && duration > 0 && saved > 0) {
      setPercent(Math.min(100, Math.round((saved / duration) * 100)));
    }
  }, [id]);

  return (
    <Link href={`/video/${id}`} className="block cursor-pointer space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-200">
        {/* Show the real thumbnail if available, otherwise a stable placeholder */}
        <img
          src={thumbnail || `https://picsum.photos/seed/${seedFromId(String(id))}/640/360`}
          alt={title}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
        {/* YouTube-style red watch progress bar */}
        {(percent > 0 || completed) && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-400/60">
            <div
              className="h-full bg-red-600"
              style={{ width: `${completed ? 100 : percent}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
          {channel.charAt(0)}
        </div>
        <div>
          <h3 className="line-clamp-2 text-sm font-medium">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{channel}</p>
          <p className="text-sm text-gray-600">
            {views} • {time}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;