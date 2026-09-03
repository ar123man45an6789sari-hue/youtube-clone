import VideoCard from "../components/VideoCard";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

const SearchPage = async ({ searchParams }: Props) => {
  const { q = "" } = await searchParams;

  let videos: any[] = [];

  if (q) {
    try {
      const res = await fetch(
        `http://localhost:5000/api/videos/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      videos = data.data || [];
    } catch (error) {
      console.error("Error searching videos:", error);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">
        Search results for "{q}"
      </h1>

      {videos.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          No videos found matching your search. Try a different keyword!
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

export default SearchPage;