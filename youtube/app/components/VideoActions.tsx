"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown } from "lucide-react";

// Small localStorage helpers (no extra files needed)
const getIds = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const addId = (key: string, id: string) => {
  const ids = getIds(key).filter((x) => x !== id);
  ids.unshift(id);
  localStorage.setItem(key, JSON.stringify(ids));
};

const removeId = (key: string, id: string) => {
  localStorage.setItem(
    key,
    JSON.stringify(getIds(key).filter((x) => x !== id))
  );
};

type VideoActionsProps = {
  videoId: string;
  initialViews: number;
  initialLikes: number;
  initialDislikes: number;
};

const VideoActions = ({
  videoId,
  initialLikes,
  initialDislikes,
}: VideoActionsProps) => {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [saved, setSaved] = useState(false);

  // On load: count a view, record history, restore button states
  useEffect(() => {
    const trackVisit = async () => {
      try {
        await fetch(`http://localhost:5000/api/videos/${videoId}/views`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error incrementing views:", error);
      }
      addId("history", videoId);
    };

    trackVisit();
    setUserLiked(getIds("likedVideos").includes(videoId));
    setUserDisliked(getIds("dislikedVideos").includes(videoId));
    setSaved(getIds("watchLater").includes(videoId));
  }, [videoId]);

  const handleLike = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/videos/${videoId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local-user" }),
      });
      const data = await res.json();
      setLikes(data.likes);
      setDislikes(data.dislikes);

      if (userLiked) {
        removeId("likedVideos", videoId);
        setUserLiked(false);
      } else {
        addId("likedVideos", videoId);
        removeId("dislikedVideos", videoId);
        setUserLiked(true);
        setUserDisliked(false);
      }
    } catch (error) {
      console.error("Error liking video:", error);
    }
  };

  const handleDislike = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/videos/${videoId}/dislike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local-user" }),
      });
      const data = await res.json();
      setLikes(data.likes);
      setDislikes(data.dislikes);

      if (userDisliked) {
        removeId("dislikedVideos", videoId);
        setUserDisliked(false);
      } else {
        addId("dislikedVideos", videoId);
        removeId("likedVideos", videoId);
        setUserDisliked(true);
        setUserLiked(false);
      }
    } catch (error) {
      console.error("Error disliking video:", error);
    }
  };

  const handleSave = () => {
    if (saved) {
      removeId("watchLater", videoId);
      setSaved(false);
    } else {
      addId("watchLater", videoId);
      setSaved(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLike}
        className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium ${
          userLiked ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        <ThumbsUp size={16} /> {likes}
      </button>
      <button
        onClick={handleDislike}
        className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium ${
          userDisliked ? "bg-gray-800 text-white" : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        <ThumbsDown size={16} /> {dislikes}
      </button>
      <button
        onClick={handleSave}
        className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium ${
          saved ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
};

export default VideoActions;