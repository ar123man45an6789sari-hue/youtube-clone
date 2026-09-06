import { notFound } from "next/navigation";
import VideoPageClient from "../../components/VideoPageClient";

type Props = {
  params: Promise<{ id: string }>;
};

const VideoPage = async ({ params }: Props) => {
  const { id } = await params;

  // fetch the current video from backend
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

  // fetch related videos (all videos except the current one)
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

  // UI (with theater mode) lives in a client component
  return <VideoPageClient video={video} relatedVideos={relatedVideos} />;
};

export default VideoPage;