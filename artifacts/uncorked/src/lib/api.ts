/**
 * Returns the absolute URL for an API endpoint.
 *
 * In web (dev or deployed): uses BASE_URL set by Vite (e.g. "/uncorked/").
 * In Capacitor native build: uses VITE_API_URL which must be set to the
 * deployed server origin, e.g. https://your-app.replit.app/uncorked/
 *
 * To build for iOS:
 *   VITE_API_URL=https://your-app.replit.app/uncorked/ pnpm build
 */
const explicitBase = import.meta.env.VITE_API_URL as string | undefined;
const webBase = import.meta.env.BASE_URL as string;

function resolvedBase(): string {
  const b = explicitBase ?? webBase;
  return b.endsWith("/") ? b : b + "/";
}

export function apiUrl(path: string): string {
  const base = resolvedBase();
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return base + clean;
}
