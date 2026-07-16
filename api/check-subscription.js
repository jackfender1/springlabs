// api/check-subscription.js
// Given an email, looks up the Stripe customer and checks for an
// active subscription. Used to "unlock" the analyzer after payment.

const Stripe = require('stripe');

const PRICE_TIER_MAP = {
  'price_1TtJ0eArgWZv9lLtDnEGCyty': 'athlete',
  'price_1TtJ1NArgWZv9lLtGpUaEXxH': 'coach',
  'price_1TtJ33ArgWZv9lLtDe6VRUh1': 'program',
};

module.exports = async function handler(req, res) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Server is missing STRIPE_SECRET_KEY.' });
  }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Missing email.' });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
      expand: ['data.subscriptions']
    });
    if (customers.data.length === 0) {
      return res.status(200).json({ active: false });
    }

    const customer = customers.data[0];
    const activeSub = (customer.subscriptions?.data || []).find(s => s.status === 'active');

    const active = !!activeSub;
    let tier = null;
    if (active) {
      const priceId = activeSub.items.data[0].price.id;
      tier = PRICE_TIER_MAP[priceId] || null;
    }
    res.status(200).json({ active, tier });
  } catch (err) {
    res.status(500).json({ error: 'Stripe error: ' + err.message });
  }
};
