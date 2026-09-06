"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// IMPORTANT: Put your real Cloudinary values here (from Cloudinary dashboard)
const CLOUD_NAME = "u6qxscn0";
const UPLOAD_PRESET = "ufmqzvhh";
// Upload any file (video or image) directly to Cloudinary
const uploadToCloudinary = async (file: File, resourceType: "video" | "image") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url;
};

// Pretty file picker: shows file name and a cross (X) button to remove it
const CustomFileInput = ({
  label,
  accept,
  file,
  onSelect,
}: {
  label: string;
  accept: string;
  file: File | null;
  onSelect: (f: File | null) => void;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
        {label}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] || null)}
        />
      </label>

      {file ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1 text-sm text-green-700">
          <CheckCircle size={14} />
          <span className="max-w-[200px] truncate">{file.name}</span>
          {/* Cross button: click to remove the selected file */}
          <button onClick={() => onSelect(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      ) : (
        <span className="text-xs text-gray-400">No file selected</span>
      )}
    </div>
  );
};

const UploadPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  // Channel state
  const [channel, setChannel] = useState<any>(null);
  const [checkingChannel, setCheckingChannel] = useState(true);
  const [channelName, setChannelName] = useState("");
  const [handle, setHandle] = useState("");

  // Video form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  // Toast popup (auto-hides after 3 seconds)
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // On page load: check if the logged-in user already has a channel
  useEffect(() => {
    if (!user?._id) {
      setCheckingChannel(false);
      return;
    }

    const checkChannel = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/channels");
        const data = await res.json();
        const myChannel = data.data.find((c: any) => c.user?._id === user._id);
        if (myChannel) setChannel(myChannel);
      } catch (err) {
        console.error("Channel check failed:", err);
      }
      setCheckingChannel(false);
    };

    checkChannel();
  }, [user]);

  // Create a new channel for the logged-in user
  const createChannel = async () => {
    if (!channelName.trim() || !handle.trim()) {
      return showToast("Please fill channel name and handle!", "error");
    }

    setBusy(true);
    try {
      const res = await fetch("http://localhost:5000/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user?._id, name: channelName, handle }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Channel creation failed");
      }

      setChannel(data.data);
      showToast(`Channel "${data.data.name}" created successfully!`);
    } catch (err: any) {
      showToast("Channel error: " + err.message, "error");
    }
    setBusy(false);
  };

  // Only video files are allowed in the video slot
  const handleVideoSelect = (file: File | null) => {
    if (file && !file.type.startsWith("video/")) {
      showToast("Only video files are allowed here!", "error");
      return;
    }
    setVideoFile(file);
  };

  // Only image files are allowed for the thumbnail
  const handleThumbSelect = (file: File | null) => {
    if (file && !file.type.startsWith("image/")) {
      showToast("Only image files are allowed for thumbnail!", "error");
      return;
    }
    setThumbFile(file);
  };

  // Upload flow: Cloudinary -> database -> redirect home
  const uploadVideo = async () => {
    if (!channel) return showToast("Please create a channel first!", "error");
    if (!title.trim()) return showToast("Please enter a video title!", "error");
    if (!videoFile) return showToast("Please select a video file!", "error");

    setBusy(true);
    showToast("Uploading video... Please wait.");
    try {
      // 1. Upload the video file to Cloudinary
      const videoUrl = await uploadToCloudinary(videoFile, "video");

      // 2. Upload the thumbnail too (if selected)
      let thumbnail = "";
      if (thumbFile) {
        thumbnail = await uploadToCloudinary(thumbFile, "image");
      }

      // 3. Save video details in our database
      const res = await fetch("http://localhost:5000/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          videoUrl,
          thumbnail,
          channel: channel._id,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save video");
      }

      showToast("🎉 Video uploaded successfully! Redirecting...");

      // 4. Clear form and go home so the same video cannot be uploaded again by mistake
      setTitle("");
      setDescription("");
      setVideoFile(null);
      setThumbFile(null);
      setTimeout(() => router.push("/"), 1500);
    } catch (err: any) {
      showToast("Upload error: " + err.message, "error");
      setBusy(false);
    }
  };

  // Not logged in -> ask the user to sign in first
  if (!user) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">Upload Studio 🎬</h1>
        <p className="mt-4 text-sm text-gray-600">
          You need an account to upload videos. Please sign in or create a new account first.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-red-600 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Sign Up
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed right-5 top-20 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upload Studio 🎬</h1>
        <span className="text-sm text-gray-500">Hi, {user.name || user.email?.split("@")[0]}</span>
      </div>

      {/* Channel section: auto-hidden if the user already has a channel */}
      <section className="space-y-4 rounded-xl border p-6 shadow-sm">
        {checkingChannel ? (
          <p className="text-sm text-gray-500">Checking your channel...</p>
        ) : channel ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-medium text-white">
              {channel.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{channel.name}</p>
              <p className="text-sm text-gray-600">
                {channel.handle} • Channel ready
              </p>
            </div>
            <CheckCircle className="ml-auto text-green-600" size={20} />
          </div>
        ) : (
          <>
            <h2 className="font-medium text-gray-800">Step 1: Create Channel (One-time)</h2>
            <input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel Name (e.g., Sakhi Tech)"
              className="w-full rounded-lg border px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle (e.g., @sakhitech)"
              className="w-full rounded-lg border px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={createChannel}
              disabled={busy}
              className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create Channel"}
            </button>
          </>
        )}
      </section>

      {/* Video upload section */}
      <section className="space-y-4 rounded-xl border p-6 shadow-sm">
        <h2 className="font-medium text-gray-800">
          {channel ? "Upload Video" : "Step 2: Upload Video"}
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Video Title"
          className="w-full rounded-lg border px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (Optional)"
          rows={3}
          className="w-full rounded-lg border px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="space-y-3 pt-2">
          <CustomFileInput label="Select Video 🎬" accept="video/*" file={videoFile} onSelect={handleVideoSelect} />
          <CustomFileInput label="Select Thumbnail 🖼️" accept="image/*" file={thumbFile} onSelect={handleThumbSelect} />
        </div>

        <button
          onClick={uploadVideo}
          disabled={busy || !channel}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <Upload size={16} />
          {busy ? "Uploading..." : "Upload Video"}
        </button>
      </section>
    </main>
  );
};

export default UploadPage;