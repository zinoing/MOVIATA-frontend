export type LngLat = [number, number];
export type Bounds = [[number, number], [number, number]];

function getDistanceMeters(a: LngLat, b: LngLat): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);

  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function dedupeCoordinates(coords: LngLat[]): LngLat[] {
  if (coords.length === 0) return [];

  const result: LngLat[] = [coords[0]];

  for (let i = 1; i < coords.length; i += 1) {
    const prev = result[result.length - 1];
    const curr = coords[i];

    if (prev[0] !== curr[0] || prev[1] !== curr[1]) {
      result.push(curr);
    }
  }

  return result;
}

function splitOnLargeJumps(
  coords: LngLat[],
  maxJumpMeters = 120
): LngLat[][] {
  if (coords.length < 2) return coords.length ? [coords] : [];

  const segments: LngLat[][] = [];
  let current: LngLat[] = [coords[0]];

  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const gap = getDistanceMeters(prev, curr);

    if (gap > maxJumpMeters) {
      if (current.length > 1) segments.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }

  if (current.length > 1) segments.push(current);

  return segments;
}

function getSegmentLengthMeters(segment: LngLat[]): number {
  let total = 0;

  for (let i = 1; i < segment.length; i += 1) {
    total += getDistanceMeters(segment[i - 1], segment[i]);
  }

  return total;
}

export function getPrimaryRoute(coords: LngLat[]): LngLat[] {
  const cleaned = dedupeCoordinates(coords);
  const segments = splitOnLargeJumps(cleaned, 120);

  if (segments.length === 0) return cleaned;

  return segments.sort(
    (a, b) => getSegmentLengthMeters(b) - getSegmentLengthMeters(a)
  )[0];
}

/**
 * Moving-average smoothing to reduce GPS noise.
 * Replaces each point with the average of its neighbors within `radius`.
 * Endpoints are preserved exactly.
 */
function movingAverage(coords: LngLat[], radius = 5): LngLat[] {
  if (coords.length < 3) return coords;
  const result: LngLat[] = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(coords.length - 1, i + radius);
    let sumX = 0, sumY = 0;
    for (let j = lo; j <= hi; j++) {
      sumX += coords[j][0];
      sumY += coords[j][1];
    }
    const count = hi - lo + 1;
    result.push([sumX / count, sumY / count]);
  }
  result.push(coords[coords.length - 1]);
  return result;
}

/**
 * Chaikin's corner-cutting algorithm.
 * Each iteration replaces every segment with two new points at 25% and 75%.
 * Endpoints are preserved exactly.
 */
function chaikin(coords: LngLat[], iterations = 3): LngLat[] {
  if (coords.length < 3) return coords;
  let pts = coords;
  for (let iter = 0; iter < iterations; iter++) {
    const next: LngLat[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]);
      next.push([0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

/**
 * Full smoothing pipeline:
 *   1. Moving average  — removes GPS noise / micro-jitter
 *   2. Chaikin ×5     — rounds corners into smooth curves
 */
export function smoothRoute(coords: LngLat[]): LngLat[] {
  if (coords.length < 3) return coords;
  return chaikin(movingAverage(coords, 3), 2);

}

export function decodePolyline(encoded: string): LngLat[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LngLat[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

export function getBounds(coords: LngLat[]): Bounds {
  if (!coords.length) {
    throw new Error('Cannot calculate bounds from an empty coordinate array.');
  }

  let minLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLng = coords[0][0];
  let maxLat = coords[0][1];

  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
