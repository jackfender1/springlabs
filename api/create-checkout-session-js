// api/create-checkout-session.js
// Creates a Stripe Checkout session for the plan the user picked,
// and returns the URL to redirect them to Stripe's hosted checkout page.

const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Server is missing STRIPE_SECRET_KEY.' });
  }

  const { priceId } = req.body;
  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId.' });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Stripe error: ' + err.message });
  }
};
