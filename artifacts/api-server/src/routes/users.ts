import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── In-memory user store ───────────────────────────────────────────────────────
// NOTE: This resets on server restart. Persist to DB (see storage.ts) when ready.
// Key: userId, Value: { trialStart, subscribed, scanCount }
export const userStore = new Map<string, { trialStart: number; subscribed: boolean; scanCount: number }>();

const TRIAL_DAYS = 7;

function computeTrialStatus(user: { trialStart: number; subscribed: boolean; scanCount: number }) {
  const trialElapsed = (Date.now() - user.trialStart) / (1000 * 60 * 60 * 24);
  const trialDaysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - trialElapsed));
  const trialExpired = trialElapsed >= TRIAL_DAYS;
  return { trialDaysLeft, trialExpired };
}

// ── GET /api/user/:userId — get or create user ────────────────────────────────
router.get("/user/:userId", (req, res): void => {
  const { userId } = req.params;

  if (!userId || userId.length < 10) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  if (!userStore.has(userId)) {
    userStore.set(userId, { trialStart: Date.now(), subscribed: false, scanCount: 0 });
  }

  const user = userStore.get(userId)!;
  const { trialDaysLeft, trialExpired } = computeTrialStatus(user);

  res.json({
    userId,
    subscribed: user.subscribed,
    trialDaysLeft,
    trialExpired,
    scanCount: user.scanCount,
  });
});

// ── POST /api/user/:userId/verify-subscription ────────────────────────────────
// Verifies entitlement with RevenueCat REST API and updates the in-memory store.
router.post("/user/:userId/verify-subscription", async (req, res): Promise<void> => {
  const { userId } = req.params;

  if (!userId || userId.length < 10) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const secretKey = process.env["REVENUECAT_SECRET_KEY"];
  if (!secretKey) {
    res.status(200).json({ subscribed: false });
    return;
  }

  try {
    const rcResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!rcResponse.ok) {
      res.status(200).json({ subscribed: false });
      return;
    }

    const data = await rcResponse.json() as any;
    const entitlements = data.subscriber?.entitlements ?? {};
    const proEntitlement = entitlements["Uncorked Pro"];
    const isSubscribed =
      !!proEntitlement?.expires_date &&
      new Date(proEntitlement.expires_date) > new Date();

    // Ensure the user exists in the store before updating
    if (!userStore.has(userId)) {
      userStore.set(userId, { trialStart: Date.now(), subscribed: isSubscribed, scanCount: 0 });
    } else {
      userStore.get(userId)!.subscribed = isSubscribed;
    }

    res.json({ subscribed: isSubscribed });
  } catch {
    res.status(500).json({ error: "Could not verify subscription" });
  }
});

export default router;
