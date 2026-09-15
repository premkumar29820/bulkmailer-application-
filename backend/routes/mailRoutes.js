import express from "express";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";
import SmtpSettings from "../models/SmtpSettings.js";

const router = express.Router();

// ==================================================
// POST /api/mail/send
// Send bulk emails
// ==================================================

router.post("/send", async (req, res) => {
  try {
    const { subject, body, recipients } = req.body;

    // ------------------------------------------------
    // Validate request
    // ------------------------------------------------

    if (!subject || !body || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        message: "Subject, body and recipients are required",
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Recipient list is empty",
      });
    }

    console.log("POST /api/mail/send");
    console.log("Getting SMTP settings...");

    // ------------------------------------------------
    // Get SMTP credentials from MongoDB
    // ------------------------------------------------

    const settings = await SmtpSettings.findOne();

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: "SMTP settings not found",
      });
    }

    if (!settings.email || !settings.password) {
      return res.status(400).json({
        success: false,
        message: "SMTP email/password not found",
      });
    }

    console.log("Using SMTP account:", settings.email);

    // ------------------------------------------------
    // Create Gmail transporter
    // ------------------------------------------------

    const transporter = nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: settings.email,
        pass: settings.password,
      },

      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    // ------------------------------------------------
    // Test SMTP connection
    // ------------------------------------------------

    console.log("Testing SMTP connection...");

    await transporter.verify();

    console.log("SMTP connection successful");

    // ------------------------------------------------
    // Send emails
    // ------------------------------------------------

    const successfulEmails = [];
    const failedEmails = [];

    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: settings.email,
          to: recipient,
          subject: subject,
          text: body,
        });

        console.log(`Email sent to ${recipient}`);

        successfulEmails.push(recipient);
      } catch (error) {
        console.error(
          `Failed to send email to ${recipient}:`,
          error.message
        );

        failedEmails.push({
          email: recipient,
          reason: error.message,
        });
      }
    }

    // ------------------------------------------------
    // Save email history
    // ------------------------------------------------

    await Email.create({
      subject,
      body,
      recipients,
      successfulEmails,
      failedEmails,
    });

    // ------------------------------------------------
    // Send response
    // ------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Bulk email process completed",

      total: recipients.length,
      successful: successfulEmails.length,
      failed: failedEmails.length,

      successfulEmails,
      failedEmails,
    });
  } catch (error) {
    console.error("Mail send failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================================================
// GET /api/mail/history
// Get email history
// ==================================================

router.get("/history", async (req, res) => {
  try {
    console.log("GET /api/mail/history");

    const emails = await Email.find().sort({
      createdAt: -1,
    });

    return res.status(200).json(emails);
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
