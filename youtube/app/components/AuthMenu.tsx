"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "../lib/firebase";

const AuthMenu = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Firebase tells us instantly if someone is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(false);
    router.push("/");
  };

  if (loading) return null;

  // Not logged in → show Login button
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Login
      </Link>
    );
  }

  // Logged in → show avatar with dropdown menu
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white hover:opacity-90"
        title={user.email || "Account"}
      >
        {(user.email || "U").charAt(0).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white p-2 shadow-lg">
          <p className="truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {user.email}
          </p>
          <Link
            href="/upload"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            🎬 Upload Studio
          </Link>
          <Link
            href="/history"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            🕒 History
          </Link>
          <Link
            href="/liked"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            👍 Liked Videos
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthMenu;