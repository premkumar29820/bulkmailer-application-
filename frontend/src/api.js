import axios from "axios";

const apiUrl = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  throw new Error("REACT_APP_API_URL is not configured.");
}

const api = axios.create({
  baseURL: `${apiUrl.replace(/\/$/, "")}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export function login(email, password) {
  return api.post("/auth/login", { email, password });
}

export function sendBulkMail(subject, body, recipients, signal) {
  return api.post(
    "/mail/send",
    { subject, body, recipients },
    { signal }
  );
}

export function getHistory() {
  return api.get("/mail/history");
}

export function clearHistory() {
  return api.delete("/mail/history");
}

export function deleteHistoryItem(id) {
  return api.delete(`/mail/history/${id}`);
}
