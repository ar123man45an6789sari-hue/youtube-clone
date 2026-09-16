"use client";
import { API } from "../lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/plans";

// pricing page: plan comparison + upgrade (demo activation until Razorpay lands)
const PricingPage = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState<any>(null);
  const [busy, setBusy] = useState("");

  // fetch the freshest user doc (plan fields live in the database)
  useEffect(() => {
    if (!user?._id) return;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        if (data.success) {
          setCurrent(data.data.find((u: any) => u._id === user._id));
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    load();
  }, [user]);

  const isActive = (u: any) =>
    u && u.plan !== "Free" && u.planExpiry && new Date(u.planExpiry) > new Date();

  const choosePlan = async (planName: string) => {
    if (!user) {
      alert("Please sign in to choose a plan.");
      return;
    }

    // paid plans run in demo mode until the Razorpay integration lands
    if (planName !== "Free") {
      const ok = window.confirm(
        `Demo mode: activate ${planName} for 30 days without payment?\n(Razorpay payment gateway arrives in the next update.)`
      );
      if (!ok) return;
    }

    setBusy(planName);
    try {
      const res = await fetch(`${API}/api/users/${user._id}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName, months: 1 }),
      });
      const data = await res.json();
      if (data.success) setCurrent(data.data);
    } catch (error) {
      console.error("Plan update failed:", error);
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Choose Your Plan</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upgrade for higher quality, more downloads and ad-free viewing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent =
            current?.plan === plan.name && (plan.name === "Free" || isActive(current));
          return (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
                isCurrent ? "border-green-500 bg-green-50" : "bg-white"
              }`}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold">
                ₹{plan.price}
                <span className="text-sm font-normal text-gray-500"> /month</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choosePlan(plan.name)}
                disabled={busy !== "" || isCurrent}
                className={`mt-6 rounded-full py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  plan.name === "Gold"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isCurrent
                  ? "Current Plan"
                  : busy === plan.name
                  ? "Activating..."
                  : plan.name === "Free"
                  ? "Switch to Free"
                  : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-600">
        Already subscribed?{" "}
        <Link href="/subscription" className="font-medium text-red-600 hover:underline">
          View your subscription dashboard
        </Link>
      </p>
    </main>
  );
};

export default PricingPage;