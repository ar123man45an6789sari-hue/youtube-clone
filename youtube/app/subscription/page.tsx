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
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user?._id) return;
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // cancel = stop auto renewal, premium stays till the expiry date
  const cancelPlan = async (immediate: boolean) => {
    if (!user?._id) return;
    const msg = immediate
      ? "Downgrade to Free right now? You will lose premium access immediately."
      : "Cancel renewal? You keep premium access until the expiry date.";
    if (!confirm(msg)) return;

    setBusy(true);
    try {
      const res = await fetch(`${API}/api/payments/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, immediate }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrent(data.data);
        setNote(
          immediate
            ? "Subscription cancelled. You are on the Free plan now - your watch history and data are preserved."
            : "Auto renewal stopped. Premium stays active until the expiry date."
        );
        load();
      } else {
        setNote(data.message || "Could not cancel the subscription.");
      }
    } catch (error) {
      console.error("Cancel failed:", error);
      setNote("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">My Subscription</h1>
        <p className="mt-4 text-sm text-gray-500">
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
        (new Date(current.planExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">My Subscription</h1>

      {note && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{note}</p>
      )}

      {/* current plan card */}
      <section className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{planInfo.name} Plan</p>
            <p className="text-sm text-gray-500">
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
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Streaming quality</p>
            <p className="font-medium">{planInfo.quality}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Downloads per day</p>
            <p className="font-medium">{planInfo.downloadLimit}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Billing cycle</p>
            <p className="font-medium capitalize">{current?.planCycle || "-"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Started on</p>
            <p className="font-medium">
              {current?.planStart
                ? new Date(current.planStart).toLocaleDateString()
                : "-"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Next renewal / expiry</p>
            <p className="font-medium">
              {active ? new Date(current.planExpiry).toLocaleDateString() : "-"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Auto renewal</p>
            <p className="font-medium">
              {current?.plan === "Free"
                ? "-"
                : current?.autoRenew === false
                ? "Cancelled"
                : "On"}
            </p>
          </div>
        </div>

        {/* premium features unlocked by the active plan */}
        <div className="mt-4 rounded-lg border p-3 text-sm">
          <p className="text-xs text-gray-500">Premium features on your plan</p>
          <ul className="mt-1 list-inside list-disc">
            {planInfo.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {active ? "Upgrade / Renew Plan" : "View Plans"}
          </Link>
          {active && current?.autoRenew !== false && (
            <button
              onClick={() => cancelPlan(false)}
              disabled={busy}
              className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancel renewal
            </button>
          )}
          {current?.plan !== "Free" && (
            <button
              onClick={() => cancelPlan(true)}
              disabled={busy}
              className="rounded-full border border-red-400 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
            >
              Cancel &amp; downgrade now
            </button>
          )}
        </div>
      </section>

      {/* billing history from the transactions collection */}
      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="font-medium">Billing History</h2>
        {bills.length === 0 ? (
          <p className="mt-3 rounded-lg border px-4 py-3 text-sm text-gray-500">
            No payments yet. Your invoices will appear here after your first paid
            subscription.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {bills.map((b: any) => (
              <div
                key={b._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{b.invoiceNo}</p>
                  <p className="text-xs text-gray-500">
                    {b.plan} plan • {b.cycle || "monthly"} •{" "}
                    {new Date(b.createdAt).toLocaleString()}
                  </p>
                  {b.paymentId && (
                    <p className="text-xs text-gray-400">
                      Payment ID: {b.paymentId} • Order: {b.orderId}
                    </p>
                  )}
                  {b.planExpiry && (
                    <p className="text-xs text-gray-400">
                      Valid till {new Date(b.planExpiry).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {b.currency === "INR" || !b.currency ? "₹" : ""}
                    {b.amount}
                  </p>
                  <span
                    className={`text-xs font-semibold ${
                      b.status === "success"
                        ? "text-green-600"
                        : b.status === "pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {String(b.status).toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Need help with a payment? Write to support@youtubeclone.test with your
          invoice number.
        </p>
      </section>

      {current?.plan !== "Free" && !active && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Your {current?.plan} plan has expired. You are back on Free limits —
          renew from the pricing page. Your watch history and downloads list stay
          saved.
        </p>
      )}
    </main>
  );
};

export default SubscriptionPage;
