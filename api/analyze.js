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
        `Calibrate your score against competition level, using these anchors: 9.5-10 = world-class/Olympic-level technique, textbook-perfect mechanics with explosive, powerful positions and zero wasted movement; 8.5-9.4 = professional/elite collegiate level, excellent mechanics with at most one very minor refinement; 7-8.4 = strong competitive high school or college level, good fundamentals with a couple of noticeable but not major issues; 5-6.9 = developing athlete, correct basic shape but clear technical gaps affecting efficiency; below 5 = beginner, fundamental technique is missing or incorrect. ` +
        `Two elite athletes can and should score differently from each other (e.g. 8.8 vs 9.6) based on subtle differences in explosiveness, angles, and efficiency — don't cluster every good clip into the same narrow band. ` +
        `Photos can't show speed or power directly, so infer explosiveness from body lean, joint angles, and extension, and give credit for clean, powerful-looking positions rather than penalizing for what a still frame simply can't capture. Do not default to the middle of the scale out of caution — if the visible mechanics genuinely look world-class, score in the 9.5-10 range. ` +
        `Reserve "improvements" for things that would meaningfully move the needle at that athlete's level, not minor stylistic nitpicks on athletes who are already performing at a high level. ` +
        `Each image is numbered in order starting from frame 1. For each frame that shows something specifically worth pointing out (good or bad), include an entry in "moments" — skip frames with nothing notable. Keep each note short (under 15 words) and concrete enough that someone glancing at that exact frame would understand what you mean (e.g. "Front knee not driving high enough here" rather than something generic). ` +
        `Respond with ONLY a raw JSON object, no markdown fences, no commentary, matching exactly this shape: ` +
        `{"score": number (1-10, one decimal allowed), "summary": string (1-2 sentences), "strengths": [string, string] (2 items, specific and short), "improvements": [string, string] (2 items, specific and short, actionable), "drill": string (one short suggested drill to work on the top improvement), "moments": [{"frame": number (1-indexed, matching the image order), "type": "strength" or "improvement", "note": string (short, specific, under 15 words)}]}. ` +
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
