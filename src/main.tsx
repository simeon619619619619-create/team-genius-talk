import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Lightweight first-party pageview tracker — pings site_pageviews on every route change.
// Uses the public Supabase anon client directly (RLS policy allows anon INSERT).
function trackPageview() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!url || !key) return;
    const body = {
      site_id: "simora.bg",
      url: location.href,
      path: location.pathname,
      referrer: document.referrer || "",
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language || "",
      user_agent: navigator.userAgent || "",
    };
    // fire-and-forget
    fetch(`${url}/rest/v1/site_pageviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* silent */ });
  } catch {
    /* silent */
  }
}

if (typeof window !== "undefined") {
  // Track initial load
  trackPageview();
  // Track SPA navigations (history API)
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    origPush.apply(this, args as any);
    setTimeout(trackPageview, 0);
  };
  history.replaceState = function (...args) {
    origReplace.apply(this, args as any);
    setTimeout(trackPageview, 0);
  };
  window.addEventListener("popstate", trackPageview);
}

function renderFatalError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : "";
  // eslint-disable-next-line no-console
  console.error("FATAL_APP_BOOT_ERROR", err);

  document.body.innerHTML = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system; padding: 24px; max-width: 900px; margin: 0 auto;">
      <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Simora: App crash</h1>
      <p style="opacity: .8; margin-bottom: 12px;">Copy this error and send it to support/dev:</p>
      <pre style="white-space: pre-wrap; word-break: break-word; background: rgba(0,0,0,.05); padding: 12px; border-radius: 8px;">${message}\n\n${stack ?? ""}</pre>
    </div>
  `;
}

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");

  // Catch async runtime errors too
  window.addEventListener("error", (e) => {
    // Only show fatal screen if nothing rendered yet
    if (document.body?.children?.length <= 1) renderFatalError((e as any).error ?? e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    // Ignore AbortError — happens during page reload/navigation
    const reason = (e as any).reason;
    if (reason?.name === "AbortError" || (reason instanceof Error && reason.message?.includes("aborted"))) return;
    if (document.body?.children?.length <= 1) renderFatalError(reason ?? e);
  });

  createRoot(rootEl).render(<App />);
} catch (err) {
  renderFatalError(err);
}
