"use client";

import { useState} from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Mic, Video, Bell,Sun,Moon} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

type NavbarProps = {
  onMenuClick: () => void;
};

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { user, logout, loading } = useAuth();
    const { theme, applyTheme } = useTheme();

  // manual theme switch
  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
    if (user?._id) {
      fetch(`http://localhost:5000/api/users/${user._id}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next, themeAuto: false }),
      }).catch(() => {});
    }
  };
  const [bellOpen, setBellOpen] = useState(false);

  const handleLogout = () => {
  logout();
  router.push("/");
};

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white px-4 py-2">
      {/* Left: Menu + Logo */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <span className="text-xs text-white">▶</span>
          </div>
          <span className="text-xl font-semibold tracking-tighter">YouTube</span>
        </Link>
      </div>

      {/* Middle: Search */}
      <div className="flex flex-1 items-center justify-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search"
          className="w-full max-w-xl rounded-l-full border border-gray-300 px-4 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
        />
        <Button variant="outline" className="h-8 rounded-l-none rounded-r-full px-6">
          <Search />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full bg-gray-100">
          <Mic />
        </Button>
      </div>

      {/* Right: Upload + Notifications + Auth Buttons */}
      <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleThemeToggle} title="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Link
          href="/upload"
          className="flex items-center gap-1 rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Video size={16} /> Upload
        </Link>

        <Button variant="ghost" size="icon" onClick={() => setBellOpen(!bellOpen)}>
          <Bell />
        </Button>

        {/* AUTH BUTTONS - Agar user logged in nahi hai */}
       {loading ? null : !user ? (
          <>
            <Link
              href="/login"
              className="rounded-full border border-red-600 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Sign Up
            </Link>
          </>
        ) : (
          /* USER PROFILE - Agar user logged in hai */
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Hi, {user.name || user.email?.split("@")[0]}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;