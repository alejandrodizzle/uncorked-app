import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

router.post("/api/delete-account-request", async (req, res) => {
  const { email, reason } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email address is required." });
  }

  const timestamp = new Date().toISOString();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Uncorked App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Uncorked account deletion request",
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #8b1a1a;">Account Deletion Request Received</h2>
          <p>We received a request to permanently delete your Uncorked account for <strong>${email}</strong>.</p>
          <p>Your account and all data will be <strong>permanently deleted within 30 days</strong>.</p>
          <p>Data that will be deleted: account credentials, wine scan history, saved wines, and subscription records.</p>
          <p style="background:#fff8e1; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:4px;">
            <strong>Important:</strong> If you have an active subscription, please also cancel it through the App Store or Google Play to stop future charges.
          </p>
          <p>If you did not make this request, contact us at aarenas1@gmail.com immediately.</p>
          <p style="color:#999; font-size:12px;">Request submitted: ${timestamp}</p>
        </div>
      `,
    });

    await transporter.sendMail({
      from: `"Uncorked App" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `[Uncorked] Account deletion request: ${email}`,
      html: `
        <h3>New Account Deletion Request</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Reason:</strong> ${reason || "Not provided"}</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
        <p>Please delete this user's data from the database within 30 days.</p>
      `,
    });

    console.log(`[DeleteAccount] Request logged for: ${email} at ${timestamp}`);
    return res.status(200).json({ message: "Deletion request received." });

  } catch (err) {
    console.error("[DeleteAccount] Email error:", err);
    console.log(`[DeleteAccount] MANUAL ACTION NEEDED for: ${email} at ${timestamp}`);
    return res.status(200).json({ message: "Deletion request received." });
  }
});

export default router;
