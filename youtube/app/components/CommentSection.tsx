"use client";

import { useState, useEffect } from "react";

type Comment = {
  _id: string;
  userName: string;
  text: string;
  createdAt: string;
};

type CommentSectionProps = {
  videoId: string;
};

export default function CommentSection({ videoId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch comments when the component mounts
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/comments/${videoId}`);
        const data = await res.json();
        if (data.success) {
          setComments(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      }
    };
    fetchComments();
  }, [videoId]);

  // Handle new comment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userName: "Guest User", // Baad mein Firebase auth se real user name aayega
          text: newComment,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        // Add the new comment to the top of the list instantly
        setComments([data.data, ...comments]);
        setNewComment(""); // Clear the input box
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">
        {comments.length} Comments
      </h2>

      {/* Comment Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
          G
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full border-b border-gray-300 bg-transparent pb-2 text-sm focus:border-black focus:outline-none transition-colors"
            disabled={isLoading}
          />
          <div className="flex justify-end mt-2 gap-2">
            <button
              type="button"
              onClick={() => setNewComment("")}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newComment.trim() || isLoading}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isLoading ? "Posting..." : "Comment"}
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700">
              {comment.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{comment.userName}</p>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-800">{comment.text}</p>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
  );
}