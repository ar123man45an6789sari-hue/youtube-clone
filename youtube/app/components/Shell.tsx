"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Shell = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden w-56 shrink-0 md:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Dark background — click karne par band */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="absolute left-0 top-0 h-full w-64 overflow-y-auto bg-white">
              <button
                className="m-3 rounded-full px-3 py-1 text-sm font-medium hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
};

export default Shell;