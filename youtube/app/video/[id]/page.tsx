import { notFound } from "next/navigation";
import VideoCard from "../../components/VideoCard";
import VideoActions from "../../components/VideoActions";
import CommentSection from "../../components/CommentSection";
import Link from "next/link";
import SubscribeButton from "../../components/SubscribeButton";

type Props = {
  params: Promise<{ id: string }>;
};

const VideoPage = async ({ params }: Props) => {
  const { id } = await params;

  let video;
  try {
    const res = await fetch(`http://localhost:5000/api/videos/${id}`, {
      cache: "no-store",
    });
    const data = await res.json();
    video = data.data;
  } catch (error) {
    console.error("Error fetching video:", error);
  }

  if (!video) {
    notFound();
  }

  let allVideos = [];
  try {
    const res = await fetch("http://localhost:5000/api/videos", {
      cache: "no-store",
    });
    const data = await res.json();
    allVideos = data.data || [];
  } catch (error) {
    console.error("Error fetching related videos:", error);
  }

  const relatedVideos = allVideos.filter((v: any) => v._id !== video._id);

  return (
    <main className="mx-auto max-w-7xl p-6 lg:grid lg:grid-cols-3 lg:gap-6">
      <div className="lg:col-span-2">
        <video controls className="aspect-video w-full rounded-xl bg-black">
          <source src={video.videoUrl} type="video/mp4" />
        </video>

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

      <div className="mt-8 lg:mt-0">
        <h2 className="mb-4 text-lg font-semibold">Related Videos</h2>
        <div className="space-y-4">
          {relatedVideos.map((v: any) => (
            <VideoCard
              key={v._id}
              id={v._id}
              title={v.title}
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

export default VideoPage;