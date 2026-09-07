"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

type Comment = {
  _id: string;
  userId?: string;
  userName: string;
  text: string;
  parentId?: string | null;
  likes?: string[];
  dislikes?: string[];
  editedAt?: string | null;
  createdAt: string;
};

type CommentSectionProps = {
  videoId: string;
};

// edit window in minutes (same rule as backend)
const EDIT_LIMIT_MIN = 10;

export default function CommentSection({ videoId }: CommentSectionProps) {
  const { user } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sort, setSort] = useState("newest");
  const [isLoading, setIsLoading] = useState(false);

  // reply box state (kis comment ko reply kar rahe ho)
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // inline edit state
  const [editFor, setEditFor] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // chhoti error message line
  const [message, setMessage] = useState("");

  // fetch comments when video or sorting changes
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/comments/${videoId}?sort=${sort}`
        );
        const data = await res.json();
        if (data.success) {
          setComments(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      }
    };
    fetchComments();
  }, [videoId, sort]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  // post a new top level comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userId: user._id,
          userName: user.name || user.email?.split("@")[0],
          text: newComment,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setComments([data.data, ...comments]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // post a reply under a comment
  const submitReply = async (parentId: string) => {
    if (!replyText.trim() || !user) return;

    try {
      const res = await fetch(`http://localhost:5000/api/comments/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userId: user._id,
          userName: user.name || user.email?.split("@")[0],
          text: replyText,
          parentId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setComments([...comments, data.data]);
        setReplyText("");
        setReplyFor(null);
      }
    } catch (error) {
      console.error("Failed to post reply:", error);
    }
  };

  // like or dislike toggle
  const react = async (commentId: string, type: "like" | "dislike") => {
    if (!user) return showMessage("Please sign in to react to comments");

    try {
      const res = await fetch(
        `http://localhost:5000/api/comments/react/${type}/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setComments(comments.map((c) => (c._id === data.data._id ? data.data : c)));
      } else {
        showMessage(data.message);
      }
    } catch (error) {
      console.error("Reaction failed:", error);
    }
  };

  // save edited text
  const saveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?._id, text: editText }),
      });

      const data = await res.json();
      if (data.success) {
        setComments(comments.map((c) => (c._id === data.data._id ? data.data : c)));
        setEditFor(null);
      } else {
        showMessage(data.message);
      }
    } catch (error) {
      console.error("Edit failed:", error);
    }
  };

  // delete own comment
  const removeComment = async (commentId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?._id }),
      });

      const data = await res.json();
      if (data.success) {
        setComments(comments.filter((c) => c._id !== commentId && c.parentId !== commentId));
      } else {
        showMessage(data.message);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  // edit sirf apna comment, wo bhi 10 minute ke andar
  const canEdit = (c: Comment) =>
    !!user &&
    c.userId === user._id &&
    (Date.now() - new Date(c.createdAt).getTime()) / 60000 <= EDIT_LIMIT_MIN;

  // delete apna comment kabhi bhi
  const canDelete = (c: Comment) => !!user && c.userId === user._id;

  // ek comment row (top comment aur reply dono ke liye)
  const renderComment = (c: Comment, isReply: boolean) => (
    <div key={c._id} className={`flex gap-3 ${isReply ? "ml-12" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700">
        {c.userName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{c.userName}</p>
          <span className="text-xs text-gray-500">
            {new Date(c.createdAt).toLocaleDateString()}
          </span>
          {c.editedAt && <span className="text-xs text-gray-400">(edited)</span>}
        </div>

        {editFor === c._id ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => saveEdit(c._id)}
                className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white"
              >
                Save
              </button>
              <button
                onClick={() => setEditFor(null)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-800">{c.text}</p>
        )}

        {/* action row */}
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
          <button
            onClick={() => react(c._id, "like")}
            className={user && (c.likes || []).includes(user._id || "") ? "font-semibold text-blue-600" : ""}
          >
            👍 {(c.likes || []).length}
          </button>
          <button
            onClick={() => react(c._id, "dislike")}
            className={user && (c.dislikes || []).includes(user._id || "") ? "font-semibold text-red-600" : ""}
          >
            👎 {(c.dislikes || []).length}
          </button>
          {!isReply && (
            <button
              onClick={() => {
                setReplyFor(replyFor === c._id ? null : c._id);
                setReplyText("");
              }}
              className="font-medium"
            >
              Reply
            </button>
          )}
          {canEdit(c) && editFor !== c._id && (
            <button
              onClick={() => {
                setEditFor(c._id);
                setEditText(c.text);
              }}
              className="font-medium"
            >
              Edit
            </button>
          )}
          {canDelete(c) && (
            <button onClick={() => removeComment(c._id)} className="font-medium text-red-600">
              Delete
            </button>
          )}
        </div>

        {/* reply box */}
        {replyFor === c._id && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${c.userName}...`}
              className="flex-1 border-b border-gray-300 bg-transparent pb-1 text-sm focus:border-black focus:outline-none"
            />
            <button
              onClick={() => submitReply(c._id)}
              className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const topComments = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{topComments.length} Comments</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border px-2 py-1 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="mostLiked">Most liked</option>
        </select>
      </div>

      {message && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>
      )}

      {/* real YouTube jaisa: comment karne ke liye login chahiye */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
            {(user.name || user.email || "U").charAt(0).toUpperCase()}
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
            <div className="mt-2 flex justify-end gap-2">
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
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
              >
                {isLoading ? "Posting..." : "Comment"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-8 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
          <Link href="/login" className="font-medium text-red-600 hover:underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {/* comments list with replies */}
      <div className="space-y-6">
        {topComments.map((c) => (
          <div key={c._id} className="space-y-4">
            {renderComment(c, false)}
            {repliesOf(c._id).map((r) => renderComment(r, true))}
          </div>
        ))}

        {topComments.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
  );
}