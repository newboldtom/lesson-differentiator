// Saves a lesson (objective, year group, and the generated activities) to
// your Redis database, using the connection string Vercel stored in the
// REDIS_URL environment variable when you connected the database.

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
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.REDIS_URL) {
    res.status(500).json({ error: 'No database connected yet. Add one from the Storage tab in Vercel, then redeploy.' });
    return;
  }

  const { objective, yearGroup, activities } = req.body || {};

  if (!objective || !yearGroup || !activities) {
    res.status(400).json({ error: 'Missing objective, yearGroup, or activities' });
    return;
  }

  try {
    const newLesson = await withRedis(async (client) => {
      const existingRaw = await client.get(STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      const lesson = {
        id: Date.now().toString(),
        objective,
        yearGroup,
        activities,
        savedAt: new Date().toISOString()
      };

      existing.unshift(lesson);
      await client.set(STORAGE_KEY, JSON.stringify(existing));
      return lesson;
    });

    res.status(200).json({ success: true, lesson: newLesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save the lesson' });
  }
}
