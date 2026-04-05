export type ActivitySummary = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
};

export type ActivityDetail = ActivitySummary & {
  description?: string;
  elapsed_time?: number;
  total_elevation_gain?: number;
  type?: string;
};

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function formatDistanceKm(distanceMeters: number) {
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

export function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)}분`;
}
