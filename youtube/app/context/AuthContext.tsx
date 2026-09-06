"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Basic info of the logged-in user (we use name and email in navbar)
type User = {
    _id?: string;
  name?: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => void;
};

// Create the context - this is the single source of truth for auth state
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first page load, restore the session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Called by Login / Signup pages after successful authentication
  const login = (userData: any) => {
    localStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData); // Navbar updates instantly, no refresh needed
  };

  // Called when the user clicks Logout
  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook so any component can easily read auth state
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};