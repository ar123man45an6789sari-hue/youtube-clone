"use client";
import { API } from "../lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/plans";

// subscription dashboard: current plan, validity and billing history (Task 3)
const SubscriptionPage = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState<any>(null);
   const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id) return;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/users`);
        const data = await res.json();
        if (data.success) {
          setCurrent(data.data.find((u: any) => u._id === user._id));
        }
        const billRes = await fetch(`${API}/api/payments/user/${user._id}`);
        const billData = await billRes.json();
        if (billData.success) setBills(billData.data);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">My Subscription</h1>
        <p className="mt-4 text-sm text-gray-600">
          Please sign in to view your subscription.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Sign In
        </Link>
      </main>
    );
  }

  const planInfo = PLANS.find((p) => p.name === current?.plan) || PLANS[0];
  const active =
    current &&
    current.plan !== "Free" &&
    current.planExpiry &&
    new Date(current.planExpiry) > new Date();
     const daysLeft = active
    ? Math.ceil(
        (new Date(current.planExpiry).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">My Subscription</h1>

      {/* current plan card */}
      <section className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{planInfo.name} Plan</p>
            <p className="text-sm text-gray-600">
              {current?.plan === "Free"
                ? "Free forever"
                : active
                ? `Active • ${daysLeft} days left`
                : "Expired"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              current?.plan === "Free"
                ? "bg-gray-100 text-gray-700"
                : active
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {current?.plan === "Free" ? "FREE" : active ? "ACTIVE" : "EXPIRED"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Streaming quality</p>
            <p className="font-medium">{planInfo.quality}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Downloads per day</p>
            <p className="font-medium">{planInfo.downloadLimit}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Renewal date</p>
            <p className="font-medium">
              {active ? new Date(current.planExpiry).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href="/pricing"
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {active ? "Upgrade / Change Plan" : "View Plans"}
          </Link>
        </div>
      </section>

      {/* billing history from the transactions collection */}
      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="font-medium">Billing History</h2>
        {bills.length === 0 ? (
          <p className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            No payments yet. Your invoices will appear here after your first
            paid subscription.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {bills.map((b: any) => (
              <div
                key={b._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{b.invoiceNo}</p>
                  <p className="text-xs text-gray-500">
                    {b.plan} plan • {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{b.amount}</p>
                  <span
                    className={`text-xs font-semibold ${
                      b.status === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {b.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {current?.plan !== "Free" && !active && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Your {current?.plan} plan has expired. You are back on Free limits —
          renew from the pricing page.
        </p>
      )}
    </main>
  );
};

export default SubscriptionPage;