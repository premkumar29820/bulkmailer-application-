// This file has two routes:
//   POST /api/mail/send    -> sends the bulk email
//   GET  /api/mail/history -> returns past sends from MongoDB

import express from "express";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";
import SmtpSettings from "../models/SmtpSettings.js";

const router = express.Router();

// A simple check to see if a string looks like an email address
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

async function getSmtpSettings() {
  const settings = await SmtpSettings.findOne({
    user: { $exists: true, $ne: "" },
    pass: { $exists: true, $ne: "" },
  }).lean();

  if (!settings) {
    throw new Error("user and pass were not found in the bulkmail collection.");
  }

  return settings;
}

async function sendEmail(recipient, subject, body, smtpSettings) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpSettings.user,
      pass: smtpSettings.pass,
    },
  });

  await transporter.sendMail({
    from: smtpSettings.user,
    to: recipient,
    subject,
    html: body,
  });
}

async function sendToRecipients(recipients, subject, body, smtpSettings) {
  const successfulEmails = [];
  const failedEmails = [];

  for (const recipient of recipients) {
    if (!isValidEmail(recipient)) {
      failedEmails.push({ email: recipient, reason: "Not a valid email address" });
      continue;
    }

    try {
      await sendEmail(recipient, subject, body, smtpSettings);
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
    const { successfulEmails, failedEmails } = await sendToRecipients(
      recipients,
      subject,
      body,
      smtpSettings
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
  // Newest first
  const records = await Email.find().sort({ createdAt: -1 });
  res.json({ records });
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
