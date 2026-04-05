import type { StyleSpecification } from 'maplibre-gl';

export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? '';
export const MAP_STYLE_LANGUAGE = process.env.NEXT_PUBLIC_MAP_LANGUAGE ?? 'en';
export const BASEMAP_TILEJSON_URL = process.env.NEXT_PUBLIC_PROTOMAPS_TILEJSON_URL ?? '';
export const BASEMAP_PM_TILES_URL = process.env.NEXT_PUBLIC_BASEMAP_PM_TILES_URL ?? '';

const defaultRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-light-layer',
      type: 'raster',
      source: 'carto-light',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export function getMapStyle(): string | StyleSpecification {
  return MAP_STYLE_URL || defaultRasterStyle;
}

export function isVectorStyleConfigured() {
  return Boolean(MAP_STYLE_URL);
}

export function assertBasemapSource() {
  if (!BASEMAP_TILEJSON_URL && !BASEMAP_PM_TILES_URL) {
    throw new Error(
      'Set NEXT_PUBLIC_PROTOMAPS_TILEJSON_URL or NEXT_PUBLIC_BASEMAP_PM_TILES_URL in frontend/.env.local.'
    );
  }
}