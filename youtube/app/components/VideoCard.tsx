import Link from "next/link";

type VideoCardProps = {
  id: string | number;
  title: string;
  channel: string;
  views: string;
  time: string;
  seed: number;
  thumbnail?: string; // real thumbnail from database (optional)
};

const VideoCard = ({ id, title, channel, views, time, seed, thumbnail }: VideoCardProps) => {
  return (
    <Link href={`/video/${id}`} className="block cursor-pointer space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-200">
        {/* Show the real thumbnail if available, otherwise a placeholder */}
        <img
          src={thumbnail || `https://picsum.photos/seed/${seed}/640/360`}
          alt={title}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
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