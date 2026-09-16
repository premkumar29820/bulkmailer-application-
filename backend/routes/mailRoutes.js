import express from "express";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/send", async (req, res) => {
  try {
    const { subject, body, recipients } = req.body || {};

    if (
      !subject ||
      !body ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        message: "Subject, body, and recipients are required.",
      });
    }

    const successfulEmails = [];
    const failedEmails = [];

    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject,
          text: body,
        });

        successfulEmails.push(recipient);
      } catch (error) {
        console.error(`Failed to send to ${recipient}:`, error.message);

        failedEmails.push({
          email: recipient,
          reason: error.message,
        });
      }
    }

    const record = await Email.create({
      subject,
      body,
      recipients,
      successfulEmails,
      failedEmails,
    });

    return res.json({
      message: `${successfulEmails.length} sent, ${failedEmails.length} failed.`,
      record,
    });
  } catch (error) {
    console.error("Mail send failed:", error);

    return res.status(500).json({
      message: error.message || "Could not send the email.",
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const records = await Email.find().sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    console.error("History error:", error.message);
    res.status(500).json({ message: "Could not load email history." });
  }
});

router.delete("/history", async (req, res) => {
  try {
    await Email.deleteMany({});
    res.json({ message: "Email history cleared." });
  } catch (error) {
    res.status(500).json({ message: "Could not clear email history." });
  }
});

router.delete("/history/:id", async (req, res) => {
  try {
    const record = await Email.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: "History item not found.",
      });
    }

    res.json({ message: "History item deleted." });
  } catch (error) {
    res.status(500).json({
      message: "Could not delete history item.",
    });
  }
});

export default router;
