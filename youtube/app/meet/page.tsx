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
  Lock,
  LockOpen,
  UserMinus,
  ShieldCheck,
  VolumeX,
  RotateCw,
} from "lucide-react";

// format seconds into mm:ss
const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

// one remote person inside the room (the self tile is rendered separately)
type Participant = {
  id: string;
  name: string;
  raised: boolean;
  cohost: boolean;
  stream: MediaStream | null;
};

type ChatMessage = {
  from: string;
  text: string;
  time: number;
};

type Toast = {
  id: number;
  text: string;
};

// internship task asks for group calls up to 4 people, host included
const MAX_PEOPLE = 4;

const MeetContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get("room") || "";

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const peerRef = useRef<Peer | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const connsRef = useRef<Map<string, any>>(new Map());
  const callsRef = useRef<Map<string, any>>(new Map());
  const partsRef = useRef<Participant[]>([]);
  const controlsRef = useRef<any>(null);
  const cameraPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const runRef = useRef(0);
  const myIdRef = useRef("");
  const myNameRef = useRef("");
  const isHostRef = useRef(false);
  const roomIdRef = useRef("");
  const lockedRef = useRef(false);
  const cohostIdRef = useRef("");
  const toastIdRef = useRef(0);

  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("Starting camera...");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [myName, setMyName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [myRaised, setMyRaised] = useState(false);
  const [locked, setLocked] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [setupNonce, setSetupNonce] = useState(0);

  // true once at least one remote stream is attached
  const inCall = participants.some((p) => p.stream !== null);
  const hostPeerId = `yc-clone-${roomId}`;
  const canControl = isHost || isCoHost;

  // small popup that shows for a few seconds and disappears on its own
  const pushToast = (text: string) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const openChat = (value: boolean) => {
    setChatOpen(value);
  };

  // call timer
  useEffect(() => {
    if (!inCall) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [inCall]);

  // keep the chat scrolled to the newest message
  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight });
  }, [messages, chatOpen]);

  // attach remote streams to their video tiles
  useEffect(() => {
    participants.forEach((p) => {
      const el = videoRefs.current[p.id];
      if (el && p.stream && el.srcObject !== p.stream) {
        el.srcObject = p.stream;
      }
    });
  }, [participants]);

  useEffect(() => {
    let cancelled = false;
    const myRun = ++runRef.current;

    // one place saves and renders the participant list
    const setParts = (next: Participant[]) => {
      partsRef.current = next;
      setParticipants(next);
    };

    const upsert = (id: string, patch: Partial<Participant>) => {
      if (id === myIdRef.current) return; // never list myself as remote
      const list = partsRef.current;
      const found = list.find((p) => p.id === id);
      if (found) {
        setParts(list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      } else {
        setParts([
          ...list,
          {
            id,
            name: "Joining...",
            raised: false,
            cohost: false,
            stream: null,
            ...patch,
          },
        ]);
      }
    };

    const sendToAll = (msg: any) => {
      connsRef.current.forEach((conn) => {
        if (conn && conn.open) conn.send(msg);
      });
    };

    // host only: tell everyone who is inside the room right now
    const broadcastPeers = () => {
      sendToAll({
        type: "peers",
        list: [
          { id: myIdRef.current, name: myNameRef.current, cohost: false },
          ...partsRef.current.map((p) => ({
            id: p.id,
            name: p.name,
            cohost: p.cohost,
          })),
        ],
      });
    };

    const dropRefs = (id: string) => {
      const conn = connsRef.current.get(id);
      if (conn) {
        try {
          conn.close();
        } catch {}
        connsRef.current.delete(id);
      }
      const call = callsRef.current.get(id);
      if (call) {
        try {
          call.close();
        } catch {}
        callsRef.current.delete(id);
      }
    };

    const handleLeave = (id: string) => {
      if (id === myIdRef.current) return;
      const gone = partsRef.current.find((p) => p.id === id);
      const known =
        Boolean(gone) ||
        connsRef.current.has(id) ||
        callsRef.current.has(id);
      if (!known) return; // already cleaned up by another event
      dropRefs(id);
      setParts(partsRef.current.filter((p) => p.id !== id));
      if (gone && gone.name !== "Joining...") {
        pushToast(`${gone.name} left the room.`);
      }
      if (isHostRef.current) broadcastPeers();
    };

    const killAll = () => {
      connsRef.current.forEach((conn) => {
        try {
          conn.close();
        } catch {}
      });
      connsRef.current.clear();
      callsRef.current.forEach((call) => {
        try {
          call.close();
        } catch {}
      });
      callsRef.current.clear();
      peerRef.current?.destroy();
      peerRef.current = null;
      myStreamRef.current?.getTracks().forEach((t) => t.stop());
      myStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      cameraPromiseRef.current = null;
    };

    // show a final message, clean up and go home
    const leaveWithMessage = (text: string) => {
      setStatus(text);
      pushToast(text);
      setParts([]);
      killAll();
      setTimeout(() => router.push("/"), 3000);
    };

    // control messages are trusted only from the host or the current co-host
    const isController = (id: string) =>
      id === `yc-clone-${roomIdRef.current}` || id === cohostIdRef.current;

    // attach chat/signal handlers to a data connection (incoming or outgoing)
    const wireConn = (id: string, conn: any) => {
      connsRef.current.set(id, conn);
      conn.on("open", () => {
        conn.send({ type: "hello", name: myNameRef.current });
      });
      conn.on("data", (d: any) => handleData(id, d));
      conn.on("close", () => handleLeave(id));
      conn.on("error", () => handleLeave(id));
    };

    const wireCall = (id: string, call: any) => {
      callsRef.current.set(id, call);
      call.on("stream", (remote: MediaStream) => {
        upsert(id, { stream: remote });
      });
      call.on("close", () => handleLeave(id));
      call.on("error", () => handleLeave(id));
      // if the other tab/device dies, remove their tile everywhere
      const pc = call.peerConnection;
      if (pc) {
        pc.addEventListener("connectionstatechange", () => {
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "closed" ||
            pc.connectionState === "disconnected"
          ) {
            handleLeave(id);
          }
        });
      }
    };

    const openConn = (id: string) => {
      if (id === myIdRef.current || connsRef.current.has(id) || !peerRef.current)
        return;
      wireConn(id, peerRef.current.connect(id));
    };

    const callPeer = (id: string) => {
      if (
        id === myIdRef.current ||
        callsRef.current.has(id) ||
        !peerRef.current ||
        !myStreamRef.current
      )
        return;
      wireCall(id, peerRef.current.call(id, myStreamRef.current));
    };

    // decide who starts a pair connection (lower peer id calls) so two
    // guests never call each other at the same moment
    const discover = (id: string) => {
      if (!id || id === myIdRef.current) return;
      if (connsRef.current.has(id) || callsRef.current.has(id)) return;
      const hostId = `yc-clone-${roomIdRef.current}`;
      if (id === hostId) {
        // guests always start the pair with the host
        openConn(id);
        callPeer(id);
        return;
      }
      // the host stays passive, guests call in
      if (isHostRef.current) return;
      if (myIdRef.current < id) {
        openConn(id);
        callPeer(id);
      }
    };

    const handleData = (from: string, data: any) => {
      if (!data || typeof data !== "object") return;

      if (data.type === "hello") {
        const isNew = !partsRef.current.some((p) => p.id === from);
        upsert(from, { name: data.name });
        if (isNew) pushToast(`${data.name} joined the room.`);
        if (isHostRef.current) broadcastPeers();
        return;
      }

      if (data.type === "peers") {
        // only the host sends the official list
        if (from !== `yc-clone-${roomIdRef.current}`) return;
        const incoming: { id: string; name: string; cohost: boolean }[] = (
          data.list || []
        ).filter((e: any) => e.id !== myIdRef.current);
        const oldList = partsRef.current;
        // close connections of people the host removed
        oldList
          .filter((p) => !incoming.some((e) => e.id === p.id))
          .forEach((p) => dropRefs(p.id));
        const merged = incoming.map((entry) => {
          const old = oldList.find((p) => p.id === entry.id);
          return {
            id: entry.id,
            name: entry.name,
            cohost: entry.cohost,
            raised: old ? old.raised : false,
            stream: old ? old.stream : null,
          };
        });
        setParts(merged);
        incoming.forEach((entry) => discover(entry.id));
        return;
      }

      if (data.type === "chat") {
        setMessages((prev) => [
          ...prev,
          { from: data.name, text: data.text, time: data.time },
        ]);
        // popup for every received message, chat panel open or closed
        const short =
          data.text.length > 40 ? data.text.slice(0, 40) + "..." : data.text;
        pushToast(`Message from ${data.name}: ${short}`);
        return;
      }

      if (data.type === "raise") {
        upsert(from, { raised: Boolean(data.value) });
        pushToast(
          data.value
            ? `${data.name || "Someone"} raised a hand.`
            : `${data.name || "Someone"} lowered their hand.`
        );
        return;
      }

      if (data.type === "mute-all") {
        if (!isController(from)) return;
        const track = myStreamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = !data.value;
        setMuted(Boolean(data.value));
        pushToast(
          data.value
            ? "You were muted by the host/co-host."
            : "You were unmuted by the host/co-host."
        );
        return;
      }

      if (data.type === "removed") {
        if (!isController(from)) return;
        leaveWithMessage("You were removed by the host.");
        return;
      }

      if (data.type === "rejected") {
        leaveWithMessage(data.reason || "You cannot join this room.");
        return;
      }

      if (data.type === "session-ended") {
        leaveWithMessage("Session ended by the host.");
        return;
      }

      if (data.type === "remove-request") {
        // a co-host asks the host to kick someone
        if (isHostRef.current && isController(from) && data.id !== myIdRef.current) {
          removeParticipant(data.id);
        }
        return;
      }

      if (data.type === "cohost") {
        cohostIdRef.current = data.value ? data.id : "";
        upsert(data.id, { cohost: Boolean(data.value) });
        if (data.id === myIdRef.current) {
          setIsCoHost(Boolean(data.value));
          pushToast(
            data.value
              ? "You are now a co-host. You can mute-all and remove users."
              : "Your co-host powers were revoked."
          );
        }
        return;
      }
    };

    const removeParticipant = (id: string) => {
      if (!id || id === myIdRef.current) return;
      const name = partsRef.current.find((p) => p.id === id)?.name;
      const conn = connsRef.current.get(id);
      if (conn && conn.open) conn.send({ type: "removed" });
      dropRefs(id);
      setParts(partsRef.current.filter((p) => p.id !== id));
      pushToast(`${name || "Participant"} was removed from the room.`);
      if (isHostRef.current) broadcastPeers();
    };

    const assignCoHost = (id: string, value: boolean) => {
      if (!id || id === myIdRef.current) return;
      const prev = cohostIdRef.current;
      // only one co-host at a time: revoke the old one first
      if (value && prev && prev !== id) {
        upsert(prev, { cohost: false });
        sendToAll({ type: "cohost", id: prev, value: false });
      }
      cohostIdRef.current = value ? id : "";
      upsert(id, { cohost: value });
      sendToAll({ type: "cohost", id, value });
      const name = partsRef.current.find((p) => p.id === id)?.name;
      pushToast(
        value
          ? `${name || "Participant"} is now a co-host.`
          : `Co-host powers revoked from ${name || "participant"}.`
      );
    };

    // UI buttons outside the effect call these helpers
    controlsRef.current = {
      sendToAll,
      killAll,
      removeParticipant,
      assignCoHost,
      requestRemove: (id: string) => {
        if (id === myIdRef.current) return;
        sendToAll({ type: "remove-request", id });
      },
    };

    const setup = async () => {
      try {
        // ask for the camera only once per page load (dev mode mounts twice)
        if (!cameraPromiseRef.current) {
          // capped resolution and frame rate keep encoding light on weak machines
          cameraPromiseRef.current = navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 24, max: 30 },
            },
            audio: true,
          });
          // if the device never answers, show a retry hint
          setTimeout(() => {
            if (!myStreamRef.current && runRef.current === myRun) {
              setCameraError(
                "Camera is not responding. Close other apps/tabs using the camera, then press Retry."
              );
            }
          }, 10000);
        }
        const stream = await cameraPromiseRef.current;
        if (cancelled) return; // tracks stay owned by the shared promise
        myStreamRef.current = stream;
        setCameraError("");
        cameraTrackRef.current = stream.getVideoTracks()[0];
        if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = stream;
        }

        // fresh session = fresh chat and counters
        setMessages([]);
        setSeconds(0);
        setMyRaised(false);

        const room = roomParam || Math.random().toString(36).slice(2, 8);
        setRoomId(room);
        roomIdRef.current = room;
        const host = !roomParam;
        isHostRef.current = host;
        setIsHost(host);

       // host owns the room id; guests get a random peer id
        const peer = new Peer(
          host
            ? `yc-clone-${room}`
            : `yc-clone-guest-${Math.random().toString(36).slice(2, 10)}`,
          // public STUN + TURN servers help phones on mobile networks connect
          {
            config: {
              iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                {
                  urls: "turn:openrelay.metered.ca:80",
                  username: "openrelayproject",
                  credential: "openrelayproject",
                },
              ],
            },
          }
        );
        peerRef.current = peer;

        peer.on("open", () => {
          myIdRef.current = peer.id;
          const name = host ? "Host" : `Guest-${peer.id.slice(-4)}`;
          myNameRef.current = name;
          setMyName(name);
          if (host) {
            setStatus("Waiting for someone to join... share the room link!");
          } else {
            setStatus("Connecting to room...");
            // guest starts the chat channel and the media call to the host
            openConn(`yc-clone-${room}`);
            callPeer(`yc-clone-${room}`);
          }
        });

        peer.on("connection", (conn) => {
          const id = conn.peer;
          // host gates: locked room or full room (data channel part)
          if (isHostRef.current) {
            const full = partsRef.current.length >= MAX_PEOPLE - 1;
            if (lockedRef.current || full) {
              conn.on("open", () => {
                conn.send({
                  type: "rejected",
                  reason: lockedRef.current
                    ? "Room is locked by the host."
                    : "Room is full (max 4 participants). Try again later.",
                });
                setTimeout(() => {
                  try {
                    conn.close();
                  } catch {}
                }, 500);
              });
              return;
            }
          }
          // IMPORTANT: wire the incoming connection itself, do not open a new one
          wireConn(id, conn);
        });

        peer.on("call", (call) => {
          const id = call.peer;
          // host gates: locked room or full room (media part)
          if (isHostRef.current) {
            const full = partsRef.current.length >= MAX_PEOPLE - 1;
            if (lockedRef.current || full) {
              try {
                call.close();
              } catch {}
              return;
            }
          }
          // ignore duplicate calls from the same peer
          if (callsRef.current.has(id)) {
            try {
              call.close();
            } catch {}
            return;
          }
          call.answer(stream);
          wireCall(id, call);
        });

        peer.on("error", (err: any) => {
          setStatus(
            err.type === "peer-unavailable"
              ? "Room not found. Check the link or create a new room."
              : `Connection error: ${err.type}`
          );
        });
      } catch (error) {
        setCameraError(
          "Camera/microphone permission denied or device busy. Allow access and press Retry."
        );
      }
    };

    setup();

    return () => {
      cancelled = true;
      // release the camera only on a real page leave, not on dev re-mounts
      setTimeout(() => {
        if (runRef.current === myRun) killAll();
      }, 400);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomParam, setupNonce]);

  const retryCamera = () => {
    cameraPromiseRef.current = null;
    setCameraError("");
    setStatus("Starting camera...");
    setSetupNonce((n) => n + 1);
  };

  const copyLink = async () => {
    // window exists only in the browser, so build the link on click
    const shareLink = `${window.location.origin}/meet?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      pushToast("Room link copied to clipboard.");
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

  // screen share replaces the outgoing video track on every active call
  const toggleScreenShare = async () => {
    const calls = Array.from(callsRef.current.values());
    if (calls.length === 0) {
      pushToast("No one is connected yet, nothing to share to.");
      return;
    }
    const senders = calls
      .map((c: any) =>
        c.peerConnection
          ?.getSenders()
          .find((s: any) => s.track?.kind === "video")
      )
      .filter(Boolean);
    if (senders.length === 0) return;

    if (!sharing) {
      try {
        // screen content reads fine at lower fps and saves a lot of CPU
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 15, max: 30 } },
        });
        screenStreamRef.current = screen;
        for (const sender of senders) {
          await sender.replaceTrack(screen.getVideoTracks()[0]);
        }
        if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = screen;
        }
        setSharing(true);
        pushToast("Screen share started.");
        screen.getVideoTracks()[0].onended = () => toggleScreenShare();
      } catch {
        setStatus("Screen share cancelled.");
      }
    } else {
      const camera = cameraTrackRef.current;
      if (camera) {
        for (const sender of senders) {
          await sender.replaceTrack(camera);
        }
      }
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (selfVideoRef.current) {
        selfVideoRef.current.srcObject = myStreamRef.current;
      }
      setSharing(false);
      pushToast("Screen share stopped.");
    }
  };

  const sendToAll = (msg: any) => controlsRef.current?.sendToAll(msg);

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !inCall) return;
    setMessages((prev) => [...prev, { from: "You", text, time: Date.now() }]);
    sendToAll({ type: "chat", name: myName, text, time: Date.now() });
    setChatText("");
  };

  const toggleRaiseHand = () => {
    const next = !myRaised;
    setMyRaised(next);
    sendToAll({ type: "raise", name: myName, value: next });
    pushToast(next ? "You raised your hand." : "You lowered your hand.");
  };

  // one button mutes or unmutes the whole room
  const toggleMuteAll = () => {
    const next = !muted;
    const track = myStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !next;
    setMuted(next);
    sendToAll({ type: "mute-all", value: next });
    const text = next
      ? "You muted everyone in the room."
      : "You unmuted everyone in the room.";
    pushToast(text);
    setStatus(text);
  };

  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    lockedRef.current = next;
    const text = next
      ? "Room locked. New joins will be rejected."
      : "Room unlocked. Anyone with the link can join.";
    setStatus(text);
    pushToast(text);
  };

  const removePeer = (id: string) => {
    if (isHost) controlsRef.current?.removeParticipant(id);
    else controlsRef.current?.requestRemove(id);
  };

  const makeCoHost = (id: string, value: boolean) => {
    controlsRef.current?.assignCoHost(id, value);
  };

  const endCall = () => {
    // host ending the call sends everyone home with a message
    if (isHostRef.current) {
      sendToAll({ type: "session-ended" });
    }
    setTimeout(() => {
      controlsRef.current?.killAll();
      router.push("/");
    }, 300);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      {/* toast popups */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-2 text-sm text-white shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* room bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">Video Meet</p>
          <p className="text-xs text-gray-500">
            Room: {roomId || "..."} • You are {myName || "..."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={14} />
          <span>
            Participants: {participants.length + 1}/{MAX_PEOPLE}
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

      {/* video tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="relative overflow-hidden rounded-2xl bg-black"
          >
            <video
              ref={(el) => {
                videoRefs.current[p.id] = el;
              }}
              autoPlay
              playsInline
              className="aspect-video w-full"
            />
            {!p.stream && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-300">
                Connecting to {p.name}...
              </p>
            )}
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
              {p.name}
              {p.cohost && <ShieldCheck size={12} className="text-green-400" />}
            </span>
            {p.raised && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs text-black">
                <Hand size={12} /> Raised hand
              </span>
            )}
            {canControl && !(isCoHost && p.id === hostPeerId) && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                {isHost && (
                  <button
                    onClick={() => makeCoHost(p.id, !p.cohost)}
                    className="rounded-full bg-gray-700/90 p-2 text-white hover:bg-gray-600"
                    title={
                      p.cohost
                        ? "Revoke co-host powers"
                        : "Give co-host powers (mute-all + remove)"
                    }
                  >
                    <ShieldCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => removePeer(p.id)}
                  className="rounded-full bg-red-600/90 p-2 text-white hover:bg-red-700"
                  title="Remove this user from the room"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* self tile (mirrored only for the camera, never while sharing) */}
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={selfVideoRef}
            autoPlay
            playsInline
            muted
            className={`aspect-video w-full ${sharing ? "" : "-scale-x-100"}`}
          />
          <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            You {myName && `(${myName})`}
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
          {inCall ? formatTime(seconds) : "Not connected"}
        </span>
        <button
          onClick={toggleMute}
          className={`rounded-full p-3 text-white ${
            muted ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Mute / Unmute myself"
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
          onClick={() => openChat(!chatOpen)}
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
            myRaised
              ? "bg-yellow-500 text-black"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Raise hand"
        >
          <Hand size={18} />
        </button>
        {canControl && (
          <button
            onClick={toggleMuteAll}
            className="rounded-full bg-gray-700 p-3 text-white hover:bg-gray-600"
            title={muted ? "Unmute everyone" : "Mute everyone"}
          >
            <VolumeX size={18} />
          </button>
        )}
        {isHost && (
          <button
            onClick={toggleLock}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white ${
              locked ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            title="Lock or unlock the room for new joins"
          >
            {locked ? <Lock size={16} /> : <LockOpen size={16} />}
            {locked ? "Unlock Room" : "Lock Room"}
          </button>
        )}
        <button
          onClick={endCall}
          className="rounded-full bg-red-600 p-3 text-white hover:bg-red-700"
          title={isHost ? "End session for everyone" : "End call"}
        >
          <PhoneOff size={18} />
        </button>
      </div>

      {/* camera problem box with retry */}
      {cameraError && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <span>{cameraError}</span>
          <button
            onClick={retryCamera}
            className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

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
              disabled={!inCall}
              className="flex-1 rounded-full border px-4 py-2 text-sm outline-none disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={!inCall}
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
