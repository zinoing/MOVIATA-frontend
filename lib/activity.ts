export type ActivitySummary = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  total_elevation_gain?: number;
};

export type ActivityDetail = ActivitySummary & {
  description?: string;
  elapsed_time?: number;
  elev_high?: number;
  total_elevation_gain?: number;
  type?: string;
};

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function formatDistanceKm(distanceMeters: number) {
  return `${(distanceMeters / 1000).toFixed(2)}`;
}

export function formatMinutes(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}'`;
}
