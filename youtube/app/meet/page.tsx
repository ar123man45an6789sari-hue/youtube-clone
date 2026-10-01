"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Peer from "peerjs";
import { useAuth } from "../context/AuthContext";
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
  SwitchCamera,
  Circle,
  Square,
  Paperclip,
  Signal,
  Gauge,
  Ban,
} from "lucide-react";

// format seconds into hh:mm:ss / mm:ss
const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
};

// one remote person inside the room (the self tile is rendered separately)
type Participant = {
  id: string;
  name: string;
  raised: boolean;
  cohost: boolean;
  stream: MediaStream | null;
  muted: boolean; // their microphone status
  camOff: boolean; // their camera status
  speaking: boolean;
  quality: "good" | "fair" | "poor" | "...";
  canChat: boolean; // host managed permission
  canShare: boolean;
};

type ChatMessage = {
  from: string;
  text: string;
  time: number;
  file?: { name: string; url: string; size: number };
};

type Toast = {
  id: number;
  text: string;
};

// internship task asks for group calls up to 4 people, host included
const MAX_PEOPLE = 4;

// quick emoji row for the in-call chat
const EMOJIS = ["😀", "😂", "👍", "🙏", "🎉", "❤️", "😮", "👏", "🔥", "✅"];

// files shared over the data channel stay small (2 MB)
const MAX_FILE_MB = 2;

const MeetContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const roomParam = searchParams.get("room") || "";

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const myStateRef = useRef({ muted: false, camOff: false });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const statsRef = useRef<Map<string, { lost: number; received: number }>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [joined, setJoined] = useState(false); // lobby -> call
  const [joinInput, setJoinInput] = useState(roomParam);
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
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [myRaised, setMyRaised] = useState(false);
  const [locked, setLocked] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [setupNonce, setSetupNonce] = useState(0);
  const [wasInCall, setWasInCall] = useState(false);
  const [mySpeaking, setMySpeaking] = useState(false);
  const [myQuality, setMyQuality] = useState<"good" | "fair" | "poor" | "...">("...");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [hasTwoCameras, setHasTwoCameras] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordUrl, setRecordUrl] = useState("");
  const [myCanChat, setMyCanChat] = useState(true);
  const [myCanShare, setMyCanShare] = useState(true);
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

  // a refreshed page remembers the room it was inside (reconnect after refresh)
  useEffect(() => {
    if (roomParam) {
      setJoinInput(roomParam);
      setJoined(true);
      return;
    }
    const last = sessionStorage.getItem("meetRoom");
    if (last) setJoinInput(last);
  }, [roomParam]);

  // remember that we were in a call so the Rejoin button can appear
  useEffect(() => {
    if (inCall) setWasInCall(true);
  }, [inCall]);

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

  // does this device have a front AND a back camera? (mobile switch button)
  useEffect(() => {
    if (!joined) return;
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((list) => {
        const cams = list.filter((d) => d.kind === "videoinput");
        setHasTwoCameras(cams.length > 1);
      })
      .catch(() => {});
  }, [joined]);

  /* ---------- speaking indicator (Web Audio level meter) ---------- */
  useEffect(() => {
    if (!joined) return;
    const makeAnalyser = (key: string, stream: MediaStream | null) => {
      if (!stream || stream.getAudioTracks().length === 0) return;
      if (analysersRef.current.has(key)) return;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analysersRef.current.set(key, analyser);
      } catch {
        // some browsers block audio analysis before a user gesture
      }
    };

    makeAnalyser("me", myStreamRef.current);
    participants.forEach((p) => makeAnalyser(p.id, p.stream));

    const level = (analyser: AnalyserNode) => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return sum / data.length;
    };

    const timer = setInterval(() => {
      const mine = analysersRef.current.get("me");
      if (mine) setMySpeaking(!myStateRef.current.muted && level(mine) > 12);

      let changed = false;
      const next = partsRef.current.map((p) => {
        const a = analysersRef.current.get(p.id);
        if (!a) return p;
        const speaking = !p.muted && level(a) > 12;
        if (speaking !== p.speaking) changed = true;
        return { ...p, speaking };
      });
      if (changed) {
        partsRef.current = next;
        setParticipants(next);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [participants, joined]);

  /* ---------- connection quality + low bandwidth adaptation ---------- */
  useEffect(() => {
    if (!joined) return;
    const timer = setInterval(async () => {
      let worst: "good" | "fair" | "poor" | "..." = "...";
      const updates: Record<string, "good" | "fair" | "poor"> = {};

      for (const [id, call] of callsRef.current.entries()) {
        const pc: RTCPeerConnection | undefined = call.peerConnection;
        if (!pc || typeof pc.getStats !== "function") continue;
        try {
          const stats = await pc.getStats();
          let lost = 0;
          let received = 0;
          let rtt = 0;
          stats.forEach((report: any) => {
            if (report.type === "inbound-rtp" && !report.isRemote) {
              lost += report.packetsLost || 0;
              received += report.packetsReceived || 0;
            }
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              rtt = report.currentRoundTripTime || rtt;
            }
          });

          const prev = statsRef.current.get(id) || { lost: 0, received: 0 };
          const dLost = Math.max(0, lost - prev.lost);
          const dRecv = Math.max(1, received - prev.received);
          statsRef.current.set(id, { lost, received });

          const lossPct = (dLost / (dLost + dRecv)) * 100;
          let q: "good" | "fair" | "poor" = "good";
          if (lossPct > 7 || rtt > 0.6) q = "poor";
          else if (lossPct > 2 || rtt > 0.3) q = "fair";
          updates[id] = q;
          if (worst === "..." || worst === "good") worst = q;
          if (q === "poor") worst = "poor";

          // low bandwidth adaptation: drop the sending bitrate when the
          // link is bad (or when the user turns on data saver by hand)
          const sender = pc
            .getSenders()
            .find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender) {
            const params: any = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            const weak = q === "poor" || lowBandwidth;
            params.encodings[0].maxBitrate = weak ? 150000 : 900000;
            params.encodings[0].scaleResolutionDownBy = weak ? 2 : 1;
            params.degradationPreference = "maintain-framerate";
            sender.setParameters(params).catch(() => {});
          }
        } catch {
          // stats are best effort only
        }
      }

      if (Object.keys(updates).length > 0) {
        const next = partsRef.current.map((p) =>
          updates[p.id] ? { ...p, quality: updates[p.id] } : p
        );
        partsRef.current = next;
        setParticipants(next);
      }
      setMyQuality(lowBandwidth ? "fair" : worst);
    }, 3000);

    return () => clearInterval(timer);
  }, [joined, lowBandwidth]);

  useEffect(() => {
    if (!joined) return;
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
            muted: false,
            camOff: false,
            speaking: false,
            quality: "...",
            canChat: true,
            canShare: true,
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
      analysersRef.current.delete(id);
      statsRef.current.delete(id);
    };

    const handleLeave = (id: string) => {
      if (id === myIdRef.current) return;
      const gone = partsRef.current.find((p) => p.id === id);
      const known =
        Boolean(gone) || connsRef.current.has(id) || callsRef.current.has(id);
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
      analysersRef.current.clear();
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
      sessionStorage.removeItem("meetRoom");
      setTimeout(() => router.push("/"), 3000);
    };

    // control messages are trusted only from the host or the current co-host
    const isController = (id: string) =>
      id === `yc-clone-${roomIdRef.current}` || id === cohostIdRef.current;

    // tell the room my current mic/camera state
    const broadcastState = () => {
      sendToAll({
        type: "state",
        muted: myStateRef.current.muted,
        camOff: myStateRef.current.camOff,
      });
    };

    // attach chat/signal handlers to a data connection (incoming or outgoing)
    const wireConn = (id: string, conn: any) => {
      connsRef.current.set(id, conn);
      conn.on("open", () => {
        conn.send({
          type: "hello",
          name: myNameRef.current,
          muted: myStateRef.current.muted,
          camOff: myStateRef.current.camOff,
        });
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
        upsert(from, {
          name: data.name,
          muted: Boolean(data.muted),
          camOff: Boolean(data.camOff),
        });
        if (isNew) pushToast(`${data.name} joined the room.`);
        if (isHostRef.current) broadcastPeers();
        broadcastState();
        return;
      }

      if (data.type === "state") {
        upsert(from, { muted: Boolean(data.muted), camOff: Boolean(data.camOff) });
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
            muted: old ? old.muted : false,
            camOff: old ? old.camOff : false,
            speaking: false,
            quality: old ? old.quality : ("..." as const),
            canChat: old ? old.canChat : true,
            canShare: old ? old.canShare : true,
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

      if (data.type === "file") {
        // rebuild the shared file as a download link
        try {
          const blob = new Blob([data.buffer], { type: data.mime || "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          setMessages((prev) => [
            ...prev,
            {
              from: data.name,
              text: `sent a file: ${data.fileName}`,
              time: data.time,
              file: { name: data.fileName, url, size: data.size },
            },
          ]);
          pushToast(`${data.name} shared a file: ${data.fileName}`);
        } catch {
          pushToast("A shared file could not be opened.");
        }
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
        myStateRef.current.muted = Boolean(data.value);
        setMuted(Boolean(data.value));
        broadcastState();
        pushToast(
          data.value
            ? "You were muted by the host/co-host."
            : "You were unmuted by the host/co-host."
        );
        return;
      }

      if (data.type === "mute-one") {
        if (!isController(from)) return;
        if (data.id !== myIdRef.current) return;
        const track = myStreamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = false;
        myStateRef.current.muted = true;
        setMuted(true);
        broadcastState();
        pushToast("The host muted your microphone.");
        return;
      }

      if (data.type === "perm") {
        // host managed permissions for chat and screen share
        if (!isController(from)) return;
        if (data.id === myIdRef.current) {
          if (typeof data.chat === "boolean") {
            setMyCanChat(data.chat);
            pushToast(
              data.chat
                ? "The host allowed you to use the chat."
                : "The host turned off chat for you."
            );
          }
          if (typeof data.share === "boolean") {
            setMyCanShare(data.share);
            pushToast(
              data.share
                ? "The host allowed you to share your screen."
                : "The host turned off screen sharing for you."
            );
          }
        } else {
          upsert(data.id, {
            ...(typeof data.chat === "boolean" ? { canChat: data.chat } : {}),
            ...(typeof data.share === "boolean" ? { canShare: data.share } : {}),
          });
        }
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
      broadcastState,
      resetRoom: () => {
        setParts([]);
        setMessages([]);
      },
      removeParticipant,
      assignCoHost,
      muteOne: (id: string) => {
        sendToAll({ type: "mute-one", id });
        upsert(id, { muted: true });
      },
      setPermission: (id: string, patch: { chat?: boolean; share?: boolean }) => {
        sendToAll({ type: "perm", id, ...patch });
        upsert(id, {
          ...(typeof patch.chat === "boolean" ? { canChat: patch.chat } : {}),
          ...(typeof patch.share === "boolean" ? { canShare: patch.share } : {}),
        });
      },
      requestRemove: (id: string) => {
        if (id === myIdRef.current) return;
        sendToAll({ type: "remove-request", id });
      },
    };

    const setup = async () => {
      try {
        // ask for the camera only once per page load (dev mode mounts twice)
        if (!cameraPromiseRef.current) {
          // capped resolution + noise suppression for clean audio
          cameraPromiseRef.current = navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 24, max: 30 },
              facingMode: "user",
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true, // background noise suppression
              autoGainControl: true,
            },
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

        // drop any previous run's peer and connections (rejoin / retry)
        if (peerRef.current) {
          try {
            peerRef.current.destroy();
          } catch {}
          peerRef.current = null;
        }
        connsRef.current.clear();
        callsRef.current.clear();

        const wanted = roomParam || joinInput.trim();
        const room = wanted || Math.random().toString(36).slice(2, 8);
        setRoomId(room);
        roomIdRef.current = room;
        sessionStorage.setItem("meetRoom", room);
        const host = !wanted;
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
          // signed-in name is used so everyone sees real participant names
          const accountName = user?.name || user?.email?.split("@")[0] || "";
          const name = accountName
            ? `${accountName}${host ? " (Host)" : ""}`
            : host
            ? "Host"
            : `Guest-${peer.id.slice(-4)}`;
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
          call.answer(myStreamRef.current || stream);
          wireCall(id, call);
        });

        // signaling dropped (network blip): try to come back automatically
        peer.on("disconnected", () => {
          setStatus("Connection lost. Trying to reconnect...");
          pushToast("Network interrupted - reconnecting...");
          peer.reconnect();
        });

        peer.on("error", (err: any) => {
          setStatus(
            err.type === "peer-unavailable"
              ? "Room not found. Check the link or create a new room."
              : `Connection error: ${err.type}`
          );
        });
      } catch (error: any) {
        const denied =
          error?.name === "NotAllowedError" || error?.name === "SecurityError";
        setCameraError(
          denied
            ? "Microphone/camera permission was denied. Allow access in the browser address bar, then press Retry. You can still use chat only."
            : "Camera/microphone is busy or missing. Close other apps using it and press Retry."
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
  }, [roomParam, setupNonce, joined]);

  // start this room again after the call ended
  const rejoinRoom = () => {
    controlsRef.current?.resetRoom();
    setSeconds(0);
    setWasInCall(false);
    setMyRaised(false);
    setStatus("Starting camera...");
    setSetupNonce((n) => n + 1);
  };

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

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      pushToast(`Room ID ${roomId} copied.`);
    } catch {
      prompt("Room ID:", roomId);
    }
  };

  const toggleMute = () => {
    const stream = myStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    myStateRef.current.muted = !track.enabled;
    setMuted(!track.enabled);
    controlsRef.current?.broadcastState();
  };

  const toggleCam = () => {
    const track = cameraTrackRef.current;
    if (!track) return;
    track.enabled = !track.enabled;
    myStateRef.current.camOff = !track.enabled;
    setCamOff(!track.enabled);
    controlsRef.current?.broadcastState();
  };

  // mobile: swap between the front and the rear camera mid-call
  const switchCamera = async () => {
    const next = facing === "user" ? "environment" : "user";
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next } },
        audio: false,
      });
      const newTrack = fresh.getVideoTracks()[0];
      if (!newTrack) return;

      // send the new camera to everyone already connected
      for (const call of callsRef.current.values()) {
        const sender = call.peerConnection
          ?.getSenders()
          .find((s: any) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newTrack);
      }

      const stream = myStreamRef.current;
      if (stream) {
        const old = stream.getVideoTracks()[0];
        if (old) {
          stream.removeTrack(old);
          old.stop();
        }
        stream.addTrack(newTrack);
        if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
      }
      cameraTrackRef.current = newTrack;
      newTrack.enabled = !myStateRef.current.camOff;
      setFacing(next);
      pushToast(next === "user" ? "Switched to front camera." : "Switched to rear camera.");
    } catch {
      pushToast("This device has no second camera.");
    }
  };

  // screen share replaces the outgoing video track on every active call
  const toggleScreenShare = async () => {
    if (!myCanShare) {
      pushToast("The host has turned off screen sharing for you.");
      return;
    }
    const calls = Array.from(callsRef.current.values());
    if (calls.length === 0) {
      pushToast("No one is connected yet, nothing to share to.");
      return;
    }
    const senders = calls
      .map((c: any) =>
        c.peerConnection?.getSenders().find((s: any) => s.track?.kind === "video")
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

  /* ---------- optional call recording (saved locally) ---------- */
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = myStreamRef.current;
    if (!stream) {
      pushToast("Nothing to record yet.");
      return;
    }
    try {
      // my camera/screen video + every microphone in the room mixed together
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = ctx.createMediaStreamDestination();
      const addAudio = (s: MediaStream | null) => {
        if (!s || s.getAudioTracks().length === 0) return;
        try {
          ctx.createMediaStreamSource(s).connect(destination);
        } catch {}
      };
      addAudio(stream);
      partsRef.current.forEach((p) => addAudio(p.stream));

      const videoTrack =
        screenStreamRef.current?.getVideoTracks()[0] || stream.getVideoTracks()[0];
      const mixed = new MediaStream([
        ...(videoTrack ? [videoTrack] : []),
        ...destination.stream.getAudioTracks(),
      ]);

      chunksRef.current = [];
      const recorder = new MediaRecorder(mixed, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordUrl(url);
        setRecording(false);
        pushToast("Recording ready - download it from the link below.");
        ctx.close().catch(() => {});
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      pushToast("Recording started (saved only on your device).");
    } catch {
      pushToast("Recording is not supported in this browser.");
    }
  };

  const sendToAll = (msg: any) => controlsRef.current?.sendToAll(msg);

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !inCall) return;
    if (!myCanChat) {
      pushToast("The host has turned off chat for you.");
      return;
    }
    setMessages((prev) => [...prev, { from: "You", text, time: Date.now() }]);
    sendToAll({ type: "chat", name: myName, text, time: Date.now() });
    setChatText("");
    setShowEmoji(false);
  };

  // share a small file (image / pdf / notes) through the data channel
  const sendFile = async (file: File) => {
    if (!myCanChat) {
      pushToast("The host has turned off chat for you.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      pushToast(`File too big. Maximum ${MAX_FILE_MB} MB can be shared in chat.`);
      return;
    }
    const buffer = await file.arrayBuffer();
    sendToAll({
      type: "file",
      name: myName,
      fileName: file.name,
      mime: file.type,
      size: file.size,
      buffer,
      time: Date.now(),
    });
    setMessages((prev) => [
      ...prev,
      {
        from: "You",
        text: `sent a file: ${file.name}`,
        time: Date.now(),
        file: { name: file.name, url: URL.createObjectURL(file), size: file.size },
      },
    ]);
    pushToast(`File sent: ${file.name}`);
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
    myStateRef.current.muted = next;
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
    sessionStorage.removeItem("meetRoom");
    setTimeout(() => {
      controlsRef.current?.killAll();
      router.push("/");
    }, 300);
  };

  const qualityColor = (q: string) =>
    q === "good"
      ? "text-green-400"
      : q === "fair"
      ? "text-yellow-400"
      : q === "poor"
      ? "text-red-400"
      : "text-gray-400";

  /* ---------- screen 1: sign in gate (secure meeting authentication) ---------- */
  if (!authLoading && !user) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-10 text-center">
        <h1 className="text-2xl font-semibold">Video Meet</h1>
        <p className="text-sm text-gray-500">
          Meetings are protected. Please sign in with your account to create or
          join a room.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Sign In
        </Link>
      </main>
    );
  }

  /* ---------- screen 2: lobby (new meeting / join with room id) ---------- */
  if (!joined) {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <div className="rounded-2xl border p-6">
          <h1 className="text-2xl font-semibold">Video Meet</h1>
          <p className="mt-1 text-sm text-gray-500">
            Secure one-to-one and group calls (up to {MAX_PEOPLE} people) with
            chat, screen share, raise hand and host controls.
          </p>

          <button
            onClick={() => {
              setJoinInput("");
              setJoined(true);
            }}
            className="mt-5 w-full rounded-full bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
          >
            Start a new meeting
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-300" /> OR
            <span className="h-px flex-1 bg-gray-300" />
          </div>

          <label className="text-sm font-medium">Join with a room ID</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && joinInput.trim()) setJoined(true);
              }}
              placeholder="e.g. 8kd2p1 or paste the full link"
              className="flex-1 rounded-full border px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={() => {
                // a full invite link also works, we pull the room out of it
                const value = joinInput.includes("room=")
                  ? joinInput.split("room=")[1].split("&")[0]
                  : joinInput;
                setJoinInput(value.trim());
                if (value.trim()) setJoined(true);
              }}
              disabled={!joinInput.trim()}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Join
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Signed in as {user?.name || user?.email}. Your name is shown to the
            other participants.
          </p>
        </div>
      </main>
    );
  }

  /* ---------- screen 3: the call ---------- */
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      {/* toast popups */}
      <div className="pointer-events-none fixed right-2 top-2 z-50 flex w-64 flex-col gap-2 sm:right-4 sm:top-4 sm:w-72">
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
            Room: <button onClick={copyRoomId} className="underline">{roomId || "..."}</button>{" "}
            • You are {myName || "..."} {isHost && "• Host"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users size={14} /> {participants.length + 1}/{MAX_PEOPLE}
          </span>
          <span className={`flex items-center gap-1 ${qualityColor(myQuality)}`}>
            <Signal size={14} /> {myQuality}
          </span>
          <span className="font-medium">
            {inCall ? formatTime(seconds) : "00:00"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeopleOpen(!peopleOpen)}
            className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium"
          >
            <Users size={14} /> People
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Link2 size={14} />
            {copied ? "Link Copied!" : "Copy Room Link"}
          </button>
        </div>
      </div>

      {/* participant list panel */}
      {peopleOpen && (
        <div className="space-y-2 rounded-2xl border p-4">
          <p className="text-sm font-semibold">
            Participants ({participants.length + 1})
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-500/10 px-3 py-2 text-sm">
            <span>
              {myName} (you) {isHost && "• Host"} {isCoHost && "• Co-host"}
            </span>
            <span className="flex items-center gap-2 text-xs">
              {muted ? <MicOff size={14} className="text-red-500" /> : <Mic size={14} />}
              {camOff ? <VideoOff size={14} className="text-red-500" /> : <Video size={14} />}
              <span className={qualityColor(myQuality)}>{myQuality}</span>
            </span>
          </div>
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-500/10 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {p.speaking && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                )}
                {p.name} {p.cohost && "• Co-host"}
              </span>
              <span className="flex items-center gap-2 text-xs">
                {p.muted ? (
                  <MicOff size={14} className="text-red-500" />
                ) : (
                  <Mic size={14} />
                )}
                {p.camOff ? (
                  <VideoOff size={14} className="text-red-500" />
                ) : (
                  <Video size={14} />
                )}
                <span className={qualityColor(p.quality)}>{p.quality}</span>
                {canControl && (
                  <>
                    <button
                      onClick={() => controlsRef.current?.muteOne(p.id)}
                      className="rounded-full border px-2 py-0.5"
                      title="Mute this participant"
                    >
                      Mute
                    </button>
                    <button
                      onClick={() =>
                        controlsRef.current?.setPermission(p.id, { chat: !p.canChat })
                      }
                      className="rounded-full border px-2 py-0.5"
                      title="Allow or block chat for this participant"
                    >
                      {p.canChat ? "Chat ✓" : "Chat ✕"}
                    </button>
                    <button
                      onClick={() =>
                        controlsRef.current?.setPermission(p.id, { share: !p.canShare })
                      }
                      className="rounded-full border px-2 py-0.5"
                      title="Allow or block screen sharing"
                    >
                      {p.canShare ? "Share ✓" : "Share ✕"}
                    </button>
                    {isHost && (
                      <button
                        onClick={() => makeCoHost(p.id, !p.cohost)}
                        className="rounded-full border px-2 py-0.5"
                      >
                        {p.cohost ? "Remove co-host" : "Make co-host"}
                      </button>
                    )}
                    <button
                      onClick={() => removePeer(p.id)}
                      className="rounded-full border border-red-400 px-2 py-0.5 text-red-500"
                    >
                      Remove
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* video tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className={`relative overflow-hidden rounded-2xl bg-black ${
              p.speaking ? "ring-4 ring-green-500" : ""
            }`}
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
            {p.camOff && p.stream && (
              <p className="absolute inset-0 flex items-center justify-center bg-gray-900 text-sm text-gray-300">
                {p.name}&apos;s camera is off
              </p>
            )}
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
              {p.name}
              {p.cohost && <ShieldCheck size={12} className="text-green-400" />}
              {p.muted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} />}
              {p.camOff && <VideoOff size={12} className="text-red-400" />}
              <Signal size={12} className={qualityColor(p.quality)} />
              {!p.canChat && <Ban size={12} className="text-orange-400" />}
            </span>
            {p.raised && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs text-black">
                <Hand size={12} /> Raised hand
              </span>
            )}
            {canControl && !(isCoHost && p.id === hostPeerId) && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => controlsRef.current?.muteOne(p.id)}
                  className="rounded-full bg-gray-700/90 p-2 text-white hover:bg-gray-600"
                  title="Mute this participant"
                >
                  <MicOff size={14} />
                </button>
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

        {/* self tile (mirrored only for the front camera, never while sharing) */}
        <div
          className={`relative overflow-hidden rounded-2xl bg-black ${
            mySpeaking ? "ring-4 ring-green-500" : ""
          }`}
        >
          <video
            ref={selfVideoRef}
            autoPlay
            playsInline
            muted
            className={`aspect-video w-full ${
              sharing || facing === "environment" ? "" : "-scale-x-100"
            }`}
          />
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
            You {myName && `(${myName})`}
            {muted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} />}
            {camOff && <VideoOff size={12} className="text-red-400" />}
          </span>
          {recording && (
            <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs text-white">
              <Circle size={10} className="animate-pulse" fill="currentColor" /> REC
            </span>
          )}
          {myRaised && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs text-black">
              <Hand size={12} /> Raised hand
            </span>
          )}
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border p-3 sm:gap-3 sm:p-4">
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
        {hasTwoCameras && (
          <button
            onClick={switchCamera}
            className="rounded-full bg-gray-700 p-3 text-white hover:bg-gray-600"
            title="Switch front / rear camera"
          >
            <SwitchCamera size={18} />
          </button>
        )}
        <button
          onClick={toggleScreenShare}
          className={`rounded-full p-3 text-white ${
            sharing ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
          } ${myCanShare ? "" : "opacity-50"}`}
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
            myRaised ? "bg-yellow-500 text-black" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Raise hand"
        >
          <Hand size={18} />
        </button>
        <button
          onClick={() => {
            setLowBandwidth(!lowBandwidth);
            pushToast(
              !lowBandwidth
                ? "Data saver on - video sent in low quality."
                : "Data saver off - normal quality."
            );
          }}
          className={`rounded-full p-3 text-white ${
            lowBandwidth ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Low bandwidth / data saver mode"
        >
          <Gauge size={18} />
        </button>
        <button
          onClick={toggleRecording}
          className={`rounded-full p-3 text-white ${
            recording ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          title="Record this call (saved on your device)"
        >
          {recording ? <Square size={18} /> : <Circle size={18} />}
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
        {wasInCall && !inCall && (
          <button
            onClick={rejoinRoom}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            title="Rejoin this room"
          >
            <RotateCw size={16} /> Rejoin Room
          </button>
        )}
        <button
          onClick={endCall}
          className="rounded-full bg-red-600 p-3 text-white hover:bg-red-700"
          title={isHost ? "End session for everyone" : "Leave call"}
        >
          <PhoneOff size={18} />
        </button>
      </div>

      {/* recording download link */}
      {recordUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm">
          <span>Your recording is ready (stored only on this device):</span>
          <a
            href={recordUrl}
            download={`meet-${roomId}.webm`}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Download recording
          </a>
        </div>
      )}

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
          <div ref={chatBoxRef} className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {messages.length === 0 && (
              <p className="text-xs text-gray-500">No messages yet. Say hello!</p>
            )}
            {messages.map((m, i) => (
              <p key={i}>
                <span className="font-medium">{m.from}: </span>
                {m.file ? (
                  <a
                    href={m.file.url}
                    download={m.file.name}
                    className="text-blue-600 underline"
                  >
                    📎 {m.file.name} ({Math.round(m.file.size / 1024)} KB)
                  </a>
                ) : (
                  m.text
                )}
                <span className="ml-1 text-[10px] text-gray-400">
                  {new Date(m.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            ))}
          </div>

          {showEmoji && (
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setChatText((t) => t + e)}
                  className="rounded border px-2 py-1 text-lg"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="rounded-full border px-3 py-2 text-sm"
              title="Emojis"
            >
              😀
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!inCall}
              className="rounded-full border px-3 py-2 text-sm disabled:opacity-50"
              title={`Share a file (max ${MAX_FILE_MB} MB)`}
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) sendFile(f);
                e.target.value = "";
              }}
            />
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={myCanChat ? "Type a message..." : "Chat disabled by host"}
              disabled={!inCall || !myCanChat}
              className="min-w-[8rem] flex-1 rounded-full border px-4 py-2 text-sm outline-none disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={!inCall || !myCanChat}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-500">{status}</p>
      <p className="text-center text-[11px] text-gray-400">
        🔒 Media is sent peer-to-peer and encrypted end-to-end by WebRTC
        (DTLS-SRTP). Only signed-in users can join, the host can lock the room,
        and a room holds a maximum of {MAX_PEOPLE} participants.
      </p>
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
