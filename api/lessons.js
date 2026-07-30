// Returns every lesson that's been saved so far, most recent first.

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
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: 'No database connected yet. Add one from the Storage tab in Vercel, then redeploy.' });
    return;
  }

  try {
    const raw = await redisCommand(['GET', STORAGE_KEY]);
    const lessons = raw ? JSON.parse(raw) : [];
    res.status(200).json({ lessons });
  } catch (err) {
    res.status(500).json({ error: 'Could not load saved lessons' });
  }
}
