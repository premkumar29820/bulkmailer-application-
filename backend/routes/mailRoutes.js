import express from "express";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";

const router = express.Router();

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function createTransporter() {
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.EMAIL_PASS || "").replace(/\s/g, "");

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

router.post("/send", async (req, res) => {
  try {
    const { subject, body, recipients } = req.body || {};

    if (
      !subject?.trim() ||
      !body?.trim() ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        message: "Please fill in subject, body, and at least one recipient.",
      });
    }

    const cleanRecipients = [
      ...new Set(
        recipients
          .map((email) => String(email).trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    const successfulEmails = [];
    const failedEmails = [];
    const transporter = createTransporter();

    for (const recipient of cleanRecipients) {
      if (!isValidEmail(recipient)) {
        failedEmails.push({
          email: recipient,
          reason: "Not a valid email address",
        });
        continue;
      }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject: subject.trim(),
          text: body,
          html: body.replace(/\n/g, "<br />"),
        });

        successfulEmails.push(recipient);
      } catch (error) {
        console.error(`Could not send email to ${recipient}:`, error.message);
        failedEmails.push({
          email: recipient,
          reason: error.message,
        });
      }
    }

    const savedRecord = await Email.create({
      subject: subject.trim(),
      body,
      recipients: cleanRecipients,
      successfulEmails,
      failedEmails,
    });

    return res.json({
      message: `${successfulEmails.length} sent, ${failedEmails.length} failed.`,
      record: savedRecord,
    });
  } catch (error) {
    console.error("Mail send failed:", error.message);

    return res.status(500).json({
      message: error.message || "Could not send the email.",
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const records = await Email.find().sort({ createdAt: -1 });
    return res.json({ records });
  } catch (error) {
    console.error("Email history failed:", error.message);
    return res.status(500).json({ message: "Could not load email history." });
  }
});

router.delete("/history", async (req, res) => {
  try {
    await Email.deleteMany({});
    return res.json({ message: "Email history cleared." });
  } catch (error) {
    console.error("Clear history failed:", error.message);
    return res.status(500).json({ message: "Could not clear email history." });
  }
});

router.delete("/history/:id", async (req, res) => {
  try {
    const deletedRecord = await Email.findByIdAndDelete(req.params.id);

    if (!deletedRecord) {
      return res.status(404).json({ message: "History item not found." });
    }

    return res.json({ message: "History item cleared." });
  } catch (error) {
    console.error("Delete history item failed:", error.message);
    return res.status(500).json({ message: "Could not clear history item." });
  }
});

export default router;
