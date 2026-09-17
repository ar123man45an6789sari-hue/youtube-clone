"use client";
import { API } from "../lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/plans";

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

  // full payment flow: order -> checkout -> verify -> plan active
  const choosePlan = async (planName: string) => {
    if (!user) {
      alert("Please sign in to choose a plan.");
      return;
    }

    // downgrade to Free needs no payment
    if (planName === "Free") {
      setBusy(planName);
      try {
        const res = await fetch(`${API}/api/users/${user._id}/subscription`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "Free", months: 1 }),
        });
        const data = await res.json();
        if (data.success) setCurrent(data.data);
      } catch (error) {
        console.error("Plan update failed:", error);
      } finally {
        setBusy("");
      }
      return;
    }

    setBusy(planName);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        alert("Could not load the payment gateway. Check your internet.");
        return;
      }

      // 1. create the order on our backend
      const orderRes = await fetch(`${API}/api/payments/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, plan: planName }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        alert(orderData.message || "Could not create the payment order.");
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
        description: `${planName} Plan - 1 month`,
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
                  invoiceNo: order.invoiceNo,
                  orderId: order.orderId,
                }),
              });
            } catch (error) {
              console.error("Failed to record cancelled payment:", error);
            }
            alert(
              "Payment cancelled or failed. A FAILED entry was saved in your billing history."
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
                invoiceNo: order.invoiceNo,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setCurrent(verifyData.data);
              alert(`Payment successful! ${planName} plan is now active.`);
            } else {
              alert(verifyData.message || "Payment verification failed.");
            }
          } catch (error) {
            console.error("Verification failed:", error);
          } finally {
            setBusy("");
          }
        },
      });
      rzp.open();
    } catch (error) {
      console.error("Payment flow failed:", error);
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
                  ? "Opening..."
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