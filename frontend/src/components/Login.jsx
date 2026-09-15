import { useState } from "react";
import { login } from "../api";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const response = await login(email, password);
      onLoginSuccess(response.data.email);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Wrong email or password."
      );
    }
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center px-5 py-10 sm:px-8">
      <form
        onSubmit={handleSubmit}
        className="login-card rise-in w-full max-w-md bg-white border border-line rounded-2xl p-7 sm:p-9"
      >
        <div className="logo-mark w-12 h-12 rounded-xl mb-4">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 text-stamp fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <p className="eyebrow mb-3">Private dispatch desk</p>
        <h1 className="font-display text-3xl text-ink mb-1">Welcome back.</h1>
        <p className="text-sm text-ink/50 mb-7">Sign in to continue</p>

        <label className="field-label block mb-2">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-field px-3.5 py-3 mb-4 text-sm"
          placeholder="admin@example.com"
          required
        />

        <label className="field-label block mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-field px-3.5 py-3 mb-4 text-sm"
          placeholder="••••••••"
          required
        />

        {errorMessage && <p className="text-sm text-stamp mb-4">{errorMessage}</p>}

        <button
          type="submit"
          className="w-full bg-stamp text-white rounded-lg py-3 text-sm font-semibold hover:bg-stamp/90 transition-colors shadow-sm"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
