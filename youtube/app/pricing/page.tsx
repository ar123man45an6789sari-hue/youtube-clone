"use client";
import { API } from "../lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PLANS, CYCLES, cyclePrice, type Cycle } from "../lib/plans";

// load the Razorpay checkout script once
const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// pricing page: plan comparison + Razorpay upgrade flow (Task 3)
const PricingPage = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [note, setNote] = useState("");

  // fetch the freshest user doc (plan fields live in the database)
  const loadUser = async () => {
    if (!user?._id) return;
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

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isActive = (u: any) =>
    u && u.plan !== "Free" && u.planExpiry && new Date(u.planExpiry) > new Date();

  const rank = (name: string) => ["Free", "Bronze", "Silver", "Gold"].indexOf(name);

  // full payment flow: order -> checkout -> verify -> plan active
  const choosePlan = async (planName: string) => {
    if (!user) {
      alert("Please sign in to choose a plan.");
      return;
    }
    if (busy) return; // duplicate click guard

    // downgrade to Free needs no payment
    if (planName === "Free") {
      if (!confirm("Switch to the Free plan? Premium features will stop.")) return;
      setBusy(planName);
      try {
        const res = await fetch(`${API}/api/payments/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id, immediate: true }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrent(data.data);
          setNote("You are back on the Free plan. Your data and history are safe.");
        } else {
          setNote(data.message || "Could not change the plan.");
        }
      } catch (error) {
        console.error("Plan update failed:", error);
      } finally {
        setBusy("");
      }
      return;
    }

    setBusy(planName);
    setNote("");
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setNote("Could not load the payment gateway. Check your internet and retry.");
        setBusy("");
        return;
      }

      // 1. create the order on our backend
      const orderRes = await fetch(`${API}/api/payments/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, plan: planName, cycle }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        setNote(orderData.message || "Could not create the payment order.");
        setBusy("");
        return;
      }
      const order = orderData.data;

      // 2. open the Razorpay checkout popup
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: "YouTube Clone",
        description: `${planName} Plan - ${cycle}`,
        prefill: { name: user.name || "User", email: user.email || "" },
        theme: { color: "#dc2626" },
        modal: {
          ondismiss: async () => {
            setBusy("");
            try {
              await fetch(`${API}/api/payments/failed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: order.userId,
                  plan: order.plan,
                  cycle,
                  invoiceNo: order.invoiceNo,
                  orderId: order.orderId,
                  reason: "cancelled by user",
                }),
              });
            } catch (error) {
              console.error("Failed to record cancelled payment:", error);
            }
            setNote(
              "Payment cancelled. A FAILED entry was saved in your billing history - your plan did not change."
            );
          },
        },
        // 3. Razorpay calls this after a successful payment
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                userId: order.userId,
                plan: order.plan,
                cycle,
                invoiceNo: order.invoiceNo,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setCurrent(verifyData.data);
              setNote(
                `Payment successful! ${planName} plan is active till ` +
                  new Date(verifyData.data.planExpiry).toLocaleDateString() +
                  ". An invoice email has been sent to you."
              );
            } else {
              setNote(verifyData.message || "Payment verification failed.");
            }
          } catch (error) {
            console.error("Verification failed:", error);
            setNote(
              "Network problem while verifying. Open My Subscription in a minute - if money was deducted the plan activates after verification."
            );
          } finally {
            setBusy("");
          }
        },
      });
      rzp.on("payment.failed", async (resp: any) => {
        await fetch(`${API}/api/payments/failed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: order.userId,
            plan: order.plan,
            cycle,
            invoiceNo: order.invoiceNo,
            orderId: order.orderId,
            reason: resp?.error?.description || "payment failed",
          }),
        }).catch(() => {});
        setNote("Payment failed. Nothing was charged - you can try again.");
        setBusy("");
      });
      rzp.open();
    } catch (error) {
      console.error("Payment flow failed:", error);
      setBusy("");
    }
  };

  const activeNow = isActive(current);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">Choose Your Plan</h1>
        <p className="mt-2 text-sm text-gray-500">
          Upgrade for higher quality, more downloads and ad-free viewing.
        </p>
      </div>

      {/* billing cycle switch */}
      <div className="flex flex-wrap justify-center gap-2">
        {CYCLES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCycle(c.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              cycle === c.id ? "border-red-600 bg-red-600 text-white" : ""
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {note && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-center text-sm text-blue-800">
          {note}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent =
            current?.plan === plan.name && (plan.name === "Free" || activeNow);
          const price = cyclePrice(plan.price, cycle);
          const label =
            isCurrent && plan.name !== "Free"
              ? "Renew / Extend"
              : isCurrent
              ? "Current Plan"
              : plan.name === "Free"
              ? "Switch to Free"
              : rank(plan.name) < rank(current?.plan || "Free") && activeNow
              ? "Downgrade"
              : "Upgrade";
          return (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
                isCurrent ? "border-green-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="mt-2 text-3xl font-bold">
                ₹{price}
                <span className="text-sm font-normal text-gray-500">
                  {" "}
                  /{cycle === "monthly" ? "month" : cycle === "quarterly" ? "3 months" : "year"}
                </span>
              </p>
              {cycle !== "monthly" && plan.price > 0 && (
                <p className="text-xs text-green-600">
                  You save ₹{plan.price * (cycle === "quarterly" ? 3 : 12) - price}
                </p>
              )}
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choosePlan(plan.name)}
                disabled={busy !== "" || (isCurrent && plan.name === "Free")}
                className={`mt-6 rounded-full py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  plan.name === "Gold"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy === plan.name ? "Opening..." : label}
              </button>
            </div>
          );
        })}
      </div>

      {/* full feature comparison table */}
      <section className="overflow-x-auto rounded-2xl border p-4">
        <h2 className="mb-3 font-semibold">Compare all plans</h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Feature</th>
              {PLANS.map((p) => (
                <th key={p.name} className="py-2">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Price (per month)", ...PLANS.map((p) => (p.price ? `₹${p.price}` : "Free"))],
              ["Streaming quality", ...PLANS.map((p) => p.quality)],
              ["Downloads per day", ...PLANS.map((p) => String(p.downloadLimit))],
              ["Downloads per month", ...PLANS.map((p) => String(p.monthlyDownloads))],
              ["Watch time", ...PLANS.map((p) => p.watchLimit)],
              ["Ads", ...PLANS.map((p) => p.ads)],
              ["Premium content", ...PLANS.map((p) => p.premium)],
            ].map((row) => (
              <tr key={row[0]} className="border-b last:border-0">
                {row.map((cell, i) => (
                  <td key={i} className={i === 0 ? "py-2 font-medium" : "py-2"}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-2 font-medium">Offline downloads</td>
              {PLANS.map((p) => (
                <td key={p.name} className="py-2">
                  {p.name === "Free" ? (
                    <X size={14} className="text-red-500" />
                  ) : (
                    <CheckCircle size={14} className="text-green-600" />
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-500">
          Renewal policy: plans renew manually from this page. Upgrades start
          immediately; renewing the same plan adds the new period on top of the
          days you still have left. Expired plans fall back to Free
          automatically while your history and data stay safe.
        </p>
      </section>

      <p className="text-center text-sm text-gray-500">
        Already subscribed?{" "}
        <Link href="/subscription" className="font-medium text-red-600 hover:underline">
          View your subscription dashboard
        </Link>
      </p>
    </main>
  );
};

export default PricingPage;
