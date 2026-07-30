// This file runs on the server, not in the browser — so the API key
// stays private here and is never visible to anyone visiting the page.
// It reads the key from an environment variable called ANTHROPIC_API_KEY,
// which you set in your hosting provider's dashboard (not in this file).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { objective, yearGroup } = req.body || {};

  if (!objective || !yearGroup) {
    res.status(400).json({ error: 'Missing objective or yearGroup' });
    return;
  }

  const systemPrompt = `You are an experienced UK teacher and expert in differentiation. Given a learning objective and a year group, produce exactly three differentiated learning activities for a single lesson built around that objective: one for pupils who need more support, one core activity suitable for most of the class, and one for greater depth / extension.

Respond with ONLY valid JSON (no markdown fences, no commentary), as an array of exactly three objects in this exact shape:
[
  {"level": "Support", "title": "...", "activity": "...", "scaffold": "..."},
  {"level": "Core", "title": "...", "activity": "...", "scaffold": "..."},
  {"level": "Greater Depth", "title": "...", "activity": "...", "scaffold": "..."}
]

Rules:
- "title" is a short name for the activity (max 8 words).
- "activity" describes what pupils actually do, in 2-3 concise sentences, appropriate for the stated year group.
- "scaffold" is one short sentence explaining what makes this version different (the support given, or the stretch/challenge added).
- Keep language plain and classroom-practical. No extra keys, no trailing commas.`;

  const userPrompt = `Learning objective: ${objective}\nYear group: ${yearGroup}`;

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      res.status(anthropicResponse.status).json({
        error: (data.error && data.error.message) || 'Anthropic API error'
      });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error generating activities' });
  }
}
