import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

const STORAGE_KEY = 'smart_csm_supabase_url_auth_notice';

/**
 * Supabase puts OAuth / magic-link / email-confirm failures in the URL hash, e.g.
 * #error=access_denied&error_code=otp_expired&error_description=...
 * When that happens no new session is created; the previous browser session (e.g. admin) stays active.
 */
export function captureSupabaseAuthFragmentError() {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash?.replace(/^#/, '') || '';
  if (!raw.includes('error=')) return null;
  const params = new URLSearchParams(raw);
  const error = params.get('error');
  const error_code = params.get('error_code');
  const error_description = params.get('error_description');
  if (!error && !error_code) return null;

  const description = error_description
    ? decodeURIComponent(String(error_description).replace(/\+/g, ' '))
    : '';

  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  return { error, error_code, error_description: description };
}

function messageFromPayload(p) {
  const code = (p?.error_code || '').toLowerCase();
  const desc = (p?.error_description || '').toLowerCase();
  if (code === 'otp_expired' || desc.includes('expired') || desc.includes('invalid')) {
    return (
      'That email confirmation link has expired or was already used, so no new account was signed in. ' +
      'If another person is still signed in on this browser, that session will stay active. ' +
      'Use the newest message from Supabase, sign out first, or open the link in a private window, then sign in with the new account.'
    );
  }
  if (p?.error_description) return p.error_description;
  if (p?.error) return `Sign-in was not completed (${p.error}).`;
  return 'Email or link sign-in did not complete. Please try again.';
}

/**
 * Call once on boot (e.g. AuthHandler) to move fragment errors into sessionStorage for the banner.
 */
export function stashSupabaseAuthFragmentError() {
  const parsed = captureSupabaseAuthFragmentError();
  if (!parsed) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore quota / private mode */
  }
}

export default function SupabaseAuthUrlNotice() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      setPayload(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  if (!payload) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-[min(100%,36rem)] px-4 animate-fade-in"
      role="alert"
    >
      <div className="flex gap-3 items-start rounded-xl border border-amber-200 bg-amber-50 text-amber-950 shadow-lg px-4 py-3 pr-10 relative">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-700" aria-hidden />
        <p className="text-sm font-semibold leading-snug">{messageFromPayload(payload)}</p>
        <button
          type="button"
          className="absolute top-2 right-2 p-1 rounded-lg text-amber-800 hover:bg-amber-100/80"
          aria-label="Dismiss"
          onClick={() => setPayload(null)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
