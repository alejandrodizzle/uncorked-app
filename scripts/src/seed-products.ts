import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log('Checking for existing Pocket Somm products...');

    const existing = await stripe.products.search({
      query: "name:'Pocket Somm Premium' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log('Pocket Somm Premium already exists. Skipping creation.');
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      prices.data.forEach((p: any) => {
        console.log(`  Price: ${p.id}  ${p.unit_amount / 100} ${p.currency}/${p.recurring?.interval}`);
      });
      return;
    }

    console.log('Creating Pocket Somm Premium product...');
    const product = await stripe.products.create({
      name: 'Pocket Somm Premium',
      description: 'Unlimited wine scans, AI tasting notes, and Vivino ratings. First 7 days free.',
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 399,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`Created monthly price: $3.99/month (${monthlyPrice.id})`);

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 3999,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log(`Created yearly price: $39.99/year (${yearlyPrice.id})`);

    console.log('\nProducts created successfully!');
    console.log('Monthly price ID:', monthlyPrice.id);
    console.log('Yearly price ID:', yearlyPrice.id);
    console.log('\nWebhooks will sync this data to your database automatically.');
  } catch (error: any) {
    console.error('Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
