// api/support-chat.js
// A support chatbot that knows about SpringLabs specifically —
// pricing, how it works, account/billing basics — not a coaching assistant.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages.' });
  }

  const systemPrompt =
    `You are the support assistant for SpringLabs, an app that gives athletes and coaches AI-powered technique feedback on video clips of sprinting, hurdling, throwing, jumping, and block starts. ` +
    `Here's what you need to know about SpringLabs to answer questions:\n\n` +
    `HOW IT WORKS: A user uploads a short video clip, picks the event type, and the AI analyzes the clip and gives a score out of 10 plus specific feedback on what's working and what to improve, along with a suggested drill. There's also a "Guided Replay" feature that pauses the video at key moments the AI flagged.\n\n` +
    `PRICING (monthly subscriptions):\n` +
    `- Athlete ($15.99/mo): for one athlete training solo. Unlimited clip analysis, all 5 event types, progress history, drill suggestions.\n` +
    `- Coach ($39/mo): for a coach tracking a roster. Everything in Athlete, plus up to 15 athlete profiles, a team progress dashboard, and exportable reports for parents/recruiters.\n` +
    `- Program ($89/mo): for a school or club with multiple coaches. Everything in Coach, plus unlimited athlete profiles and multiple coach seats (a Program account can invite other coaches to share the same roster from the Team panel).\n\n` +
    `ACCOUNTS: Users sign up with an email/password and choose Athlete or Coach role. Access to the analyzer requires an active subscription tied to that same email.\n\n` +
    `SCORING: The AI scores technique from 5.0 (developing) to 10.0 (world-class), calibrated to feel encouraging rather than harsh.\n\n` +
    `Answer questions helpfully and concisely, in a friendly tone. If someone asks something you genuinely don't know (like account-specific billing issues, refunds, or bugs), tell them to email springlabs3@gmail.com rather than guessing. Don't make up features that don't exist. Keep answers short — a few sentences, not an essay.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Anthropic API error: ' + errText });
    }

    const data = await response.json();
    const reply = data.content.map(b => b.text || '').join('').trim();
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
