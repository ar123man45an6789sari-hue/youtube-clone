"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Rewind,
  FastForward,
  PictureInPicture2,
  MonitorPlay,
  Subtitles,
} from "lucide-react";

type NextVideo = {
  id: string;
  title: string;
};

type CustomVideoPlayerProps = {
  videoUrl: string;
  videoId: string;
  thumbnail?: string; // real thumbnail shown as poster before the video plays
  nextVideo?: NextVideo | null; // used for the autoplay countdown
  onTheaterChange?: (on: boolean) => void; // tells the page layout about theater mode
};

// Helper: converts seconds into 1:05 style time
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// All playback speeds we want to support
const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

const CustomVideoPlayer = ({
  videoUrl,
  videoId,
  thumbnail,
  nextVideo,
  onTheaterChange,
}: CustomVideoPlayerProps) => {
  const router = useRouter();

  // refs = direct connection to the real video element and outer box
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<any>(null);

  // simple states for UI
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // index 1 = normal 1x
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theater, setTheater] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [ccOn, setCcOn] = useState(false); // subtitles on/off
  const [quality, setQuality] = useState(""); // e.g. "720p"
  const [countdown, setCountdown] = useState<number | null>(null); // autoplay timer
  const [hoverInfo, setHoverInfo] = useState<{ x: number; time: number } | null>(null);

  /* ---------- basic controls ---------- */

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = video.currentTime + seconds;
  };

  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const changeSpeed = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);
    video.playbackRate = SPEEDS[nextIndex];
  };

  const toggleFullscreen = () => {
    const box = boxRef.current;
    if (!box) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      box.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.log("PiP not supported in this browser", error);
    }
  };

  // turn subtitles (captions) on/off
  const toggleCaptions = () => {
    const video = videoRef.current;
    if (!video || video.textTracks.length === 0) return;
    const track = video.textTracks[0];
    const nextOn = !ccOn;
    track.mode = nextOn ? "showing" : "hidden";
    setCcOn(nextOn);
  };

  // theater mode: player tells the page so the whole layout can go wide
  const toggleTheater = () => {
    setTheater(!theater);
    if (onTheaterChange) onTheaterChange(!theater);
  };

  // go to the next video (used by countdown and N shortcut)
  const playNext = () => {
    if (nextVideo) router.push(`/video/${nextVideo.id}`);
  };

  /* ---------- controls auto hide after 3 seconds ---------- */

  const wakeUpControls = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  /* ---------- keyboard shortcuts ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // do not trigger shortcuts while typing in comment box etc.
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        if (e.shiftKey) seekBy(30);
        else seekBy(10);
      } else if (e.key === "ArrowLeft") {
        if (e.shiftKey) seekBy(-30);
        else seekBy(-10);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        changeVolume(Math.min(1, volume + 0.1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        changeVolume(Math.max(0, volume - 0.1));
      } else if (e.key === "m") {
        toggleMute();
      } else if (e.key === "f") {
        toggleFullscreen();
      } else if (e.key === "t") {
        toggleTheater();
      } else if (e.key === "p") {
        togglePiP();
      } else if (e.key === "c") {
        toggleCaptions();
      } else if (e.key === "n") {
        playNext();
      }
      wakeUpControls();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [volume, theater, speedIndex, ccOn, nextVideo]);

  /* ---------- keep fullscreen state in sync ---------- */

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /* ---------- autoplay countdown: 5..4..3..2..1..0 -> next video ---------- */

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      playNext();
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  /* ---------- video events ---------- */

  // runs once when video info (duration etc.) is ready
  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);

    // show real video quality info (e.g. 720p)
    setQuality(video.videoHeight ? `${video.videoHeight}p` : "Auto");

    // resume from last watched position
    const saved = localStorage.getItem(`progress-${videoId}`);
    if (saved) {
      const savedTime = parseFloat(saved);
      if (savedTime > 5 && savedTime < video.duration - 10) {
        video.currentTime = savedTime;
      }
    }
    setLoading(false);
  };

  // runs many times while video is playing
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // save watch progress every 5 seconds
    if (Math.floor(video.currentTime) % 5 === 0) {
      localStorage.setItem(`progress-${videoId}`, String(video.currentTime));
    }

    // mark video as completed after 90% watched
    if (video.duration && video.currentTime / video.duration > 0.9) {
      localStorage.setItem(`completed-${videoId}`, "true");
    }
  };

  // runs while browser is downloading the video in background
  const onProgress = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    if (video.buffered.length > 0) {
      const end = video.buffered.end(video.buffered.length - 1);
      setBuffered((end / video.duration) * 100);
    }
  };

  // video finished -> start the 5 second autoplay countdown
  const onEnded = () => {
    setPlaying(false);
    setShowControls(true);
    if (nextVideo) setCountdown(5);
  };

  // hover preview: show the time at the cursor position on the timeline
  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverInfo({ x: ratio * rect.width, time: ratio * duration });
  };

  return (
    <div
      ref={boxRef}
      onMouseMove={wakeUpControls}
      className={`relative overflow-hidden rounded-xl bg-black ${
        isFullscreen ? "h-full" : "aspect-video"
      } ${showControls ? "" : "cursor-none"}`}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnail || undefined}
        className="h-full w-full"
        onClick={togglePlay}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onProgress={onProgress}
        onEnded={onEnded}
        onPlay={() => {
          setPlaying(true);
          setCountdown(null); // user manually played -> stop countdown
          wakeUpControls();
        }}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
      >
        {/* demo captions file - CC button controls it */}
        <track src="/subtitles/demo.vtt" kind="subtitles" srcLang="en" label="English" />
      </video>

      {/* loading spinner */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}

      {/* big play button when video is paused */}
      {!playing && !loading && countdown === null && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
            <Play size={28} />
          </div>
        </button>
      )}

      {/* autoplay countdown overlay (after video ends) */}
      {countdown !== null && nextVideo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
          <div className="w-72 rounded-xl bg-gray-900 p-4 text-white shadow-xl">
            <p className="text-xs text-gray-400">Up next in {countdown}s</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">{nextVideo.title}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={playNext}
                className="flex-1 rounded-full bg-red-600 py-1.5 text-sm font-medium hover:bg-red-700"
              >
                Play Now
              </button>
              <button
                onClick={() => setCountdown(null)}
                className="flex-1 rounded-full bg-white/10 py-1.5 text-sm hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* bottom controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* buffered (downloaded) bar */}
        <div className="mb-1 h-1 w-full rounded bg-white/20">
          <div
            className="h-full bg-white/40"
            style={{ width: `${buffered}%` }}
          />
        </div>

        {/* timeline slider (draggable) with hover time preview */}
        <div
          className="relative"
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => setHoverInfo(null)}
        >
          {hoverInfo && (
            <div
              className="pointer-events-none absolute -top-7 rounded bg-black/80 px-2 py-0.5 text-xs text-white"
              style={{ left: hoverInfo.x, transform: "translateX(-50%)" }}
            >
              {formatTime(hoverInfo.time)}
            </div>
          )}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const video = videoRef.current;
              if (!video) return;
              video.currentTime = Number(e.target.value);
              setCurrentTime(Number(e.target.value));
            }}
            className="w-full accent-red-600"
          />
        </div>

        <div className="mt-1 flex items-center gap-2 text-white">
          <button onClick={togglePlay} title="Play/Pause (Space)">
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button onClick={() => seekBy(-10)} title="Back 10s (Left Arrow)">
            <Rewind size={20} />
          </button>

          <button onClick={() => seekBy(10)} title="Forward 10s (Right Arrow)">
            <FastForward size={20} />
          </button>

          <button onClick={toggleMute} title="Mute (M)">
            {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-20 accent-white"
            title="Volume (Up/Down Arrows)"
          />

          <span className="text-xs">
            {formatTime(currentTime)} / {formatTime(duration)} (
            -{formatTime(Math.max(0, duration - currentTime))})
          </span>

          <div className="flex-1" />

          {/* real video quality info */}
          {quality && <span className="text-xs text-white/70">{quality}</span>}

          <button
            onClick={changeSpeed}
            title="Playback speed"
            className="text-xs font-semibold"
          >
            {SPEEDS[speedIndex]}x
          </button>

          <button
            onClick={toggleCaptions}
            title="Subtitles (C)"
            className={ccOn ? "text-red-500" : ""}
          >
            <Subtitles size={20} />
          </button>

          <button onClick={toggleTheater} title="Theater mode (T)">
            <MonitorPlay size={20} />
          </button>

          <button onClick={togglePiP} title="Picture in Picture (P)">
            <PictureInPicture2 size={20} />
          </button>

          <button onClick={toggleFullscreen} title="Fullscreen (F)">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;