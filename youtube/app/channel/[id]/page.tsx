import VideoCard from "../../components/VideoCard";

type Props = {
  params: Promise<{ id: string }>;
};

const ChannelPage = async ({ params }: Props) => {
  const { id } = await params;

  let videos: any[] = [];

  try {
    const res = await fetch(`http://localhost:5000/api/videos/channel/${id}`, {
      cache: "no-store",
    });
    const data = await res.json();
    videos = data.data || [];
  } catch (error) {
    console.error("Error fetching channel videos:", error);
  }

  const channelName = videos[0]?.channel?.name || "This Channel";

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex items-center gap-4 border-b pb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-600 text-3xl font-bold text-white">
          {channelName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{channelName}</h1>
          <p className="text-gray-600">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </p>
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          This channel has not uploaded any videos yet.
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

export default ChannelPage;