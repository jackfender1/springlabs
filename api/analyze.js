// api/analyze.js
// Vercel automatically turns this file into a live endpoint at /api/analyze
// No server setup, no "app.listen" needed — Vercel handles that.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  const { categoryPrompt, frames } = req.body;
  if (!categoryPrompt || !Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ error: 'Missing categoryPrompt or frames.' });
  }

  const content = [
    {
      type: 'text',
      text:
        `You are an experienced track and field coach. These ${frames.length} images are sequential frames sampled from a short video clip of an athlete performing ${categoryPrompt}. ` +
        `Assess their technique based only on what is visible in the frames (body position, angles, form). ` +
        `Use the full range of the scale, calibrated like this: 9-10 = elite/professional-level technique with no meaningful flaws visible; 7-8 = strong, competitive technique with only minor, nitpicky refinements possible; 5-6 = solid fundamentals but with a clear, visible technical issue affecting performance; 3-4 = developing technique with multiple fundamental issues; 1-2 = significant technical breakdown. ` +
        `Do not default to the middle of the scale out of caution — if the visible form genuinely looks elite, score it in the 9-10 range even if you can still name a small refinement. Reserve "improvements" for things that would meaningfully move the needle, not minor stylistic nitpicks on athletes who are already performing at a high level. ` +
        `Respond with ONLY a raw JSON object, no markdown fences, no commentary, matching exactly this shape: ` +
        `{"score": number (1-10, one decimal allowed), "summary": string (1-2 sentences), "strengths": [string, string] (2 items, specific and short), "improvements": [string, string] (2 items, specific and short, actionable), "drill": string (one short suggested drill to work on the top improvement)}. ` +
        `Be specific to what you can actually see. If the frames are unclear or don't show enough of the movement, still give your best honest assessment and note the limitation briefly in the summary.`
    },
    ...frames.map((f) => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: f }
    }))
  ];

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
        max_tokens: 1000,
        messages: [{ role: 'user', content }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Anthropic API error: ' + errText });
    }

    const data = await response.json();
    const raw = data.content.map((b) => b.text || '').join('').trim();
    const cleaned = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
