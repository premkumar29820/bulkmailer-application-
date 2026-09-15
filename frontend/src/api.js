// This file contains helper functions for calling the backend.

import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://bulkmailer-application.onrender.com/api";

// Render free instances cold-start slowly, and a bulk send runs
// one message at a time, so the send call needs a long leash.
const SEND_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const DEFAULT_TIMEOUT = 90 * 1000;   // 90 seconds

const api = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

// Turns any axios failure into the message your backend actually sent.
export function getErrorMessage(error) {
  if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
    return "Send cancelled.";
  }
  if (error.code === "ECONNABORTED") {
    return "The server took too long to respond. It may still be sending — check history.";
  }
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

// Login
export function login(email, password) {
  return api.post("/auth/login", { email, password });
}

// Send bulk mail
export function sendBulkMail(subject, body, recipients, signal) {
  return api.post(
    "/mail/send",
    { subject, body, recipients },
    { signal, timeout: SEND_TIMEOUT }
  );
}

// Get email history
export function getHistory(signal) {
  return api.get("/mail/history", { signal });
}

// Clear all email history
export function clearHistory() {
  return api.delete("/mail/history");
}

// Delete one history item
export function deleteHistoryItem(id) {
  return api.delete(`/mail/history/${encodeURIComponent(id)}`);
}
