// Saves a lesson (objective, year group, and the generated activities) to
// your database. Reads the connection details from environment variables
// that Vercel adds automatically once you connect a database via the
// Storage tab (Marketplace) in your Vercel project — you don't set these
// by hand.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const STORAGE_KEY = 'saved_lessons';

async function redisCommand(command) {
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await response.json();
  return data.result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: 'No database connected yet. Add one from the Storage tab in Vercel, then redeploy.' });
    return;
  }

  const { objective, yearGroup, activities } = req.body || {};

  if (!objective || !yearGroup || !activities) {
    res.status(400).json({ error: 'Missing objective, yearGroup, or activities' });
    return;
  }

  try {
    const existingRaw = await redisCommand(['GET', STORAGE_KEY]);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];

    const newLesson = {
      id: Date.now().toString(),
      objective,
      yearGroup,
      activities,
      savedAt: new Date().toISOString()
    };

    existing.unshift(newLesson);
    await redisCommand(['SET', STORAGE_KEY, JSON.stringify(existing)]);

    res.status(200).json({ success: true, lesson: newLesson });
  } catch (err) {
    res.status(500).json({ error: 'Could not save the lesson' });
  }
}
