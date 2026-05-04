import type { StyleSpecification, VectorSourceSpecification } from 'maplibre-gl';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { BASEMAP_PM_TILES_URL, BASEMAP_TILEJSON_URL, MAP_STYLE_LANGUAGE } from './map';

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? '';

export function buildContourStyle(shirtColor: 'white' | 'black' = 'white'): StyleSpecification {
  const isDark = shirtColor === 'black';
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
          'background-color': 'rgba(0,0,0,0)',
        },
      },
      // ── 가는 선: nth_line 0, 1, 2 (가장 세밀한 등고선)
      {
        id: 'contour-minor',
        type: 'line',
        source: 'contours',
        'source-layer': 'contour',
        minzoom: 9,
        filter: ['in', ['get', 'nth_line'], ['literal', [0, 1, 2]]],
        paint: {
          'line-color': lineColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 11, 0.8, 13, 1.1, 15, 1.4],
          'line-opacity': 0.9,
        },
      },

      // ── 중간 선: nth_line 5 (5번째 등고선)
      {
        id: 'contour-sub',
        type: 'line',
        source: 'contours',
        'source-layer': 'contour',
        minzoom: 9,
        filter: ['==', ['get', 'nth_line'], 5],
        paint: {
          'line-color': lineColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 11, 0.8, 13, 1.1, 15, 1.4],
          'line-opacity': 0.9,
        },
      },

      // ── 굵은 선: nth_line 10 (10번째 주곡선, 가장 진하게)
      {
        id: 'contour-major',
        type: 'line',
        source: 'contours',
        'source-layer': 'contour',
        minzoom: 9,
        filter: ['==', ['get', 'nth_line'], 10],
        paint: {
          'line-color': lineColorIndex,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 11, 1.8, 13, 2.4, 15, 3.0],
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
    layer.source === 'protomaps' &&  // Protomaps 레이어만 대상 (contour 레이어 제외)
    /(road|street|transport|path|major|minor|highway|bridge|tunnel)/i.test(layer.id)
  );
}

function isCityLabelLayer(layer: any) {
  return layer.type === 'symbol' && String(layer.id || '').toLowerCase() === 'places_locality';
}

export function buildVectorMonochromeStyle(): StyleSpecification {
  const flavor = {
    ...namedFlavor('light'),
    background: 'rgba(0,0,0,0)',
    earth: 'rgba(0,0,0,0)',
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
        const id = nextLayer.id as string;

        const roadMinzoom =
          /high/.test(id)         ? 7
          : /medium/.test(id)     ? 7
          : /low/.test(id)        ? 9
          : /other|path/.test(id) ? 11
          : 7;

        // zoom out할수록 빠르게 얇아짐
        // high는 멀리서도 어느 정도 굵기 유지, low/other는 급격히 얇아짐
        const lineWidth =
          /high/.test(id)
            ? ['interpolate', ['linear'], ['zoom'], 4, 1.6, 8, 2.2, 12, 3.2, 16, 4.4]
            : /medium/.test(id)
            ? ['interpolate', ['linear'], ['zoom'], 7, 1.2, 10, 1.8, 13, 2.6, 16, 3.6]
            : /low/.test(id)
            ? ['interpolate', ['linear'], ['zoom'], 9, 1.0, 12, 1.6, 15, 2.4]
            : ['interpolate', ['linear'], ['zoom'], 11, 1.0, 14, 1.4, 16, 2.0];

        nextLayer.paint = {
          ...(nextLayer.paint || {}),
          'line-color': '#111111',
          'line-width': lineWidth,
          'line-opacity': 0.9,
        };
        nextLayer.minzoom = roadMinzoom;
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