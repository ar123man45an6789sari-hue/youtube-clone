"use client";
import { API } from "../lib/api";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, Mic, Video, Bell, Sun, Moon, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

type NavbarProps = {
  onMenuClick: () => void;
};

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { theme, applyTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const recognitionRef = useRef<any>(null);
  const cancelledRef = useRef(false);

  // manual theme switch (auto mode turns off in profile)
  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
    if (user?._id) {
      fetch(`${API}/api/users/${user._id}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next, themeAuto: false }),
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true; // show words while you are speaking
    recognition.continuous = false; // Chrome stops by itself when you go silent
    recognitionRef.current = recognition;
    cancelledRef.current = false;
    setHeard("");
    setVoiceNote("Listening... speak now.");
    setListening(true);

    let liveText = "";
    let finalText = "";

    recognition.onresult = (event: any) => {
      liveText = "";
      for (let i = 0; i < event.results.length; i++) {
        liveText += event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText = liveText;
      }
      // live transcript so you can see what the mic understood
      setHeard(liveText);
      setVoiceNote("Tap Stop & Search when you are done speaking.");
    };

    recognition.onerror = (event: any) => {
      setVoiceNote(
        event.error === "no-speech"
          ? "Didn't catch that. Try again."
          : `Microphone error: ${event.error}`
      );
    };

    // runs when the mic switches off (silence auto-stop or manual stop)
    recognition.onend = () => {
      if (cancelledRef.current) {
        setListening(false);
        return;
      }
      const text = (finalText || liveText).trim();
      if (text) {
        setListening(false);
        setQuery(text);
        router.push(`/search?q=${encodeURIComponent(text)}`);
      } else {
        setHeard("");
        setVoiceNote("Didn't catch that. Try again.");
        setTimeout(() => {
          setListening(false);
          setVoiceNote("");
        }, 1400);
      }
    };

    recognition.start();
  };

  const stopVoiceSearch = () => {
    // stop() triggers onend, which runs the search with what was heard
    recognitionRef.current?.stop();
  };

  const cancelVoiceSearch = () => {
    cancelledRef.current = true;
    recognitionRef.current?.abort();
    setListening(false);
    setHeard("");
    setVoiceNote("");
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-y-2 px-2 py-2 sm:px-4">
          {/* left: hamburger + logo */}
          <div className="order-1 flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <Menu />
            </Button>
            <Link href="/" className="flex items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
                <span className="text-xs text-white">▶</span>
              </div>
                <span className="text-base font-semibold tracking-tighter sm:text-xl">
                YouTube Clone
              </span>
            </Link>
          </div>

          {/* right cluster: compact icons on mobile */}
          <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <Link
              href="/upload"
              title="Upload"
              className="flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 sm:px-4 sm:text-sm"
            >
              <Video size={14} />
              <span className="hidden sm:inline">Upload</span>
            </Link>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setBellOpen(!bellOpen)}
                title="Notifications"
              >
                <Bell size={18} />
              </Button>
              {bellOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border bg-white p-4 shadow-lg dark:bg-neutral-900">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="mt-2 text-sm text-gray-500">
                    No new notifications yet.
                  </p>
                </div>
              )}
            </div>

            {loading ? null : !user ? (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 sm:text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="hidden rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 sm:inline sm:text-sm"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="hidden text-sm text-gray-700 md:inline dark:text-gray-200">
                  Hi, {user.name || user.email?.split("@")[0]}
                </span>
                <Link
                  href="/downloads"
                  className="hidden rounded-full border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 lg:inline"
                >
                  Downloads
                </Link>
                <Link
                  href="/security"
                  className="hidden rounded-full border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 lg:inline"
                >
                  Security
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 sm:text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* search: full-width second row on mobile, centered on desktop */}
          <form
            onSubmit={handleSearch}
            className="order-3 flex w-full items-center gap-2 sm:order-2 sm:mx-4 sm:w-auto sm:max-w-xl sm:flex-1"
          >
            <div className="relative w-full">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Search"
                className="w-full rounded-l-full border border-gray-300 px-4 py-1.5 pr-9 text-sm focus:border-blue-600 focus:outline-none"
              />
              {/* clear button: one tap empties the search box */}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  title="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              className="h-8 rounded-l-none rounded-r-full px-4 sm:px-6"
            >
              <Search size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleVoiceSearch}
              title="Voice search"
              className="flex rounded-full bg-gray-100"
            >
              <Mic size={16} />
            </Button>
          </form>
        </div>
      </header>

      {/* voice search listening overlay */}
      {listening && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-neutral-900">
            <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-red-600">
              <Mic size={26} className="text-white" />
            </div>
            <p className="text-sm font-medium">Listening...</p>
            <p className="min-h-10 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-neutral-800 dark:text-gray-200">
              {heard || "Speak now - your words will appear here."}
            </p>
            <p className="text-xs text-gray-500">{voiceNote}</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={stopVoiceSearch}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Stop & Search
              </button>
              <button
                onClick={cancelVoiceSearch}
                className="rounded-full border px-5 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;