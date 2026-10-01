import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: { type: String, required: true },
    invoiceNo: { type: String, required: true },
    orderId: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    amount: { type: Number, default: 0 }, // in INR
    cycle: { type: String, default: "monthly" }, // monthly | quarterly | yearly
    months: { type: Number, default: 1 },
    planStart: { type: Date, default: null },
    planExpiry: { type: Date, default: null },
    kind: { type: String, default: "purchase" }, // purchase | renewal | upgrade | cancel
    currency: { type: String, default: "INR" },
    status: { type: String, default: "pending" }, // success | failed | cancelled
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;