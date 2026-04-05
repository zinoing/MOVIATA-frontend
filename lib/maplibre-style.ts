import type { StyleSpecification, VectorSourceSpecification } from 'maplibre-gl';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { BASEMAP_PM_TILES_URL, BASEMAP_TILEJSON_URL, MAP_STYLE_LANGUAGE } from './map';

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? '';

export function buildContourStyle(shirtColor: 'white' | 'black' = 'white'): StyleSpecification {
  const isDark = shirtColor === 'black';
  const background = isDark ? '#0d0d0d' : '#ffffff';
  const lineColor = isDark ? '#ffffff' : '#1a1a1a';
  const lineColorIndex = isDark ? '#ffffff' : '#000000';

  return {
    version: 8,
    sources: {
      contours: {
        type: 'vector',
        url: `https://api.maptiler.com/tiles/contours-v2/tiles.json?key=${MAPTILER_API_KEY}`,
        attribution: '<a href="https://www.maptiler.com/copyright/">© MapTiler</a>',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': background,
        },
      },
      {
        id: 'contour-line',
        type: 'line',
        source: 'contours',
        'source-layer': 'contour',
        minzoom: 9,
        filter: ['!=', ['get', 'nth_line'], 10],
        paint: {
          'line-color': lineColor,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0.5,
            11, 0.8,
            13, 1.1,
            15, 1.4,
          ],
          'line-opacity': 0.9,
        },
      },
      {
        id: 'contour-line-index',
        type: 'line',
        source: 'contours',
        'source-layer': 'contour',
        minzoom: 9,
        filter: ['==', ['get', 'nth_line'], 10],
        paint: {
          'line-color': lineColorIndex,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 1.2,
            11, 1.8,
            13, 2.4,
            15, 3.0,
          ],
          'line-opacity': 1,
        },
      },
    ],
  };
}

function buildSource(): VectorSourceSpecification {
  if (BASEMAP_TILEJSON_URL) {
    return {
      type: 'vector',
      url: BASEMAP_TILEJSON_URL,
      attribution:
        '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    };
  }

  if (!BASEMAP_PM_TILES_URL) {
    throw new Error('Missing basemap URL.');
  }

  return {
    type: 'vector',
    url: `pmtiles://${BASEMAP_PM_TILES_URL}`,
    attribution:
      '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}

function shouldDarkenRoad(layer: any) {
  return (
    layer.type === 'line' &&
    /(road|street|transport|path|major|minor|highway|bridge|tunnel)/i.test(layer.id)
  );
}

function isCityLabelLayer(layer: any) {
  return layer.type === 'symbol' && String(layer.id || '').toLowerCase() === 'places_locality';
}

export function buildVectorMonochromeStyle(): StyleSpecification {
  const flavor = {
    ...namedFlavor('light'),
    background: '#f4f4f1',
    earth: '#f4f4f1',
    park_a: '#eceee8',
    park_b: '#eceee8',
    water: '#e9ece8',
    buildings: '#e1e1dc',
  } as any;

  const baseLayers = layers('protomaps', flavor, { lang: MAP_STYLE_LANGUAGE }) as any[];

  const customizedLayers = baseLayers
    .filter((layer) => layer.type !== 'symbol' || isCityLabelLayer(layer))
    .map((layer) => {
      const nextLayer: any = {
        ...layer,
        ...(layer.layout ? { layout: { ...layer.layout } } : {}),
        ...(layer.paint ? { paint: { ...layer.paint } } : {}),
      };

      if (shouldDarkenRoad(nextLayer)) {
        nextLayer.paint = {
          ...(nextLayer.paint || {}),
          'line-color': '#111111',
          'line-opacity': 0.9,
        };
      }

      return nextLayer;
    });

  return {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
    sources: {
      protomaps: buildSource(),
    },
    layers: customizedLayers,
  };
}