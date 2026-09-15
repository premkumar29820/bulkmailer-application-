// This file has two routes:
//   POST /api/mail/send    -> sends the bulk email
//   GET  /api/mail/history -> returns past sends from MongoDB

import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";

const router = express.Router();

// A simple check to see if a string looks like an email address
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

async function getSmtpSettings() {
  const settings = await mongoose.connection.db
    .collection("bulkmail")
    .findOne({
      $or: [
        { user: { $exists: true } },
        { username: { $exists: true } },
        { email: { $exists: true } },
      ],
    });

  const user = String(
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    settings?.user ||
    settings?.username ||
    settings?.email ||
    ""
  ).trim();
  const pass = String(
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    settings?.pass ||
    settings?.password ||
    ""
  ).replace(/\s/g, "");

  if (!user || !pass) {
    throw new Error(
      "SMTP credentials were not found. Add user/pass to the bulkmail collection or configure SMTP_USER/SMTP_PASS."
    );
  }

  return { user, pass };
}

function createSmtpTransport(smtpSettings) {
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    service: "gmail",
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: smtpSettings.user,
      pass: smtpSettings.pass,
    },
    family: 4,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
}

async function sendEmail(transporter, recipient, subject, body, smtpSettings) {
  return transporter.sendMail({
    from: smtpSettings.user,
    to: recipient,
    subject,
    html: body,
  });
}

async function sendToRecipients(recipients, subject, body, smtpSettings, transporter) {
  const successfulEmails = [];
  const failedEmails = [];

  for (const recipient of recipients) {
    if (!isValidEmail(recipient)) {
      failedEmails.push({ email: recipient, reason: "Not a valid email address" });
      continue;
    }

    try {
      await sendEmail(transporter, recipient, subject, body, smtpSettings);
      successfulEmails.push(recipient);
    } catch (error) {
      failedEmails.push({ email: recipient, reason: error.message });
    }
  }

  return { successfulEmails, failedEmails };
}

router.post("/send", async (req, res) => {
  try {
    const { subject, body, recipients } = req.body;

    if (!subject || !body || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        message: "Please fill in subject, body, and at least one recipient.",
      });
    }

    const smtpSettings = await getSmtpSettings();
    const transporter = createSmtpTransport(smtpSettings);

    try {
      await transporter.verify();
    } catch (error) {
      const message = error.code === "ETIMEDOUT"
        ? "The SMTP server did not respond in time. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE, and the backend network connection."
        : `Could not connect to the SMTP server: ${error.message}`;
      throw new Error(message);
    }

    const { successfulEmails, failedEmails } = await sendToRecipients(
      recipients,
      subject,
      body,
      smtpSettings,
      transporter
    );

    const savedRecord = await Email.create({
      subject,
      body,
      recipients,
      successfulEmails,
      failedEmails,
    });

    res.json({
      message: `${successfulEmails.length} sent, ${failedEmails.length} failed.`,
      record: savedRecord,
    });
  } catch (error) {
    console.error("Mail send failed:", error.message);
    res.status(500).json({ message: error.message || "Could not send the email." });
  }
});

router.get("/history", async (req, res) => {
  try {
    // Newest first
    const records = await Email.find().sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    console.error("Email history failed:", error.message);
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
    const deletedRecord = await Email.findByIdAndDelete(req.params.id);

    if (!deletedRecord) {
      return res.status(404).json({ message: "History item not found." });
    }

    res.json({ message: "History item cleared." });
  } catch (error) {
    res.status(500).json({ message: "Could not clear history item." });
  }
});

export default router;
