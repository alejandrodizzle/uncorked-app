import { Router, type IRouter } from 'express';
import { storage } from '../storage';
import { stripeService } from '../stripeService';

const router: IRouter = Router();

function getBaseUrl(req: any): string {
  const host = req.get('host');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  return `${proto}://${host}`;
}

router.get('/stripe/subscription', async (req: any, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.json({ status: 'trial', trialDaysLeft: 14 });

    const user = await storage.getUser(userId);
    if (!user) return res.json({ status: 'trial', trialDaysLeft: 14 });

    // Promo code grants lifetime access
    if (user.access_type === 'lifetime') {
      return res.json({ status: 'active', accessType: 'lifetime' });
    }

    // Check Stripe subscription
    if (user.stripe_customer_id) {
      const sub = await storage.getActiveSubscriptionByCustomerId(user.stripe_customer_id);
      if (sub) {
        return res.json({
          status: sub.status,
          subscriptionId: sub.id,
          currentPeriodEnd: sub.current_period_end,
        });
      }
    }

    // Fall back to trial countdown
    const createdAt = new Date(user.created_at);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const trialDaysLeft = Math.max(0, Math.ceil(14 - daysSinceCreation));

    return res.json({
      status: trialDaysLeft > 0 ? 'trial' : 'expired',
      trialDaysLeft,
    });
  } catch (err: any) {
    console.error('Subscription check error:', err);
    res.json({ status: 'trial', trialDaysLeft: 14 });
  }
});

router.post('/stripe/user', async (req: any, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'x-user-id header required' });

    const user = await storage.findOrCreateUser(userId);
    res.json({ user });
  } catch (err: any) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ─── Promo Code Redemption ────────────────────────────────────────────────────

router.post('/stripe/redeem-code', async (req: any, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'x-user-id header required' });

    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'code required' });

    // Ensure user exists
    await storage.findOrCreateUser(userId);

    // Look up the promo code
    const promo = await storage.getPromoCode(code);
    if (!promo) {
      return res.status(404).json({ error: 'Invalid or expired code' });
    }

    // Check max_uses
    if (promo.max_uses !== null && promo.uses >= promo.max_uses) {
      return res.status(410).json({ error: 'This code has reached its usage limit' });
    }

    // Check if user already redeemed this code
    const alreadyRedeemed = await storage.hasUserRedeemedCode(userId, code);
    if (alreadyRedeemed) {
      return res.status(409).json({ error: 'You have already redeemed this code' });
    }

    // Apply access
    await storage.redeemPromoCode(userId, code, promo.access_type);

    res.json({
      success: true,
      accessType: promo.access_type,
      message: promo.access_type === 'lifetime'
        ? 'Lifetime access granted!'
        : `Access extended by ${promo.trial_days} days!`,
    });
  } catch (err: any) {
    console.error('Redeem code error:', err);
    res.status(500).json({ error: 'Failed to redeem code' });
  }
});

// ─── Checkout ─────────────────────────────────────────────────────────────────

router.post('/stripe/checkout', async (req: any, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'x-user-id header required' });

    const { priceId, email } = req.body;
    if (!priceId) return res.status(400).json({ error: 'priceId required' });

    let user = await storage.findOrCreateUser(userId);

    if (email && !user.email) {
      await storage.updateUserStripeInfo(userId, { email });
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeService.createCustomer(email || '', userId);
      await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const base = getBaseUrl(req);
    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      `${base}/uncorked/?payment=success`,
      `${base}/uncorked/?payment=cancelled`,
      7
    );

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? (err.message || 'Checkout failed') : 'Internal server error' });
  }
});

// ─── Customer Portal ──────────────────────────────────────────────────────────

router.get('/stripe/portal', async (req: any, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'x-user-id header required' });

    const user = await storage.getUser(userId);
    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const base = getBaseUrl(req);
    const session = await stripeService.createCustomerPortalSession(
      user.stripe_customer_id,
      `${base}/uncorked/`
    );

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Portal error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? (err.message || 'Portal failed') : 'Internal server error' });
  }
});

// ─── Products ─────────────────────────────────────────────────────────────────

router.get('/stripe/products-with-prices', async (_req, res) => {
  try {
    const rows = await storage.listProductsWithPrices();

    const productsMap = new Map<string, any>();
    for (const row of rows) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          active: row.product_active,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          active: row.price_active,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (err: any) {
    console.error('Products error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
  }
});

export default router;
