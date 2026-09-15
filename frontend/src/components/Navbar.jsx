import { useState } from "react";

export default function Navbar({ page, setPage, email, onLogout }) {
  const profileLetter = email?.trim().charAt(0).toUpperCase() || "U";
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="app-navbar relative z-10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="brand-mark w-10 h-10 rounded-lg flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 text-white fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none text-white">Post a Letter</h1>
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-white/45 mt-1">Campaign studio</p>
          </div>
        </div>

        <nav className="nav-tabs flex items-center gap-1 rounded-lg p-1" aria-label="Main navigation">
          <button
            onClick={() => setPage("compose")}
            className={`nav-tab px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-colors ${
              page === "compose" ? "nav-tab-active" : ""
            }`}
          >
            Compose
          </button>
          <button
            onClick={() => setPage("history")}
            className={`nav-tab px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-colors ${
              page === "history" ? "nav-tab-active" : ""
            }`}
          >
            History
          </button>
        </nav>

        <div className="profile-area flex items-center gap-2 sm:gap-3">
          <div className="account-label" title={email}>
            {email}
          </div>
          <div className="profile-menu-wrap">
            <div className="profile-trigger">
              <button
                type="button"
                className="profile-icon"
                aria-label={`Profile for ${email}`}
                aria-expanded={isProfileOpen}
                title="Open profile menu"
                onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              >
                {profileLetter}
              </button>
              <button
                type="button"
                className="profile-chevron"
                aria-label="Toggle profile menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className={isProfileOpen ? "rotate-180" : ""}>
                  <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {isProfileOpen && (
              <div className="profile-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  className="sign-out-button text-xs sm:text-sm font-semibold whitespace-nowrap"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
