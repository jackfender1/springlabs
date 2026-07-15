// api/check-subscription.js
// Given an email, looks up the Stripe customer and checks for an
// active subscription. Used to "unlock" the analyzer after payment.

const Stripe = require('stripe');

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
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(200).json({ active: false });
    }

    const customer = customers.data[0];
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    const active = subs.data.length > 0;
    const plan = active ? subs.data[0].items.data[0].price.nickname || null : null;
    res.status(200).json({ active, plan });
  } catch (err) {
    res.status(500).json({ error: 'Stripe error: ' + err.message });
  }
};
