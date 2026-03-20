import { pool } from '@workspace/db';

export class Storage {
  async getProduct(productId: string) {
    const result = await pool.query(
      'SELECT * FROM stripe.products WHERE id = $1',
      [productId]
    );
    return result.rows[0] || null;
  }

  async listProductsWithPrices() {
    const result = await pool.query(`
      WITH paginated_products AS (
        SELECT id, name, description, metadata, active
        FROM stripe.products
        WHERE active = true
        ORDER BY id
        LIMIT 20
      )
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.active as product_active,
        p.metadata as product_metadata,
        pr.id as price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active as price_active
      FROM paginated_products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.id, pr.unit_amount
    `);
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await pool.query(
      'SELECT * FROM stripe.subscriptions WHERE id = $1',
      [subscriptionId]
    );
    return result.rows[0] || null;
  }

  async getActiveSubscriptionByCustomerId(customerId: string) {
    const result = await pool.query(
      `SELECT * FROM stripe.subscriptions
       WHERE customer = $1 AND status IN ('active', 'trialing')
       ORDER BY created DESC LIMIT 1`,
      [customerId]
    );
    return result.rows[0] || null;
  }

  async getUser(id: string) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findOrCreateUser(id: string) {
    await pool.query(
      'INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
      [id]
    );
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    email?: string;
  }) {
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (stripeInfo.stripeCustomerId !== undefined) {
      sets.push(`stripe_customer_id = $${i++}`);
      values.push(stripeInfo.stripeCustomerId);
    }
    if (stripeInfo.stripeSubscriptionId !== undefined) {
      sets.push(`stripe_subscription_id = $${i++}`);
      values.push(stripeInfo.stripeSubscriptionId);
    }
    if (stripeInfo.email !== undefined) {
      sets.push(`email = $${i++}`);
      values.push(stripeInfo.email);
    }

    if (sets.length === 0) return;
    values.push(userId);

    await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
      values
    );
  }

  // ─── Promo Codes ────────────────────────────────────────────────────────────

  async getPromoCode(code: string) {
    const result = await pool.query(
      'SELECT * FROM promo_codes WHERE code = $1 AND active = true',
      [code.toLowerCase().trim()]
    );
    return result.rows[0] || null;
  }

  async hasUserRedeemedCode(userId: string, code: string) {
    const result = await pool.query(
      'SELECT 1 FROM user_promo_codes WHERE user_id = $1 AND code = $2',
      [userId, code.toLowerCase().trim()]
    );
    return result.rows.length > 0;
  }

  async redeemPromoCode(userId: string, code: string, accessType: string) {
    const normalizedCode = code.toLowerCase().trim();

    // Record redemption
    await pool.query(
      `INSERT INTO user_promo_codes (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, normalizedCode]
    );

    // Increment usage count
    await pool.query(
      'UPDATE promo_codes SET uses = uses + 1 WHERE code = $1',
      [normalizedCode]
    );

    // Grant access on the user record
    await pool.query(
      'UPDATE users SET access_type = $1 WHERE id = $2',
      [accessType, userId]
    );
  }
}

export const storage = new Storage();
