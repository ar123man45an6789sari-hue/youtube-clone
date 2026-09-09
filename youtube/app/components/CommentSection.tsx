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

  // reply box state
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // inline edit state
  const [editFor, setEditFor] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // report state
  const [reportFor, setReportFor] = useState<string | null>(null);

  // translation state (commentId -> translated text)
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [showTrans, setShowTrans] = useState<Record<string, boolean>>({});
  const [prefLang, setPrefLang] = useState("en");

  // anti-spam captcha state (4th post se aage)
  const [postCount, setPostCount] = useState(0);
  const [captchaQ, setCaptchaQ] = useState<string | null>(null);
  const [captchaA, setCaptchaA] = useState(0);
  const [captchaInput, setCaptchaInput] = useState("");

  const [message, setMessage] = useState("");

  // preferred translation language localStorage se
  useEffect(() => {
    const saved = localStorage.getItem("preferredLang");
    if (saved) setPrefLang(saved);
  }, []);

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

  // simple math captcha generator
  const makeCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaQ(`${a} + ${b} = ?`);
    setCaptchaA(a + b);
  };

  // post a new top level comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    if (postCount >= 3) {
      if (!captchaQ) {
        makeCaptcha();
        showMessage("Please solve the captcha to continue posting");
        return;
      }
      if (Number(captchaInput) !== captchaA) {
        showMessage("Wrong captcha answer, try again");
        return;
      }
    }

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
        setPostCount(postCount + 1);
        setCaptchaQ(null);
        setCaptchaInput("");
      } else {
        showMessage(data.message);
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
      } else {
        showMessage(data.message);
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

  // report a comment with a reason
  const submitReport = async (commentId: string, reason: string) => {
    if (!reason) return;

    try {
      const res = await fetch(`http://localhost:5000/api/comments/report/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?._id || "guest", reason }),
      });

      const data = await res.json();
      if (data.success) {
        showMessage("Comment reported. Moderators will review it.");
      }
      setReportFor(null);
    } catch (error) {
      console.error("Report failed:", error);
    }
  };

     const translateComment = async (c: Comment) => {
    const key = `${c._id}:${prefLang}`; 
    if (translated[key]) {
      setShowTrans({ ...showTrans, [key]: !showTrans[key] });
      return;
    }

    try {
      const url =
        `https://translate.googleapis.com/translate_a/single?client=gtx` +
        `&sl=auto&tl=${prefLang}&dt=t&q=${encodeURIComponent(c.text)}`;
      const res = await fetch(url);
      const data = await res.json();
      const text = data[0].map((part: any) => part[0]).join("");
      setTranslated({ ...translated, [key]: text });
      setShowTrans({ ...showTrans, [key]: true });
    } catch (error) {
      console.error("Translation failed:", error);
      showMessage("Translation unavailable right now");
    }
  };

  const canEdit = (c: Comment) =>
    !!user &&
    c.userId === user._id &&
    (Date.now() - new Date(c.createdAt).getTime()) / 60000 <= EDIT_LIMIT_MIN;

  const canDelete = (c: Comment) => !!user && c.userId === user._id;
   // highlight @mentions in comment text
  const renderText = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9_]+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="font-medium text-blue-600">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  
  const renderComment = (c: Comment, isReply: boolean) => (
 
    <div key={c._id} className={`flex gap-3 ${isReply ? "ml-12" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700">
        {c.userName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{c.userName}</p>
         <span className="text-xs text-gray-500">
            {new Date(c.createdAt).toLocaleString()}
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
         <p className="mt-1 text-sm text-gray-800">{renderText(c.text)}</p>
        )}
                 {/* translated text box (current preferred language) */}
        {showTrans[`${c._id}:${prefLang}`] && translated[`${c._id}:${prefLang}`] && (
          <p className="mt-1 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {translated[`${c._id}:${prefLang}`]}{" "}
            <span className="text-xs text-blue-400">(translated)</span>
          </p>
        )}

        {/* action row */}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
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
             <button onClick={() => translateComment(c)} className="font-medium text-blue-600">
            {showTrans[`${c._id}:${prefLang}`] ? "Hide translation" : "Translate"}
          </button>
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
          <button
            onClick={() => setReportFor(reportFor === c._id ? null : c._id)}
            className="font-medium text-gray-500"
          >
            Report
          </button>
          {reportFor === c._id && (
            <select
              defaultValue=""
              onChange={(e) => submitReport(c._id, e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs"
            >
              <option value="" disabled>
                Reason...
              </option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="offensive">Offensive content</option>
            </select>
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{topComments.length} Comments</h2>
        <div className="flex items-center gap-2">
          <select
            value={prefLang}
            onChange={(e) => {
              setPrefLang(e.target.value);
              localStorage.setItem("preferredLang", e.target.value);
            }}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            <option value="en">Translate: English</option>
            <option value="hi">Translate: Hindi</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="mostLiked">Most liked</option>
            <option value="mostRelevant">Most relevant</option>
          </select>
        </div>
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

            {/* captcha box (4th post se aage dikhta hai) */}
            {captchaQ && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm">
                <span className="font-medium">🤖 {captchaQ}</span>
                <input
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-16 rounded border px-2 py-1 text-sm"
                />
              </div>
            )}

            <div className="mt-2 flex justify-end gap-2">
            <button
                type="button"
                onClick={() => {
                  setNewComment("");
                  setCaptchaQ(null);
                  setCaptchaInput("");
                }}
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