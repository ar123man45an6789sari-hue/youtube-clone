"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API } from "../lib/api";
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
    const { user } = useAuth();
  const [quota, setQuota] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlMsg, setDlMsg] = useState("");
  const [dlOk, setDlOk] = useState(true);

  // load today's download quota for the logged-in user
  useEffect(() => {
    if (!user?._id) return;
    const loadQuota = async () => {
      try {
        const res = await fetch(`${API}/api/downloads/user/${user._id}`);
        const data = await res.json();
        if (data.success) setQuota(data.data);
      } catch (error) {
        console.error("Failed to load download quota:", error);
      }
    };
    loadQuota();
  }, [user]);

  // download flow: backend checks quota, then the file download starts
  const handleDownload = async () => {
    if (!user) {
      setDlOk(false);
      setDlMsg("Please sign in to download videos.");
      return;
    }
    setDownloading(true);
    setDlMsg("");
    try {
      const res = await fetch(`${API}/api/downloads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, videoId: video._id }),
      });
      const data = await res.json();
      if (data.success) {
        setQuota({
          remainingToday: data.data.remainingToday,
          limit: data.data.limit,
          plan: data.data.plan,
        });
        const a = document.createElement("a");
        a.href = data.data.download.videoUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = data.data.download.title || "video";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDlOk(true);
        setDlMsg(`Download started! ${data.data.remainingToday} downloads left today.`);
      } else {
        setDlOk(false);
        setDlMsg(data.message || "Download failed.");
      }
    } catch (error) {
      console.error("Download failed:", error);
      setDlOk(false);
      setDlMsg("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

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

               {/* download section with plan-based quota (Task 2) */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? "Starting..." : "Download"}
          </button>
          {quota && (
            <span className="text-xs text-gray-600">
              {quota.plan} plan • {quota.remainingToday} of {quota.limit} downloads
              left today
            </span>
          )}
          {dlMsg && (
            <span className={`text-xs ${dlOk ? "text-green-700" : "text-red-600"}`}>
              {dlMsg}
            </span>
          )}
          <Link
            href="/downloads"
            className="ml-auto text-xs font-medium text-blue-600 hover:underline"
          >
            My Downloads
          </Link>
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
            />
          ))}
        </div>
      </div>
    </main>
  );
};

export default VideoPageClient;