import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

console.log("MAIL_USER:", process.env.MAIL_USER ? "it's set ✅" : "MISSING ❌");
console.log("MAIL_PASS:", process.env.MAIL_PASS ? "it's set ✅" : "MISSING ❌");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

try {
  const info = await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: process.env.MAIL_USER, 
    subject: "YouTube Clone Mail Test",
    text: "If you can read this, Nodemailer is working!",
  });
  console.log("MAIL SENT ✅ :", info.messageId);
} catch (e) {
  console.log("MAIL ERROR ❌ :", e.message);
}