import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// monthly prices must match the frontend plans config
const PLAN_PRICE = { Free: 0, Bronze: 99, Silver: 199, Gold: 299 };

// billing cycles: months + discount (quarterly 10% off, yearly 20% off)
const CYCLES = {
  monthly: { months: 1, discount: 0 },
  quarterly: { months: 3, discount: 0.1 },
  yearly: { months: 12, discount: 0.2 },
};

// final payable amount of a plan for a billing cycle (rounded rupees)
export const cyclePrice = (plan, cycle) => {
  const base = PLAN_PRICE[plan] || 0;
  const info = CYCLES[cycle] || CYCLES.monthly;
  return Math.round(base * info.months * (1 - info.discount));
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// create a Razorpay order for the chosen plan + billing cycle
const createOrder = async (req, res) => {
  try {
    const { userId, plan, cycle = "monthly" } = req.body;
    if (!PLAN_PRICE[plan] || plan === "Free") {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }
    if (!CYCLES[cycle]) {
      return res.status(400).json({ success: false, message: "Invalid billing cycle" });
    }

    const amount = cyclePrice(plan, cycle);

    // duplicate click guard: same user + plan + cycle within 2 minutes
    // reuses the open order instead of creating a second one
    const pending = await Transaction.findOne({
      userId,
      plan,
      cycle,
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    if (pending && pending.orderId) {
      return res.status(200).json({
        success: true,
        reused: true,
        data: {
          orderId: pending.orderId,
          keyId: process.env.RAZORPAY_KEY_ID,
          amount: pending.amount * 100,
          invoiceNo: pending.invoiceNo,
          plan,
          cycle,
          userId,
        },
      });
    }

    const invoiceNo = `INV-${Date.now()}`;
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await rzp.orders.create({
      amount: amount * 100, // Razorpay wants paise
      currency: "INR",
      receipt: invoiceNo,
    });

    // keep a pending row so cancelled/failed attempts are visible too
    await Transaction.create({
      userId,
      plan,
      cycle,
      months: CYCLES[cycle].months,
      invoiceNo,
      orderId: order.id,
      amount,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: amount * 100,
        invoiceNo,
        plan,
        cycle,
        userId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// confirmation email with invoice details (reuses the OTP mail setup)
const sendPaymentEmail = async (to, name, plan, amount, invoiceNo, expiry, cycle, paymentId) => {
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_PASS;
  if (!mailUser || !mailPass) {
    console.log("MAIL env not set - skipping payment email");
    return;
  }

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: mailUser, pass: mailPass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 6000,
    });

    await transporter.sendMail({
      from: mailUser,
      to,
      subject: `Payment successful - ${plan} plan activated (${invoiceNo})`,
      text: [
        `Hi ${name},`,
        "",
        "Your payment was successful and your subscription is now active.",
        "",
        "----- INVOICE -----",
        `Invoice number: ${invoiceNo}`,
        `Payment id: ${paymentId}`,
        `Plan: ${plan}`,
        `Billing cycle: ${cycle}`,
        `Amount paid: INR ${amount}`,
        `Valid till: ${expiry.toLocaleDateString()}`,
        "-------------------",
        "",
        "You can see this invoice any time in Profile > My Subscription.",
        "Need help? Write to support@youtubeclone.test",
        "",
        "Thank you for subscribing!",
        "- YouTube Clone",
      ].join("\n"),
    });
  } catch (error) {
    console.log("Payment email failed:", error.message);
  }
};

// verify payment signature, save transaction and activate the plan
const verifyPayment = async (req, res) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      userId,
      plan,
      invoiceNo,
      cycle = "monthly",
    } = req.body;

    const months = (CYCLES[cycle] || CYCLES.monthly).months;
    const amount = cyclePrice(plan, cycle);

    // same payment verified twice (double click / refresh) -> return the old result
    const already = await Transaction.findOne({ paymentId, status: "success" });
    if (paymentId && already) {
      const user = await User.findById(userId);
      return res.status(200).json({ success: true, duplicate: true, data: user });
    }

    // signature match = proof that Razorpay confirmed this payment
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      await Transaction.findOneAndUpdate(
        { orderId },
        {
          userId,
          plan,
          cycle,
          months,
          invoiceNo,
          orderId,
          paymentId,
          amount,
          status: "failed",
        },
        { upsert: true }
      );
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const existing = await User.findById(userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const now = new Date();
    // renewing the same plan before expiry adds time on top of what is left
    const stillActive =
      existing.plan === plan &&
      existing.planExpiry &&
      new Date(existing.planExpiry) > now;
    const base = stillActive ? new Date(existing.planExpiry) : now;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        plan,
        planStart: stillActive ? existing.planStart || now : now,
        planExpiry: addMonths(base, months),
        planCycle: cycle,
        autoRenew: true,
        cancelledAt: null,
      },
      { new: true }
    );

    await Transaction.findOneAndUpdate(
      { orderId },
      {
        userId,
        plan,
        cycle,
        months,
        invoiceNo,
        orderId,
        paymentId,
        amount,
        currency: "INR",
        status: "success",
        kind: stillActive ? "renewal" : "purchase",
        planStart: user.planStart,
        planExpiry: user.planExpiry,
        paidAt: now,
      },
      { upsert: true, new: true }
    );

    // confirmation email with invoice details (fire and forget)
    sendPaymentEmail(
      user.email,
      user.name,
      plan,
      amount,
      invoiceNo,
      new Date(user.planExpiry),
      cycle,
      paymentId
    ).catch(() => {});

    const safe = user.toObject();
    delete safe.password;
    delete safe.otpCode;
    res.status(200).json({ success: true, data: safe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// billing history of one user
const getUserTransactions = async (req, res) => {
  try {
    const list = await Transaction.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// record a failed or cancelled payment attempt
const recordFailedPayment = async (req, res) => {
  try {
    const { userId, plan, invoiceNo, orderId, cycle = "monthly", reason } = req.body;
    const tx = await Transaction.findOneAndUpdate(
      { orderId: orderId || invoiceNo },
      {
        userId,
        plan,
        cycle,
        months: (CYCLES[cycle] || CYCLES.monthly).months,
        invoiceNo,
        orderId: orderId || "",
        paymentId: "",
        amount: cyclePrice(plan, cycle),
        status: "failed",
        kind: reason || "cancelled by user",
      },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// cancel the subscription: no more renewal, access stays till the expiry date
const cancelSubscription = async (req, res) => {
  try {
    const { userId, immediate } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.plan === "Free") {
      return res
        .status(400)
        .json({ success: false, message: "You are already on the Free plan." });
    }

    const plan = user.plan;
    user.autoRenew = false;
    user.cancelledAt = new Date();
    // immediate = downgrade right now, otherwise keep access till expiry
    if (immediate) {
      user.plan = "Free";
      user.planStart = null;
      user.planExpiry = null;
      user.planCycle = "";
    }
    await user.save();
    const safeCancel = user.toObject();
    delete safeCancel.password;
    delete safeCancel.otpCode;

    await Transaction.create({
      userId,
      plan,
      cycle: user.planCycle || "monthly",
      invoiceNo: `CAN-${Date.now()}`,
      amount: 0,
      status: "cancelled",
      kind: "cancel",
    });

    res.status(200).json({ success: true, data: safeCancel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  createOrder,
  verifyPayment,
  getUserTransactions,
  recordFailedPayment,
  cancelSubscription,
};
