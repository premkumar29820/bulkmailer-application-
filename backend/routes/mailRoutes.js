// This file has two routes:
// POST   /api/mail/send
// GET    /api/mail/history
// DELETE /api/mail/history
// DELETE /api/mail/history/:id

import express from "express";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";
import SmtpSettings from "../models/SmtpSettings.js";

const router = express.Router();

// --------------------------------------------------
// Check email format
// --------------------------------------------------
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

// --------------------------------------------------
// Get SMTP credentials from MongoDB
// --------------------------------------------------
async function getSmtpSettings() {
  const settings = await SmtpSettings.findOne({
    user: { $exists: true, $ne: "" },
    pass: { $exists: true, $ne: "" },
  }).lean();

  if (!settings) {
    throw new Error(
      "SMTP credentials not found. Add a document with user and pass fields."
    );
  }

  return settings;
}

// --------------------------------------------------
// Create ONE SMTP transporter
// --------------------------------------------------
function createTransporter(smtpSettings) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,

    auth: {
      user: smtpSettings.user,
      pass: smtpSettings.pass,
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,

    tls: {
      rejectUnauthorized: true,
    },
  });
}

// --------------------------------------------------
// Send bulk emails
// --------------------------------------------------
async function sendToRecipients(
  transporter,
  recipients,
  subject,
  body,
  smtpSettings
) {
  const successfulEmails = [];
  const failedEmails = [];

  for (const recipient of recipients) {
    if (!isValidEmail(recipient)) {
      failedEmails.push({
        email: recipient,
        reason: "Not a valid email address",
      });

      continue;
    }

    try {
      await transporter.sendMail({
        from: smtpSettings.user,
        to: recipient,
        subject,
        html: body,
      });

      successfulEmails.push(recipient);

      console.log(`Email sent successfully to: ${recipient}`);
    } catch (error) {
      console.error(`Failed to send to ${recipient}:`, error.message);

      failedEmails.push({
        email: recipient,
        reason: error.message,
      });
    }
  }

  return {
    successfulEmails,
    failedEmails,
  };
}

// --------------------------------------------------
// POST /api/mail/send
// --------------------------------------------------
router.post("/send", async (req, res) => {
  try {
    const { subject, body, recipients } = req.body;

    // Validate request
    if (
      !subject ||
      !body ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        message:
          "Please fill in subject, body, and at least one recipient.",
      });
    }

    console.log("Getting SMTP settings...");

    // Get Gmail credentials
    const smtpSettings = await getSmtpSettings();

    console.log(`Using SMTP account: ${smtpSettings.user}`);

    // Create ONE transporter
    const transporter = createTransporter(smtpSettings);

    // Test SMTP connection before sending
    console.log("Testing SMTP connection...");

    await transporter.verify();

    console.log("SMTP connection successful.");

    // Send emails
    const { successfulEmails, failedEmails } =
      await sendToRecipients(
        transporter,
        recipients,
        subject,
        body,
        smtpSettings
      );

    // Close SMTP connection
    transporter.close();

    // Save history
    const savedRecord = await Email.create({
      subject,
      body,
      recipients,
      successfulEmails,
      failedEmails,
    });

    return res.json({
      message: `${successfulEmails.length} sent, ${failedEmails.length} failed.`,
      record: savedRecord,
    });
  } catch (error) {
    console.error("Mail send failed:", error);

    return res.status(500).json({
      message: error.message || "Could not send the email.",
    });
  }
});

// --------------------------------------------------
// GET /api/mail/history
// --------------------------------------------------
router.get("/history", async (req, res) => {
  try {
    const records = await Email.find().sort({ createdAt: -1 });

    res.json({ records });
  } catch (error) {
    console.error("History error:", error.message);

    res.status(500).json({
      message: "Could not load email history.",
    });
  }
});

// --------------------------------------------------
// DELETE ALL HISTORY
// --------------------------------------------------
router.delete("/history", async (req, res) => {
  try {
    await Email.deleteMany({});

    res.json({
      message: "Email history cleared.",
    });
  } catch (error) {
    console.error("Clear history error:", error.message);

    res.status(500).json({
      message: "Could not clear email history.",
    });
  }
});

// --------------------------------------------------
// DELETE ONE HISTORY ITEM
// --------------------------------------------------
router.delete("/history/:id", async (req, res) => {
  try {
    const deletedRecord = await Email.findByIdAndDelete(req.params.id);

    if (!deletedRecord) {
      return res.status(404).json({
        message: "History item not found.",
      });
    }

    res.json({
      message: "History item cleared.",
    });
  } catch (error) {
    console.error("Delete history error:", error.message);

    res.status(500).json({
      message: "Could not clear history item.",
    });
  }
});

export default router;
