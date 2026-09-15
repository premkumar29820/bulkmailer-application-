// This file defines what a "sent email record" looks like in MongoDB.
import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
  {
    subject: String,
    body: String,

    // Every address we tried to send to
    recipients: [String],

    // Addresses that were sent successfully
    successfulEmails: [String],

    // Addresses that failed, with the reason why
    failedEmails: [
      {
        email: String,
        reason: String,
      },
    ],
  },
  {
    // Automatically adds "createdAt" and "updatedAt" fields
    timestamps: true,
  }
);

const Email = mongoose.model("Email", emailSchema);

export default Email;
