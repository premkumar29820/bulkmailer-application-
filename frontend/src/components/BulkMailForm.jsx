import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { sendBulkMail } from "../api";

export default function BulkMailForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const [isPreviewing, setIsPreviewing] = useState(false); // false = editing, true = preview step
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null); // holds the server's response after sending
  const [recipientStatuses, setRecipientStatuses] = useState([]);
  const [deliveryCounts, setDeliveryCounts] = useState({ successful: 0, failed: 0 });
  const sendControllerRef = useRef(null);

  function updateCampaignField(setter, value) {
    if (result) {
      setResult(null);
      setDeliveryCounts({ successful: 0, failed: 0 });
    }
    setter(value);
  }

  // Turn the textarea text into a clean list of email addresses,
  // splitting on commas or new lines, and removing empty entries.
  const recipients = recipientsText
    .split(/[,\n]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  function handleFile(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const workbook = XLSX.read(loadEvent.target.result, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: "A" });
      const emails = rows
        .map((row) => String(row.A || "").trim())
        .filter((email) => email.length > 0);

      setRecipientsText((currentText) =>
        [currentText, ...emails].filter(Boolean).join("\n")
      );
    };

    reader.readAsArrayBuffer(file);
  }

  function handlePreviewClick(event) {
    event.preventDefault();

    if (!subject || !body || recipients.length === 0) {
      alert("Please fill in subject, body, and at least one recipient before previewing.");
      return;
    }

    setResult(null);
    setRecipientStatuses(recipients.map((email) => ({ email, status: "Pending" })));
    setIsPreviewing(true);
  }

  async function handleSend() {
    const controller = new AbortController();
    sendControllerRef.current = controller;
    setIsSending(true);
    setRecipientStatuses((currentStatuses) =>
      currentStatuses.map((item) => ({ ...item, status: "Sending" }))
    );

    try {
      const response = await sendBulkMail(subject, body, recipients, controller.signal);
      const successfulEmails = response.data.record?.successfulEmails || [];
      const failedEmails = response.data.record?.failedEmails || [];

      setResult(response.data);
      setDeliveryCounts({
        successful: successfulEmails.length,
        failed: failedEmails.length,
      });
      setRecipientStatuses(
        recipients.map((email) => ({
          email,
          status: successfulEmails.includes(email) ? "Success" : "Failed",
        }))
      );

      window.alert(failedEmails.length === 0 ? "  successfully sent" : "failed to send");

      // Clear everything and go back to a fresh compose form
      setSubject("");
      setBody("");
      setRecipientsText("");
      setIsPreviewing(false);
    } catch (error) {
      if (error.name === "CanceledError" || error.name === "AbortError") {
        return;
      }
      const message = error.response?.data?.message || "Could not send the email.";
      setResult({ message, successfulCount: 0, failedCount: recipients.length });
      setDeliveryCounts({ successful: 0, failed: recipients.length });
      window.alert("Failed");
    } finally {
      sendControllerRef.current = null;
      setIsSending(false);
    }
  }

  function handleBackToEdit() {
    sendControllerRef.current?.abort();
    setIsSending(false);
    setIsPreviewing(false);
    setRecipientStatuses([]);
  }

  return (
    <main className="relative z-[1] max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className={`${isPreviewing ? "mx-auto text-center" : ""} mb-8 max-w-2xl`}>
        <p className="eyebrow mb-3">New campaign</p>
        <h2 className="font-display text-4xl sm:text-5xl text-ink leading-tight">
          {isPreviewing ? "Preview your email" : "Compose email"}
        </h2>
        {!isPreviewing && <p className="text-base text-ink/55 mt-3">Write once, send thoughtfully.</p>}
      </div>

      {/* STEP 1: the editable form */}
      {!isPreviewing && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] items-start">
        <form onSubmit={handlePreviewClick} className="quiet-surface rounded-xl p-5 sm:p-7 space-y-5">
          <div>
            <label className="field-label block mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => updateCampaignField(setSubject, e.target.value)}
              className="form-field px-3.5 py-3 text-sm"
              placeholder="Email subject"
              required
            />
          </div>

          <div>
            <label className="field-label block mb-2">Email body</label>
            <textarea
              value={body}
              onChange={(e) => updateCampaignField(setBody, e.target.value)}
              rows={6}
              className="form-field px-3.5 py-3 text-sm leading-6"
              placeholder="Write your message here..."
              required
            />
          </div>

          <div>
            <label className="field-label block mb-2">
              Recipients
            </label>
            <textarea
              value={recipientsText}
              onChange={(e) => updateCampaignField(setRecipientsText, e.target.value)}
              rows={4}
              className="form-field px-3.5 py-3 text-sm font-mono"
              placeholder={"alice@example.com\nbob@example.com"}
              required
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink/70 transition hover:border-stamp hover:text-stamp">
                Upload File
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
              {selectedFileName && (
                <span className="text-xs text-ink/50">{selectedFileName} added</span>
              )}
            </div>
            <p className="text-xs text-ink/45 mt-2">
              {recipients.length} recipient{recipients.length === 1 ? "" : "s"} detected
              <span className="text-ink/30"> · one per line or comma-separated</span>
            </p>
          </div>

          <button type="submit" className="button-primary w-full">
            Preview email
          </button>
        </form>
        <aside className="hidden lg:block rounded-xl border border-stamp/15 bg-stamp/[0.04] p-5">
          <p className="eyebrow mb-3">Delivery report</p>
          <h3 className="font-display text-xl text-ink mb-2">
            {result ? result.message : "Ready for your next mail."}
          </h3>
          <p className="text-sm leading-6 text-ink/55 mb-4">
            Counts update after sending and reset when you start a new campaign.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-sage/20 bg-white p-3">
              <p className="text-2xl font-semibold text-sage">{deliveryCounts.successful}</p>
              <p className="text-xs text-ink/50 mt-1">Successful</p>
            </div>
            <div className="rounded-lg border border-coral/20 bg-white p-3">
              <p className="text-2xl font-semibold text-coral">{deliveryCounts.failed}</p>
              <p className="text-xs text-ink/50 mt-1">Failed</p>
            </div>
          </div>
        </aside>
        </div>
      )}

      {/* STEP 2: preview, looks like a real email, then confirm & send */}
      {isPreviewing && (
        <div className="mx-auto max-w-3xl">
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-soft">
            {/* Envelope-style header showing subject + recipient count */}
            <div className="px-5 sm:px-6 py-4 border-b border-line bg-paper/60">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45 font-semibold">
                To: {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
              </p>
              <p className="font-display text-xl text-ink mt-2">{subject}</p>
            </div>

            {/* The email body itself */}
            <div className="px-5 sm:px-6 py-7 text-sm leading-7 text-ink/80 whitespace-pre-wrap">
              {body}
            </div>

            {/* Full recipient list */}
            <div className="px-5 sm:px-6 py-4 border-t border-line">
              <p className="text-xs text-ink/50 mb-2">Recipient status:</p>
              <div className="space-y-2">
                {recipientStatuses.map((item) => (
                  <div key={item.email} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-ink/70 break-all">{item.email}</span>
                    <span className={`status-pill ${
                      item.status === "Success"
                        ? "status-pill-success"
                        : item.status === "Failed"
                          ? "status-pill-failed"
                          : "text-ink/50 bg-paper"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleBackToEdit} className="button-secondary flex-1">
              Back to edit
            </button>
            <button onClick={handleSend} disabled={isSending} className="button-primary flex-1 disabled:opacity-50">
              {isSending ? "Sending..." : "Confirm & send"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
