import type { NextApiRequest, NextApiResponse } from 'next';

type Location = { latitude: number; longitude: number };

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

  const latitudes = locations.map((l) => l.latitude).join(',');
  const longitudes = locations.map((l) => l.longitude).join(',');

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`,
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Elevation service unavailable' });
    }

    const data = (await response.json()) as { elevation: number[] };

    const results = locations.map((loc, i) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      elevation: data.elevation[i] ?? 0,
    }));

    return res.status(200).json({ results });
  } catch {
    return res.status(502).json({ error: 'Failed to fetch elevation data' });
  }
}
