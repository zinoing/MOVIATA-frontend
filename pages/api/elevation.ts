import type { NextApiRequest, NextApiResponse } from 'next';

type Location = { latitude: number; longitude: number };
type ElevationResult = Location & { elevation: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { locations } = req.body as { locations?: Location[] };
  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: 'Invalid locations' });
  }

  try {
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Elevation service unavailable' });
    }

    const data = (await response.json()) as { results: ElevationResult[] };
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'Failed to fetch elevation data' });
  }
}
