/**
 * Returns the absolute URL for an API endpoint.
 *
 * VITE_API_URL is baked in at build time (e.g. https://wine-scan-ai.replit.app).
 * Falls back to the production host so native Android/iOS builds never produce
 * relative paths that resolve incorrectly inside a Capacitor WebView.
 */
const base = (import.meta.env.VITE_API_URL as string | undefined) || "https://wine-scan-ai.replit.app";
const resolvedBase = base.endsWith("/") ? base.slice(0, -1) : base;

export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${resolvedBase}/${clean}`;
}
