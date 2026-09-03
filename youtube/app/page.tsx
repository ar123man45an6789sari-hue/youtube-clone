import VideoCard from "./components/VideoCard";

const Home = async () => {
  let videos = [];

  try {
    const res = await fetch("http://localhost:5000/api/videos", {
      cache: "no-store", // Fetch fresh data on every request
    });
    const data = await res.json();
    videos = data.data || [];
  } catch (error) {
    console.error("Error fetching videos:", error);
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">YouTube Clone</h1>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-6xl">🎬</div>
          <h2 className="mb-2 text-xl font-medium text-gray-700">
            No videos yet
          </h2>
          <p className="mb-6 text-gray-500">
            Be the first to upload! Go to the upload page to add your first video.
          </p>
          <a
            href="/upload"
            className="rounded-full bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 transition-colors"
          >
            Upload Your First Video
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video: any) => (
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

export default Home;