// routes/mail.js
//
// Routes:
//   POST   /api/mail/send        -> send the bulk email
//   GET    /api/mail/history     -> list past sends (newest first)
//   DELETE /api/mail/history     -> clear all history
//   DELETE /api/mail/history/:id -> clear one history item
//
// SMTP credentials are read from the MongoDB `bulkmail` collection
// (fields: email, password). SMTP_USER / SMTP_PASS are NOT used.
// Host, port and secure flag stay configurable via env vars.

import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// A simple check to see if a string looks like an email address
function isValidEmail(email) {
  return typeof email === "string" && /^\S+@\S+\.\S+$/.test(email.trim());
}

// Never let the app password leak into a log line or an API response.
function redact(message, secret) {
  if (!message) return "";
  let safe = String(message);
  if (secret) {
    safe = safe.split(secret).join("****");
    // Gmail app passwords are often stored/typed with spaces
    const spaced = secret.replace(/(.{4})(?=.)/g, "$1 ");
    safe = safe.split(spaced).join("****");
  }
  return safe;
}

/**
 * Load the Gmail address and App Password from the `bulkmail` collection.
 * Only the `email` and `password` fields are supported.
 */
async function getSmtpSettings() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database is not connected, so SMTP credentials could not be loaded.");
  }

  const settings = await mongoose.connection.db
    .collection("bulkmail")
    .findOne({ email: { $exists: true, $ne: "" } });

  if (!settings) {
    throw new Error(
      "No SMTP credentials found. Add a document with `email` and `password` fields to the bulkmail collection."
    );
  }

  const email = String(settings.email || "").trim();
  // Gmail shows App Passwords as 4 groups of 4 — strip whitespace before use.
  const password = String(settings.password || "").replace(/\s/g, "");

  if (!email || !password) {
    throw new Error(
      "The bulkmail document is missing `email` or `password`. Both are required (use a Gmail App Password)."
    );
  }

  if (!isValidEmail(email)) {
    throw new Error("The `email` field in the bulkmail collection is not a valid email address.");
  }

  return { email, password };
}

/**
 * Gmail SMTP over STARTTLS on port 587 by default.
 * Host / port / secure remain overridable through Render env vars.
 */
function createSmtpTransport({ email, password }) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465; // 587 -> false, STARTTLS is negotiated via requireTLS

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure, // force STARTTLS upgrade on 587
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      servername: host,
      minVersion: "TLSv1.2",
    },
    family: 4, // Render's IPv6 route to Gmail often times out
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
}

/**
 * Turn a raw Nodemailer/socket error into something a human can act on,
 * without echoing the password back.
 */
function describeSmtpError(error, password) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = process.env.SMTP_PORT || 587;
  const detail = redact(error?.message, password);

  switch (error?.code) {
    case "ETIMEDOUT":
    case "ETIMEOUT":
      return `Timed out connecting to ${host}:${port}. Check SMTP_PORT (587) and that outbound SMTP is allowed by the host.`;
    case "ECONNREFUSED":
      return `${host}:${port} refused the connection. Verify SMTP_HOST, SMTP_PORT and SMTP_SECURE.`;
    case "ENOTFOUND":
    case "EDNS":
      return `Could not resolve the SMTP host "${host}". Check the SMTP_HOST value for typos.`;
    case "ECONNRESET":
      return `The SMTP connection was reset by ${host}. This usually means the port/secure combination is wrong (use 587 with secure=false, or 465 with secure=true).`;
    case "EAUTH":
      return "Gmail rejected the credentials. Use a 16-character Gmail App Password (2-Step Verification must be on) — not the normal account password.";
    case "ESOCKET":
      return `TLS/socket error talking to ${host}:${port}. If SMTP_PORT is 465, set SMTP_SECURE to "true"; for 587 leave it "false". (${detail})`;
    default:
      if (error?.responseCode === 535 || /5\.7\.\d/.test(detail)) {
        return "Gmail rejected the credentials (535). Use a Gmail App Password and confirm the `email` field matches the account that generated it.";
      }
      return `SMTP error: ${detail || "unknown failure"}`;
  }
}

async function sendEmail(transporter, recipient, subject, body, fromAddress) {
  return transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject,
    html: body,
  });
}

async function sendToRecipients(recipients, subject, body, smtpSettings, transporter) {
  const successfulEmails = [];
  const failedEmails = [];

  for (const recipient of recipients) {
    const address = typeof recipient === "string" ? recipient.trim() : "";

    if (!isValidEmail(address)) {
      failedEmails.push({ email: String(recipient), reason: "Not a valid email address" });
      continue;
    }

    try {
      await sendEmail(transporter, address, subject, body, smtpSettings.email);
      successfulEmails.push(address);
    } catch (error) {
      failedEmails.push({
        email: address,
        reason: describeSmtpError(error, smtpSettings.password),
      });
    }
  }

  return { successfulEmails, failedEmails };
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

router.post("/send", async (req, res) => {
  let smtpSettings = null;
  let transporter = null;

  try {
    const { subject, body, recipients } = req.body;

    if (!subject || !body || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        message: "Please fill in subject, body, and at least one recipient.",
      });
    }

    smtpSettings = await getSmtpSettings();
    transporter = createSmtpTransport(smtpSettings);

    // Verify the connection + credentials before sending anything.
    try {
      await transporter.verify();
    } catch (error) {
      throw new Error(describeSmtpError(error, smtpSettings.password));
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
    const safeMessage = redact(error?.message, smtpSettings?.password);
    console.error("Mail send failed:", safeMessage);
    res.status(500).json({ message: safeMessage || "Could not send the email." });
  } finally {
    if (transporter) transporter.close();
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
