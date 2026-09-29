import Link from "next/link";
import { API } from "./lib/api";
import VideoCard from "./components/VideoCard";

// category chips row (YouTube style) - each chip opens a search for that topic
const CATEGORIES = [
  "All",
  "Music",
  "Gaming",
  "News",
  "Sports",
  "Movies",
  "Learning",
  "Podcasts",
];

const Home = async () => {
  let videos = [];

  try {
    const res = await fetch(`${API}/api/videos`, {
      cache: "no-store", // Fetch fresh data on every request
    });
    const data = await res.json();
    videos = data.data || [];
  } catch (error) {
    console.error("Error fetching videos:", error);
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      {/* category chips */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={c === "All" ? "/" : `/search?q=${c.toLowerCase()}`}
            className="shrink-0 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            {c}
          </Link>
        ))}
      </div>

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
        <div className="grid w-full grid-cols-1 gap-4 gap-y-8 sm:grid-cols-2 sm:gap-x-4 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video: any) => (
            <VideoCard
              key={video._id}
              id={video._id}
              title={video.title}
              thumbnail={video.thumbnail}
              channel={video.channel?.name || "Unknown Channel"}
              views={`${video.views || 0} views`}
              time={new Date(video.createdAt).toLocaleDateString()}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default Home;