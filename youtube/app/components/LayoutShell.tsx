"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

// route -> browser tab title (one place, all pages covered)
const ROUTE_TITLES: [string, string][] = [
  ["/meet", "Video Meet - YouTube Clone"],
  ["/pricing", "Pricing - YouTube Clone"],
  ["/subscription", "My Subscription - YouTube Clone"],
  ["/downloads", "Downloads - YouTube Clone"],
  ["/security", "Security - YouTube Clone"],
  ["/upload", "Upload - YouTube Clone"],
  ["/login", "Sign In - YouTube Clone"],
  ["/signup", "Sign Up - YouTube Clone"],
  ["/forgot-password", "Forgot Password - YouTube Clone"],
  ["/reset-password", "Reset Password - YouTube Clone"],
  ["/history", "Watch History - YouTube Clone"],
  ["/liked", "Liked Videos - YouTube Clone"],
  ["/watch-later", "Watch Later - YouTube Clone"],
  ["/search", "Search - YouTube Clone"],
  ["/video", "Video - YouTube Clone"],
  ["/channel", "Channel - YouTube Clone"],
  ["/admin", "Moderation - YouTube Clone"],
];

const LayoutShell = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // update the browser tab title on every route change
  useEffect(() => {
    const match = ROUTE_TITLES.find(
      ([route]) => pathname === route || pathname.startsWith(route + "/")
    );
    document.title = match
      ? match[1]
      : "YouTube Clone - Watch and Upload Videos";
  }, [pathname]);

  return (
    <div className="min-h-screen w-full">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-h-[calc(100vh-57px)] w-full min-w-0 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutShell;