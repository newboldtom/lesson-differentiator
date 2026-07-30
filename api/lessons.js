// Returns every lesson that's been saved so far, most recent first.

import { createClient } from 'redis';

const STORAGE_KEY = 'saved_lessons';

async function withRedis(fn) {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.quit();
    } catch {
      try { await client.disconnect(); } catch {}
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.REDIS_URL) {
    res.status(500).json({ error: 'No database connected yet. Add one from the Storage tab in Vercel, then redeploy.' });
    return;
  }

  try {
    const lessons = await withRedis(async (client) => {
      const raw = await client.get(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    });

    res.status(200).json({ lessons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load saved lessons' });
  }
}
