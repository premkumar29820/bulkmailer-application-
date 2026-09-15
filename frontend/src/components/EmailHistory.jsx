import { useEffect, useState } from "react";
import { clearHistory, deleteHistoryItem, getHistory } from "../api";

export default function EmailHistory() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearError, setClearError] = useState("");
  const [loadError, setLoadError] = useState("");

  function getStatusItems(record) {
    return [
      ...record.successfulEmails.map((email) => ({ email, status: "Success" })),
      ...record.failedEmails.map((item) => ({
        email: item.email,
        status: "Failed",
        reason: item.reason,
      })),
    ];
  }

  // Load the history once when this page first opens
  useEffect(() => {
    getHistory()
      .then((response) => setRecords(response.data.records))
      .catch(() => setLoadError("Could not load email history. Please make sure the backend is running."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDeleteHistory(record) {
    if (!window.confirm(`Clear history for "${record.subject}"?`)) {
      return;
    }

    setDeletingId(record._id);
    setClearError("");

    try {
      await deleteHistoryItem(record._id);
      setRecords((currentRecords) =>
        currentRecords.filter((item) => item._id !== record._id)
      );
    } catch (error) {
      setClearError("Could not clear this history item. Please make sure the backend is running.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAllHistory() {
    if (!window.confirm("Clear all email history? This cannot be undone.")) {
      return;
    }

    setIsClearingAll(true);
    setClearError("");

    try {
      await clearHistory();
      setRecords([]);
    } catch (error) {
      setClearError("Could not clear history. Please make sure the backend is running.");
    } finally {
      setIsClearingAll(false);
    }
  }

  if (isLoading) {
    return <p className="relative z-[1] text-center text-ink/50 py-16">Loading history...</p>;
  }

  if (loadError) {
    return <p className="relative z-[1] text-center text-stamp py-16">{loadError}</p>;
  }

  if (records.length === 0) {
    return <div className="relative z-[1] max-w-6xl mx-auto px-5 sm:px-8 py-16 text-center"><p className="font-display text-2xl text-ink">No emails sent yet.</p><p className="text-sm text-ink/50 mt-2">Your completed campaigns will appear here.</p></div>;
  }

  return (
    <div className="relative z-[1] max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div><p className="eyebrow mb-3">Archive</p><h2 className="font-display text-4xl text-ink">Email history</h2></div>
        <button
          type="button"
          onClick={handleClearAllHistory}
          disabled={isClearingAll || deletingId !== null}
          className="text-xs font-semibold text-stamp hover:text-stamp/75 disabled:opacity-50 transition-colors"
        >
          {isClearingAll ? "Clearing..." : "Clear all history"}
        </button>
      </div>
      {clearError && <p className="text-sm text-stamp mb-4">{clearError}</p>}

      <div className="space-y-3">
        {records.map((record) => (
          <details key={record._id} className="quiet-surface rounded-xl group open:shadow-soft transition-shadow">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{record.subject}</span>
                <span className="block text-xs text-ink/40 mt-1">
                  {new Date(record.createdAt).toLocaleString()}
                </span>
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  handleDeleteHistory(record);
                }}
                disabled={deletingId === record._id || isClearingAll}
                className="shrink-0 text-xs font-semibold text-stamp hover:text-stamp/75 disabled:opacity-50 transition-colors"
              >
                {deletingId === record._id ? "Clearing..." : "Clear"}
              </button>
            </summary>

            <div className="border-t border-line px-4 pb-4 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45 mb-2">
                Recipient status
              </p>
              <div className="space-y-2">
                {getStatusItems(record).map((item) => (
                  <div key={`${item.status}-${item.email}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-ink/75 break-all">
                      {item.email}
                      {item.reason && <span className="block text-xs text-stamp/75">{item.reason}</span>}
                    </span>
                    <span className={`status-pill ${item.status === "Success" ? "status-pill-success" : "status-pill-failed"} whitespace-nowrap`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
