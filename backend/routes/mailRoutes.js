import express from "express";
import { AgentMailClient } from "agentmail";
import Email from "../models/Email.js";

const router = express.Router();

const client = new AgentMailClient({
  apiKey: process.env.AGENTMAIL_API_KEY,
});

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

async function sendEmail(recipient, subject, body) {
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!inboxId) {
    throw new Error("AGENTMAIL_INBOX_ID is not configured.");
  }

  const message = await client.inboxes.messages.send(
    inboxId,
    {
      to: recipient,
      subject,
      html: body,
    }
  );

  return message;
}

async function sendToRecipients(recipients, subject, body) {
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
      await sendEmail(recipient, subject, body);
      successfulEmails.push(recipient);
    } catch (error) {
      console.error(
        `Failed to send to ${recipient}:`,
        error.message
      );

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

router.post("/send", async (req, res) => {
  try {
    const { subject, body, recipients } = req.body;

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

    if (!process.env.AGENTMAIL_API_KEY) {
      return res.status(500).json({
        message:
          "AGENTMAIL_API_KEY is not configured.",
      });
    }

    if (!process.env.AGENTMAIL_INBOX_ID) {
      return res.status(500).json({
        message:
          "AGENTMAIL_INBOX_ID is not configured.",
      });
    }

    const {
      successfulEmails,
      failedEmails,
    } = await sendToRecipients(
      recipients,
      subject,
      body
    );

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
      message:
        error.message || "Could not send the email.",
    });
  }
});

export default router;
