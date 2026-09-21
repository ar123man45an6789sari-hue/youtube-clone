"use client";
import { API } from "../lib/api";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, Mic, Video, Bell, Sun, Moon } from "lucide-react";
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
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuery(text);
      router.push(`/search?q=${encodeURIComponent(text)}`);
    };
    recognition.start();
  };

  return (
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
            className="hidden rounded-full bg-gray-100 sm:flex"
          >
            <Mic size={16} />
          </Button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;