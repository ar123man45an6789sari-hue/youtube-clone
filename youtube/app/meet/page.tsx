"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Peer from "peerjs";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorDown,
  PhoneOff,
  Link2,
} from "lucide-react";

// format seconds into mm:ss
const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

const MeetContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get("room") || "";

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<any>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("Starting camera...");
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // call timer
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        myStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0];
        if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = stream;
        }

        const room = roomParam || Math.random().toString(36).slice(2, 8);
        setRoomId(room);
        const isHost = !roomParam;

        // host owns the room id; guests get a random peer id
        const peer = new Peer(
          isHost
            ? `yc-clone-${room}`
            : `yc-clone-guest-${Math.random().toString(36).slice(2, 10)}`
        );
        peerRef.current = peer;

        peer.on("open", () => {
          if (isHost) {
            setStatus("Waiting for someone to join... share the room link!");
          } else {
            setStatus("Connecting to room...");
            const call = peer.call(`yc-clone-${room}`, stream);
            callRef.current = call;
            call.on("stream", (remote: MediaStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remote;
              }
              setConnected(true);
              setStatus("Connected");
            });
            call.on("close", () => {
              setConnected(false);
              setStatus("Call ended by the host.");
            });
          }
        });

        peer.on("call", (call) => {
          call.answer(stream);
          callRef.current = call;
          call.on("stream", (remote: MediaStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remote;
            }
            setConnected(true);
            setStatus("Connected");
          });
          call.on("close", () => {
            setConnected(false);
            setStatus("Call ended.");
          });
        });

        peer.on("error", (err: any) => {
          setStatus(
            err.type === "peer-unavailable"
              ? "Room not found. Check the link or create a new room."
              : `Connection error: ${err.type}`
          );
        });
      } catch (error) {
        setStatus("Camera/microphone permission denied. Allow access and reload.");
      }
    };

    setup();

    return () => {
      cancelled = true;
      callRef.current?.close();
      peerRef.current?.destroy();
      myStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomParam]);

    const copyLink = async () => {
    // window exists only in the browser, so build the link on click
    const shareLink = `${window.location.origin}/meet?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this room link:", shareLink);
    }
  };

  const toggleMute = () => {
    const stream = myStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const toggleCam = () => {
    const track = cameraTrackRef.current;
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOff(!track.enabled);
  };

  const toggleScreenShare = async () => {
    const call = callRef.current;
    if (!call) return;
    const sender = call.peerConnection
      ?.getSenders()
      .find((s: any) => s.track?.kind === "video");
    if (!sender) return;

    if (!sharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screen;
        await sender.replaceTrack(screen.getVideoTracks()[0]);
        if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = screen;
        }
        setSharing(true);
        screen.getVideoTracks()[0].onended = () => toggleScreenShare();
      } catch {
        setStatus("Screen share cancelled.");
      }
    } else {
      const camera = cameraTrackRef.current;
      if (camera) await sender.replaceTrack(camera);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (selfVideoRef.current) {
        selfVideoRef.current.srcObject = myStreamRef.current;
      }
      setSharing(false);
    }
  };

  const endCall = () => {
    callRef.current?.close();
    peerRef.current?.destroy();
    router.push("/");
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      {/* room bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">Video Meet</p>
          <p className="text-xs text-gray-500">Room: {roomId || "..."}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Link2 size={14} />
          {copied ? "Link Copied!" : "Copy Room Link"}
        </button>
      </div>

      {/* videos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="aspect-video w-full"
          />
          {!connected && (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-300">
              {status}
            </p>
          )}
          <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            {connected ? "Guest" : "Waiting..."}
          </span>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={selfVideoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full -scale-x-100"
          />
          <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            You
          </span>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border p-4">
        <span className="text-sm font-medium">
          {connected ? formatTime(seconds) : "Not connected"}
        </span>
        <button
          onClick={toggleMute}
          className={`rounded-full p-3 text-white ${
            muted ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Mute / Unmute"
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={toggleCam}
          className={`rounded-full p-3 text-white ${
            camOff ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Camera on / off"
        >
          {camOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`rounded-full p-3 text-white ${
            sharing ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Share screen"
        >
          {sharing ? <MonitorDown size={18} /> : <MonitorUp size={18} />}
        </button>
        <button
          onClick={endCall}
          className="rounded-full bg-red-600 p-3 text-white hover:bg-red-700"
          title="End call"
        >
          <PhoneOff size={18} />
        </button>
      </div>

      <p className="text-center text-xs text-gray-500">{status}</p>
    </main>
  );
};

// useSearchParams needs a Suspense boundary during static build
export default function MeetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
          Loading meet...
        </div>
      }
    >
      <MeetContent />
    </Suspense>
  );
}