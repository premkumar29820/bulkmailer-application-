// This file has small helper functions that call our backend.
// Keeping all the "talking to the server" code in one place makes
// the components below easier to read.

import axios from "axios";

const BASE_URL = 'https://bulkmailer-application.onrender.com/api';

export function login(email, password) {
  return axios.post(`${BASE_URL}/auth/login`, { email, password });
}

export function sendBulkMail(subject, body, recipients) {
  return axios.post(`${BASE_URL}/mail/send`, { subject, body, recipients });
}

export function getHistory() {
  return axios.get(`${BASE_URL}/mail/history`);
}

export function clearHistory() {
  return axios.delete(`${BASE_URL}/mail/history`);
}

export function deleteHistoryItem(id) {
  return axios.delete(`${BASE_URL}/mail/history/${id}`);
}
