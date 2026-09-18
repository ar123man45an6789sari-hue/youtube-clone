import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// plan prices must match the frontend plans config
const PLAN_PRICE = { Free: 0, Bronze: 99, Silver: 199, Gold: 299 };

// create a Razorpay order for the chosen plan
const createOrder = async (req, res) => {
  try {
    const { userId, plan } = req.body;
    const price = PLAN_PRICE[plan];
    if (!price) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    const invoiceNo = `INV-${Date.now()}`;
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await rzp.orders.create({
      amount: price * 100, // Razorpay wants paise
      currency: "INR",
      receipt: invoiceNo,
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: price * 100,
        invoiceNo,
        plan,
        userId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// confirmation email with invoice details (reuses the OTP mail setup)
const sendPaymentEmail = async (to, name, plan, amount, invoiceNo, expiry) => {
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
      subject: `Payment successful - ${plan} plan activated`,
      text: [
        `Hi ${name},`,
        "",
        "Your payment was successful and your subscription is now active.",
        "",
        `Invoice: ${invoiceNo}`,
        `Plan: ${plan}`,
        `Amount: Rs.${amount}`,
        `Valid till: ${expiry.toLocaleDateString()}`,
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
    const { orderId, paymentId, signature, userId, plan, invoiceNo } = req.body;

    // signature match = proof that Razorpay ne payment confirm kiya
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      await Transaction.create({
        userId,
        plan,
        invoiceNo,
        orderId,
        paymentId,
        amount: PLAN_PRICE[plan] || 0,
        status: "failed",
      });
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const now = new Date();
    const user = await User.findByIdAndUpdate(
      userId,
      {
        plan,
        planStart: now,
        planExpiry: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
      { new: true }
    );

       await Transaction.create({
      userId,
      plan,
      invoiceNo,
      orderId,
      paymentId,
      amount: PLAN_PRICE[plan] || 0,
      status: "success",
      paidAt: now,
    });

    // confirmation email with invoice details (fire and forget)
    sendPaymentEmail(
      user.email,
      user.name,
      plan,
      PLAN_PRICE[plan] || 0,
      invoiceNo,
      new Date(user.planExpiry)
    ).catch(() => {});

    res.status(200).json({ success: true, data: user });
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
};// record a failed or cancelled payment attempt
const recordFailedPayment = async (req, res) => {
  try {
    const { userId, plan, invoiceNo, orderId } = req.body;
    const tx = await Transaction.create({
      userId,
      plan,
      invoiceNo,
      orderId: orderId || "",
      paymentId: "",
      amount: PLAN_PRICE[plan] || 0,
      status: "failed",
    });
    res.status(200).json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export { createOrder, verifyPayment, getUserTransactions, recordFailedPayment };