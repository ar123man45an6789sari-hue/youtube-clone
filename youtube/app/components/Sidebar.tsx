"use client";

import Link from "next/link";
import {
  Home,
  Flame,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  Film,
  Gamepad2,
  Newspaper,
  Trophy,
  Music2,
  Lightbulb,
  Podcast,
} from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const mainLinks = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Flame, label: "Trending", href: "/" },
  { icon: PlaySquare, label: "Subscriptions", href: "/" },
];

const personalLinks = [
  { icon: History, label: "History", href: "/history" },
  { icon: Clock, label: "Watch Later", href: "/watch-later" },
  { icon: ThumbsUp, label: "Liked Videos", href: "/liked" },
];

const exploreLinks = [
  { icon: Film, label: "Movies", href: "/" },
  { icon: Gamepad2, label: "Gaming", href: "/" },
  { icon: Newspaper, label: "News", href: "/" },
  { icon: Trophy, label: "Sports", href: "/" },
  { icon: Music2, label: "Music", href: "/" },
  { icon: Lightbulb, label: "Learning", href: "/" },
  { icon: Podcast, label: "Podcasts", href: "/" },
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Dark overlay on mobile (click to close) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-[57px] left-0 z-40 h-[calc(100vh-57px)] w-60 overflow-y-auto border-r bg-white transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:sticky lg:translate-x-0 ${!isOpen ? "lg:-translate-x-full" : ""}`}
      >
        <nav className="p-2">
          {/* Main */}
          <div className="space-y-1">
            {mainLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="flex items-center gap-4 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                <link.icon size={20} />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <hr className="my-3" />

          {/* Personal */}
          <p className="mb-1 px-3 text-xs font-semibold text-gray-500 uppercase">
            You
          </p>
          <div className="space-y-1">
            {personalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="flex items-center gap-4 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                <link.icon size={20} />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <hr className="my-3" />

          {/* Explore */}
          <p className="mb-1 px-3 text-xs font-semibold text-gray-500 uppercase">
            Explore
          </p>
          <div className="space-y-1">
            {exploreLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="flex items-center gap-4 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                <link.icon size={20} />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <hr className="my-3" />

          {/* Footer */}
          <p className="px-3 py-4 text-xs text-gray-400">
            © 2025 YouTube Clone
          </p>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;