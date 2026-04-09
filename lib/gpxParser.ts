import type { GpxData } from '../types/gpx';

/** Haversine distance between two WGS-84 points, in metres. */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "2026-03-16T10:30:00Z" → "3/16/2026" */
function isoToDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * Parse a GPX XML string and extract route data.
 * Throws if the file is not valid GPX or contains fewer than 2 track points.
 */
export function parseGpx(xmlString: string): GpxData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid GPX file — XML parse error.');
  }

  // Activity name: prefer <trk><name>, fall back to root <name>
  const nameEl =
    doc.querySelector('trk > name') ?? doc.querySelector('name');
  const name = nameEl?.textContent?.trim() || 'Untitled Route';

  // Collect all track points across all tracks and segments
  const trkpts = Array.from(doc.querySelectorAll('trkpt'));
  if (trkpts.length < 2) {
    throw new Error('GPX file contains fewer than 2 track points.');
  }

  const coordinates: [number, number][] = [];
  let distanceMeters = 0;
  let firstTime: string | null = null;
  let lastTime: string | null = null;

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat') ?? '');
    const lon = parseFloat(pt.getAttribute('lon') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const time = pt.querySelector('time')?.textContent?.trim() ?? null;
    if (time) {
      if (!firstTime) firstTime = time;
      lastTime = time;
    }

    if (coordinates.length > 0) {
      const prev = coordinates[coordinates.length - 1]!;
      distanceMeters += haversineMeters(prev[1], prev[0], lat, lon);
    }

    // MapLibre expects [lon, lat]
    coordinates.push([lon, lat]);
  }

  const date = firstTime ? isoToDisplayDate(firstTime) : '';

  const movingTimeSeconds =
    firstTime && lastTime && firstTime !== lastTime
      ? Math.round(
          (new Date(lastTime).getTime() - new Date(firstTime).getTime()) / 1000,
        )
      : 0;

  return { name, date, coordinates, distanceMeters, movingTimeSeconds };
}
