import mongoose from "mongoose";

const smtpSettingsSchema = new mongoose.Schema(
  {
    user: String,
    pass: String,
  },
  {
    collection: "bulkmail",
    strict: false,
  }
);

const SmtpSettings = mongoose.model("SmtpSettings", smtpSettingsSchema);

export default SmtpSettings;
