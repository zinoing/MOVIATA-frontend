import { useEffect, useMemo, useRef } from 'react';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import maplibregl, {
  LngLatBoundsLike,
  Map as MapLibreMap,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { assertBasemapSource } from '../lib/map';
import {
  buildVectorMonochromeStyle,
  buildContourStyle,
} from '../lib/maplibre-style';
import type { FixedMapViewState } from '../lib/poster/types';

let protocolRegistered = false;

function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

export type RouteColor = 'red' | 'orange';

export type ActivityMapProps = {
  coordinates: [number, number][];
  className?: string;
  shirtColor?: 'white' | 'black';
  routeColor?: RouteColor;
  showMap?: boolean;
  showRoutePoints?: boolean;
  showContours?: boolean;
  onViewStateChange?: (viewState: FixedMapViewState) => void;
  /** Called whenever the map finishes rendering (idle + after any camera change).
   *  Because preserveDrawingBuffer is true, the canvas is safe to read immediately. */
  onMapCanvas?: (canvas: HTMLCanvasElement) => void;
};

function readFixedMapViewState(map: maplibregl.Map): FixedMapViewState {
  const center = map.getCenter();
  const bounds = map.getBounds();

  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    bounds: {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    },
    width: map.getContainer().clientWidth,
    height: map.getContainer().clientHeight,
  };
}

function getBounds(coordinates: [number, number][]): LngLatBoundsLike {
  let minLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLng = coordinates[0][0];
  let maxLat = coordinates[0][1];

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  const lngPadding = Math.max((maxLng - minLng) * 0.04, 0.0015);
  const latPadding = Math.max((maxLat - minLat) * 0.04, 0.0015);

  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding],
  ];
}

function getRouteColorValue(routeColor: RouteColor) {
  return routeColor === 'orange' ? '#F97316' : '#CF291D';
}


export default function ActivityMap({
  coordinates,
  className,
  shirtColor = 'white',
  routeColor = 'red',
  showMap = true,
  showRoutePoints = false,
  showContours = false,
  onViewStateChange,
  onMapCanvas,
}: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const routeFeature = useMemo<Feature<LineString>>(
    () => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {},
    }),
    [coordinates],
  );

  const pointFeatures = useMemo<FeatureCollection<Point>>(() => {
    if (coordinates.length < 2) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coordinates[0],
          },
          properties: {
            pointType: 'start',
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coordinates[coordinates.length - 1],
          },
          properties: {
            pointType: 'end',
          },
        },
      ],
    };
  }, [coordinates]);

  useEffect(() => {
    if (!containerRef.current || coordinates.length < 2) return;

    if (!showContours) {
      assertBasemapSource();
    }
    ensurePmtilesProtocol();

    const isDark = shirtColor === 'black';
    const backgroundColor = showContours
      ? 'rgba(0,0,0,0)'
      : isDark
        ? '#A9A6A6'
        : '#ffffff';

    const roadColor = showContours
      ? isDark
        ? '#2f2f2f'
        : '#d3d2d2'
      : isDark
        ? '#000000'
        : '#d3d2d2';

    const waterColor = showContours ? 'rgba(0,0,0,0)' : '#d0d0d0';

    const routeMainColor = getRouteColorValue(routeColor);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: showContours
        ? buildContourStyle(shirtColor)
        : buildVectorMonochromeStyle(),
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      interactive: true,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });
    mapRef.current = map;

    map.on('load', () => {
      map.getCanvas().style.background = 'transparent';

      map.addSource('route', {
        type: 'geojson',
        data: routeFeature,
      });

      map.addSource('route-points', {
        type: 'geojson',
        data: pointFeatures,
      });

      if (isDark && !showContours) {
        map.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 9,
            'line-opacity': 0.98,
          },
        });
      }

      map.addLayer({
        id: 'route-main',
        type: 'line',
        source: 'route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': routeMainColor,
          'line-width': 5.5,
          'line-opacity': 0.98,
        },
      });

      map.addLayer({
        id: 'route-start-point',
        type: 'circle',
        source: 'route-points',
        filter: ['==', ['get', 'pointType'], 'start'],
        layout: {
          visibility: showRoutePoints ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 6.5,
          'circle-color': routeMainColor,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.2,
          'circle-opacity': 1,
        },
      });

      const endPinSvg = `<svg width="26" height="26" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 4C21.5 4 13 12.5 13 23c0 14.4 15.6 31.8 18 34.4a1.4 1.4 0 0 0 2 0C35.4 54.8 51 37.4 51 23 51 12.5 42.5 4 32 4Z" fill="${routeMainColor}"/>
        <circle cx="32" cy="23" r="11" fill="white"/>
      </svg>`;
      const endPinUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(endPinSvg)}`;
      const pinImg = new Image(26, 26);
      pinImg.onload = () => {
        if (!map.hasImage('end-pin')) map.addImage('end-pin', pinImg);
        if (!map.getLayer('route-end-point')) {
          map.addLayer({
            id: 'route-end-point',
            type: 'symbol',
            source: 'route-points',
            filter: ['==', ['get', 'pointType'], 'end'],
            layout: {
              'icon-image': 'end-pin',
              'icon-anchor': 'bottom',
              'icon-offset': [0, -6],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              visibility: showRoutePoints ? 'visible' : 'none',
            },
          });
        }
      };
      pinImg.src = endPinUrl;

      if (map.getLayer('background')) {
        map.setPaintProperty(
          'background',
          'background-color',
          showContours || !showMap ? 'rgba(0,0,0,0)' : backgroundColor,
        );
      }

      map.fitBounds(getBounds(coordinates), {
        padding: {
          top: 20,
          bottom: 20,
          left: 16,
          right: 16,
        },
        duration: 0,
        maxZoom: showContours ? 15 : 17,
      });

      map.resize();

      if (showContours) return;

      for (const layer of map.getStyle().layers ?? []) {
        const { id, type } = layer;
        const isRouteLayer =
          id === 'route-outline' ||
          id === 'route-main' ||
          id === 'route-start-point' ||
          id === 'route-end-point';
        const isBackgroundLayer = id === 'background';

        if (isRouteLayer || isBackgroundLayer) continue;

        // Map hidden: only route and background remain
        if (!showMap) {
          map.setLayoutProperty(id, 'visibility', 'none');
          continue;
        }

        const isWaterLayer = id.includes('water') && type === 'fill';
        const isRoadLayer = id.includes('road') && type === 'line';

        if (isWaterLayer) {
          map.setPaintProperty(id, 'fill-color', waterColor);
          map.setPaintProperty(id, 'fill-opacity', isDark ? 0 : 1);
          map.setLayoutProperty(id, 'visibility', 'visible');
          continue;
        }

        if (isRoadLayer) {
          map.setPaintProperty(id, 'line-color', roadColor);
          map.setPaintProperty(id, 'line-opacity', 1);
          map.setLayoutProperty(id, 'visibility', 'visible');
          continue;
        }

        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [
    coordinates,
    pointFeatures,
    routeFeature,
    routeColor,
    shirtColor,
    showMap,
    showRoutePoints,
    showContours,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (!onViewStateChange && !onMapCanvas)) return;

    // Emit after two rAF ticks so the WebGL frame is committed to the canvas
    // before we call toDataURL(). Without this, 'idle' fires when tile loading
    // is done but the GPU hasn't drawn the frame yet — causing a blank snapshot
    // on mobile where rendering is slower.
    const emitAfterFrame = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (onMapCanvas) {
            const canvas = map.getCanvas();
            // 캔버스 픽셀 샘플링 - 비어있는지 확인
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
            // WebGL이라 2d context는 못 읽지만 dataUrl 길이로 확인
            const dataUrl = canvas.toDataURL('image/png');
            onMapCanvas(canvas);
          }
        });
      });
    };

    map.once('idle', emitAfterFrame);
    map.on('moveend', emitAfterFrame);
    map.on('zoomend', emitAfterFrame);
    map.on('rotateend', emitAfterFrame);
    map.on('pitchend', emitAfterFrame);

    return () => {
      map.off('moveend', emitAfterFrame);
      map.off('zoomend', emitAfterFrame);
      map.off('rotateend', emitAfterFrame);
      map.off('pitchend', emitAfterFrame);
    };
  }, [
    onViewStateChange,
    onMapCanvas,
    coordinates,
    shirtColor,
    routeColor,
    showRoutePoints,
    showContours,
  ]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: '300px',
        aspectRatio: '3 / 4',
        overflow: 'hidden',
        margin: '0 auto',
        background: (showContours || !showMap) ? 'transparent' : shirtColor === 'black' ? '#000' : '#fff',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: (showContours || !showMap) ? 'transparent' : undefined,
        }}
      >
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
}
