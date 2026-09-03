"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, Mic, Video, Bell } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import AuthMenu from "./AuthMenu";

type NavbarProps = {
  onMenuClick: () => void;
};

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [listening, setListening] = useState(false);

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
    setListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuery(text);
      setListening(false);
      router.push(`/search?q=${encodeURIComponent(text)}`);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-y-2 border-b bg-white px-2 py-2 sm:px-4">
      {/* Left: hamburger + logo */}
      <div className="order-1 flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <span className="text-xs text-white">▶</span>
          </div>
          <span className="hidden text-xl font-semibold tracking-tighter sm:inline">
            YouTube
          </span>
        </Link>
      </div>

      {/* Middle: search bar */}
      <form
        onSubmit={handleSearch}
        className="order-3 flex w-full items-center gap-2 sm:order-2 sm:mx-4 sm:w-auto sm:max-w-xl sm:flex-1"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search"
          className="w-full rounded-l-full border border-gray-300 px-4 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
        />
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
          className={`hidden rounded-full bg-gray-100 sm:flex ${
            listening ? "animate-pulse text-red-600" : ""
          }`}
        >
          <Mic size={16} />
        </Button>
      </form>

      {/* Right: upload + bell + auth */}
      <div className="order-2 flex items-center gap-1 sm:order-3 sm:gap-2">
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
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border bg-white p-4 shadow-lg">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="mt-2 text-sm text-gray-500">
                No new notifications yet.
              </p>
            </div>
          )}
        </div>

        <AuthMenu />
      </div>
    </header>
  );
};

export default Navbar;