import Link from "next/link";

type VideoRowProps = {
  id: number;
  title: string;
  channel: string;
  seed: number;
  subtitle: string;
};

const VideoRow = ({ id, title, channel, seed, subtitle }: VideoRowProps) => {
  return (
    <Link
      href={`/video/${id}`}
      className="flex gap-4 rounded-xl p-2 hover:bg-gray-100"
    >
      <img
        src={`https://picsum.photos/seed/${seed}/320/180`}
        alt={title}
        className="h-24 w-40 shrink-0 rounded-lg object-cover"
      />
      <div>
        <h3 className="line-clamp-2 font-medium">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{channel}</p>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
    </Link>
  );
};

export default VideoRow;