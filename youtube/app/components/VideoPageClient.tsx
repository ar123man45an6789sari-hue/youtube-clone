"use client";

import { useEffect, useRef, useState } from "react";
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

    // count one view per real page visit (backend route already exists)
  const viewCountedRef = useRef(false);
  useEffect(() => {
    if (viewCountedRef.current) return;
    viewCountedRef.current = true;
    fetch(`${API}/api/videos/${video._id}/views`, { method: "POST" }).catch(
      () => {}
    );
  }, [video._id]);

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
      // the same browser id we use for trusted devices (device limit check)
      let deviceToken = localStorage.getItem("deviceToken");
      if (!deviceToken) {
        deviceToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("deviceToken", deviceToken);
      }

      const res = await fetch(`${API}/api/downloads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, videoId: video._id, deviceToken }),
      });
      const data = await res.json();
      if (data.success) {
        setQuota({
          remainingToday: data.data.remainingToday,
          limit: data.data.limit,
          plan: data.data.plan,
        });
        // real file download: fetch the video, then save it from memory so an
        // interrupted download can be reported back to the server
        const record = data.data.download;
        try {
          const fileRes = await fetch(record.videoUrl);
          if (!fileRes.ok) throw new Error("file request failed");
          const blob = await fileRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${record.title || "video"}.mp4`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch {
          // mark the record as failed so it does not eat the user's quota
          fetch(`${API}/api/downloads/${record._id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "failed",
              note: "Download interrupted in the browser",
            }),
          }).catch(() => {});
          setDlOk(false);
          setDlMsg("Download was interrupted. It did not use your quota - please retry.");
          return;
        }

        setDlOk(true);
        setDlMsg(
          data.data.duplicate
            ? `Re-download of the same video - your quota was not used again. ${data.data.remainingToday} left today.`
            : `Download finished! ${data.data.remainingToday} downloads left today.`
        );
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

        {/* keyboard shortcut help for desktop users */}
        <details className="mt-4 rounded-xl border p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Keyboard shortcuts &amp; player tips
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-500 sm:grid-cols-2">
            <p>Space / K — play or pause</p>
            <p>← / → (J / L) — seek 10 seconds</p>
            <p>Shift + ← / → — seek 30 seconds</p>
            <p>↑ / ↓ — volume up or down</p>
            <p>M — mute, C — subtitles</p>
            <p>F — full screen, T — theater mode</p>
            <p>P — picture in picture, N — next video</p>
            <p>&lt; / &gt; — slower or faster playback</p>
            <p>Hover the timeline — frame preview</p>
            <p>Controls hide after 3 seconds of no mouse movement</p>
          </div>
        </details>

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