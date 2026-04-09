export type GpxData = {
  name: string;
  date: string;                       // "M/D/YYYY" format
  coordinates: [number, number][];    // [lon, lat] pairs (MapLibre order)
  distanceMeters: number;
  movingTimeSeconds: number;
};
