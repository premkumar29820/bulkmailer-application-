import { useState } from "react";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import BulkMailForm from "./components/BulkMailForm";
import EmailHistory from "./components/EmailHistory";

export default function App() {
  // Check if we already logged in before (saved in localStorage)
  const [loggedInEmail, setLoggedInEmail] = useState(
    localStorage.getItem("adminEmail")
  );
  const [page, setPage] = useState("compose"); // "compose" or "history"

  function handleLoginSuccess(email) {
    localStorage.setItem("adminEmail", email);
    setLoggedInEmail(email);
  }

  function handleLogout() {
    localStorage.removeItem("adminEmail");
    setLoggedInEmail(null);
  }

  // Not logged in yet -> show the login page
  if (!loggedInEmail) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged in -> show the main app
  return (
    <div className="app-shell bg-paper">
      <Navbar page={page} setPage={setPage} email={loggedInEmail} onLogout={handleLogout} />
      {page === "compose" ? <BulkMailForm /> : <EmailHistory />}
    </div>
  );
}
