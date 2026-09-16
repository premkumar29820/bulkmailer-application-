import axios from "axios";

const apiUrl = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  throw new Error("REACT_APP_API_URL is not configured.");
}

const API_URL = apiUrl.replace(/\/$/, "");

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Add the JWT token automatically to protected requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Backend route is POST /login, not /api/auth/login
export function login(email, password) {
  return api.post("/login", {
    email,
    password
  });
}

// The backend sends one email per request.
// This function sends the email separately to every recipient.
export async function sendBulkMail(subject, body, recipients, signal) {
  const successfulEmails = [];
  const failedEmails = [];

  for (const email of recipients) {
    try {
      await api.post(
        "/api/mail/send",
        {
          to: email,
          subject,
          text: body
        },
        {
          signal
        }
      );

      successfulEmails.push(email);
    } catch (error) {
      if (
        error.name === "CanceledError" ||
        error.name === "AbortError"
      ) {
        throw error;
      }

      failedEmails.push(email);
    }
  }

  return {
    data: {
      message:
        failedEmails.length === 0
          ? "All emails sent successfully"
          : "Some emails failed",
      record: {
        successfulEmails,
        failedEmails
      }
    }
  };
}
