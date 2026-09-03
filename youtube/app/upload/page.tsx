"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CLOUD_NAME = "u6qxscn0";
const UPLOAD_PRESET = "ufmqzvhh";

const uploadToCloudinary = async (
  file: File,
  resourceType: "video" | "image"
) => {
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

const UploadPage = () => {
  const router = useRouter();

  const [channelName, setChannelName] = useState("");
  const [handle, setHandle] = useState("");
  const [channelId, setChannelId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const createChannel = async () => {
    setBusy(true);
    try {
      const usersRes = await fetch("http://localhost:5000/api/users");
      const usersData = await usersRes.json();
      const userId = usersData.data[0]?._id;

      const res = await fetch("http://localhost:5000/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userId, name: channelName, handle }),
      });
      const data = await res.json();
      setChannelId(data.data._id);
      setMessage(`Channel created successfully! ✅ (${data.data.name})`);
    } catch (err: any) {
      setMessage("Channel error: " + err.message);
    }
    setBusy(false);
  };

  const uploadVideo = async () => {
    if (!channelId) return setMessage("Please create a channel first!");
    if (!videoFile) return setMessage("Please select a video file!");

    setBusy(true);
    setMessage(
      "Uploading video to Cloudinary... ⏳ This may take a while depending on your internet speed."
    );
    try {
      const videoUrl = await uploadToCloudinary(videoFile, "video");
      let thumbnail = "";
      if (thumbFile) {
        thumbnail = await uploadToCloudinary(thumbFile, "image");
      }

      const res = await fetch("http://localhost:5000/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          videoUrl,
          thumbnail,
          channel: channelId,
        }),
      });
      await res.json();

      // Success: clear the form and redirect to home,
      // so the same video can never be uploaded twice by mistake
      setMessage("🎉 Video uploaded successfully! Taking you to home...");
      setTitle("");
      setDescription("");
      setVideoFile(null);
      setThumbFile(null);
      setFormKey((k) => k + 1);

      setTimeout(() => router.push("/"), 1500);
      // Note: busy stays true, so buttons remain disabled until redirect
    } catch (err: any) {
      setMessage("Upload error: " + err.message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Upload Studio 🎬</h1>

      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="font-medium">Step 1: Create Channel (one-time only)</h2>
        <input
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          placeholder="Channel name"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          onClick={createChannel}
          disabled={busy}
          className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Create Channel
        </button>
        {channelId && (
          <p className="text-sm text-green-600">Channel ready ✅</p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="font-medium">Step 2: Upload Video</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Video title"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          key={`video-${formKey}`}
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <input
          key={`thumb-${formKey}`}
          type="file"
          accept="image/*"
          onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          onClick={uploadVideo}
          disabled={busy}
          className="rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Uploading..." : "Upload Video"}
        </button>
      </section>

      {message && (
        <p className="rounded-lg bg-gray-100 p-3 text-sm">{message}</p>
      )}
    </main>
  );
};

export default UploadPage;