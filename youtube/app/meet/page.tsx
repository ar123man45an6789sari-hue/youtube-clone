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
  MessageSquare,
  Hand,
  Users,
} from "lucide-react";

// format seconds into mm:ss
const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

// one chat message stored in the list
type ChatMessage = {
  from: string;
  text: string;
  time: number;
};

const MeetContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get("room") || "";

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("Starting camera...");
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [myRaised, setMyRaised] = useState(false);
  const [remoteRaised, setRemoteRaised] = useState(false);

  // display names inside the room
  const myName = isHost ? "Host" : "Guest";
  const remoteName = isHost ? "Guest" : "Host";

  // call timer
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  // keep the chat scrolled to the newest message
  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight });
  }, [messages, chatOpen]);

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
        const host = !roomParam;
        setIsHost(host);

        // host owns the room id; guests get a random peer id
        const peer = new Peer(
          host
            ? `yc-clone-${room}`
            : `yc-clone-guest-${Math.random().toString(36).slice(2, 10)}`
        );
        peerRef.current = peer;

        // one data connection carries chat and raise-hand signals
        const handleData = (data: any) => {
          if (!data || typeof data !== "object") return;
          if (data.type === "chat") {
            setMessages((prev) => [
              ...prev,
              { from: data.from, text: data.text, time: data.time },
            ]);
          }
          if (data.type === "raise") {
            setRemoteRaised(Boolean(data.value));
          }
        };

        // attach the shared handlers to a data connection
        const wireConn = (conn: any) => {
          connRef.current = conn;
          conn.on("data", handleData);
          conn.on("close", () => {
            connRef.current = null;
          });
        };

        peer.on("open", () => {
          if (host) {
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
            // guest opens the chat channel towards the host
            wireConn(peer.connect(`yc-clone-${room}`));
          }
        });

        // host accepts the chat channel opened by the guest
        peer.on("connection", (conn) => {
          wireConn(conn);
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
      connRef.current?.close();
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

  // send one json message over the data connection when it is open
  const sendData = (msg: any) => {
    const conn = connRef.current;
    if (conn && conn.open) conn.send(msg);
  };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !connected) return;
    setMessages((prev) => [...prev, { from: "You", text, time: Date.now() }]);
    sendData({ type: "chat", from: myName, text, time: Date.now() });
    setChatText("");
  };

  const toggleRaiseHand = () => {
    const next = !myRaised;
    setMyRaised(next);
    sendData({ type: "raise", from: myName, value: next });
  };

  const endCall = () => {
    connRef.current?.close();
    callRef.current?.close();
    peerRef.current?.destroy();
    router.push("/");
  };

  // participant list for the 1-to-1 call (group support comes later)
  const participants = [
    { name: `You (${myName})`, raised: myRaised },
    ...(connected ? [{ name: remoteName, raised: remoteRaised }] : []),
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      {/* room bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">Video Meet</p>
          <p className="text-xs text-gray-500">Room: {roomId || "..."}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={14} />
          <span>
            {participants
              .map((p) => p.name + (p.raised ? " (hand raised)" : ""))
              .join(", ")}
          </span>
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
            {connected ? remoteName : "Waiting..."}
          </span>
          {connected && remoteRaised && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs text-black">
              <Hand size={12} /> Raised hand
            </span>
          )}
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
          {myRaised && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs text-black">
              <Hand size={12} /> Raised hand
            </span>
          )}
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
          onClick={() => setChatOpen(!chatOpen)}
          className={`rounded-full p-3 text-white ${
            chatOpen ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Toggle chat"
        >
          <MessageSquare size={18} />
        </button>
        <button
          onClick={toggleRaiseHand}
          className={`rounded-full p-3 text-white ${
            myRaised ? "bg-yellow-500 text-black" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Raise hand"
        >
          <Hand size={18} />
        </button>
        <button
          onClick={endCall}
          className="rounded-full bg-red-600 p-3 text-white hover:bg-red-700"
          title="End call"
        >
          <PhoneOff size={18} />
        </button>
      </div>

      {/* chat panel */}
      {chatOpen && (
        <div className="space-y-2 rounded-2xl border p-4">
          <div
            ref={chatBoxRef}
            className="max-h-48 space-y-1 overflow-y-auto text-sm"
          >
            {messages.length === 0 && (
              <p className="text-xs text-gray-500">No messages yet. Say hello!</p>
            )}
            {messages.map((m, i) => (
              <p key={i}>
                <span className="font-medium">{m.from}: </span>
                {m.text}
                <span className="ml-1 text-[10px] text-gray-400">
                  {new Date(m.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message..."
              disabled={!connected}
              className="flex-1 rounded-full border px-4 py-2 text-sm outline-none disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={!connected}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

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