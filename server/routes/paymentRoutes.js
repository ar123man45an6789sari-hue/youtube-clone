import express from "express";
import {
  createOrder,
  verifyPayment,
  getUserTransactions,
  recordFailedPayment,
  cancelSubscription,
} from "../controllers/paymentController.js";

const router = express.Router();

// POST = create a Razorpay order
router.route("/order").post(createOrder);

// POST = verify payment signature and activate the plan
router.route("/verify").post(verifyPayment);

// GET = billing history of one user
router.route("/user/:userId").get(getUserTransactions);

// POST = record a failed/cancelled payment attempt
router.route("/failed").post(recordFailedPayment);

// POST = cancel the running subscription
router.route("/cancel").post(cancelSubscription);

export default router;