"use client";

import { useState } from "react";
import Link from "next/link";
import VideoCard from "./VideoCard";
import VideoActions from "./VideoActions";
import CommentSection from "./CommentSection";
import CustomVideoPlayer from "./CustomVideoPlayer";
import SubscribeButton from "./SubscribeButton";

// Client side of the video page: handles the theater mode layout switch
const VideoPageClient = ({
  video,
  relatedVideos,
}: {
  video: any;
  relatedVideos: any[];
}) => {
  // theater mode = player goes full width, like real YouTube
  const [theater, setTheater] = useState(false);

  return (
    <main
      className={
        theater
          ? "p-4 sm:p-6"
          : "mx-auto max-w-7xl p-6 lg:grid lg:grid-cols-3 lg:gap-6"
      }
    >
      {/* LEFT: player + info + comments */}
      <div className={theater ? "" : "lg:col-span-2"}>
        <CustomVideoPlayer
          key={video._id}
          videoUrl={video.videoUrl}
          videoId={video._id}
          thumbnail={video.thumbnail}
          onTheaterChange={setTheater}
          nextVideo={
            relatedVideos.length > 0
              ? { id: relatedVideos[0]._id, title: relatedVideos[0].title }
              : null
          }
        />

        <h1 className="mt-4 text-xl font-semibold">{video.title}</h1>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Channel Details (Clickable) */}
          <div className="flex items-center gap-3">
            <Link
              href={`/channel/${video.channel?._id}`}
              className="flex items-center gap-3 hover:opacity-80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-medium text-white">
                {video.channel?.name?.charAt(0) || "C"}
              </div>
              <div>
                <p className="font-medium hover:underline">
                  {video.channel?.name || "Unknown Channel"}
                </p>
                <p className="text-sm text-gray-600">
                  {video.channel?.subscribers?.length || 0} subscribers
                </p>
              </div>
            </Link>
            <SubscribeButton channelId={video.channel?._id || ""} />
          </div>

          <VideoActions
            videoId={video._id}
            initialViews={video.views || 0}
            initialLikes={video.likes?.length || 0}
            initialDislikes={video.dislikes?.length || 0}
          />
        </div>

        <div className="mt-4 rounded-xl bg-gray-100 p-4 text-sm">
          <p className="font-medium">
            {video.views || 0} views •{" "}
            {new Date(video.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-2 text-gray-700">
            {video.description || "No description available for this video."}
          </p>
        </div>

        <CommentSection videoId={video._id} />
      </div>

      {/* RIGHT in normal mode, BELOW in theater mode */}
      <div className="mt-8 lg:mt-0">
        <h2 className="mb-4 text-lg font-semibold">Related Videos</h2>
        <div
          className={
            theater
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-4"
          }
        >
          {relatedVideos.map((v: any) => (
            <VideoCard
              key={v._id}
              id={v._id}
              title={v.title}
              thumbnail={v.thumbnail}
              channel={v.channel?.name || "Unknown"}
              views={`${v.views || 0} views`}
              time={new Date(v.createdAt).toLocaleDateString()}
              seed={Math.floor(Math.random() * 1000)}
            />
          ))}
        </div>
      </div>
    </main>
  );
};

export default VideoPageClient;