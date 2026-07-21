// ── Shared client configuration ───────────────────────────────────────────────

// APP-SIDE TRIAL (30 days): pre-paywall grace period tracked in userStore.
// Separate from RC's store-side introductory offer, which is configured in
// App Store Connect / Play Console.
// Keep in sync with artifacts/api-server/src/config.ts (server is the source
// of truth for trialDaysLeft; this constant only drives optimistic local
// rendering and user-facing copy).
export const TRIAL_DAYS = 30;
