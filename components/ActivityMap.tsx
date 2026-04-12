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
  onMapCanvas?: (canvas: HTMLCanvasElement) => void;
};

type SavedView = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
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
  const lngPad = Math.max((maxLng - minLng) * 0.04, 0.0015);
  const latPad = Math.max((maxLat - minLat) * 0.04, 0.0015);
  return [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];
}

function getRouteColorValue(routeColor: RouteColor) {
  return routeColor === 'orange' ? '#F97316' : '#CF291D';
}

function createMap(
  container: HTMLElement,
  showContours: boolean,
  shirtColor: 'white' | 'black',
): MapLibreMap {
  if (!showContours) assertBasemapSource();
  ensurePmtilesProtocol();
  return new maplibregl.Map({
    container,
    style: showContours ? buildContourStyle(shirtColor) : buildVectorMonochromeStyle(),
    attributionControl: false,
    dragRotate: false,
    touchPitch: false,
    pitchWithRotate: false,
    interactive: true,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });
}

function setupMapLayers(
  map: MapLibreMap,
  routeFeature: Feature<LineString>,
  pointFeatures: FeatureCollection<Point>,
  routeColor: RouteColor,
  shirtColor: 'white' | 'black',
  showMap: boolean,
  showRoutePoints: boolean,
  showContours: boolean,
) {
  const routeMainColor = getRouteColorValue(routeColor);
  const isDark = shirtColor === 'black';
  const backgroundColor = showContours ? 'rgba(0,0,0,0)' : isDark ? '#4b4a4a' : '#ffffff';
  const roadColor = showContours
    ? isDark ? '#2f2f2f' : '#bdbdbd'
    : isDark ? '#000000' : '#bdbdbd';
  const waterColor = showContours ? 'rgba(0,0,0,0)' : '#bdbdbd';

  map.getCanvas().style.background = 'transparent';

  map.addSource('route', { type: 'geojson', data: routeFeature });
  map.addSource('route-points', { type: 'geojson', data: pointFeatures });

  map.addLayer({
    id: 'route-main',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': routeMainColor, 'line-width': 5.5, 'line-opacity': 0.98 },
  });

  map.addLayer({
    id: 'route-start-point',
    type: 'circle',
    source: 'route-points',
    filter: ['==', ['get', 'pointType'], 'start'],
    layout: { visibility: showRoutePoints ? 'visible' : 'none' },
    paint: {
      'circle-radius': 6.5,
      'circle-color': routeMainColor,
      'circle-stroke-color': '#EDE8DC',
      'circle-stroke-width': 2.2,
      'circle-opacity': 1,
    },
  });

  // End pin (flag icon)
  const dpr = window.devicePixelRatio || 1;
  const pinW = Math.round(27 * dpr);
  const pinH = Math.round(16 * dpr);
  const pinSvg = `<svg width="${pinW}" height="${pinH}" viewBox="0 0 30 18" xmlns="http://www.w3.org/2000/svg">
    <rect x="0"  y="0" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="12" y="0" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="24" y="0" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="6"  y="6" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="18" y="6" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="0"  y="12" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="12" y="12" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="24" y="12" width="6" height="6" fill="${routeMainColor}"/>
  </svg>`;
  const pinUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg)}`;
  const pinImg = new Image(pinW, pinH);
  pinImg.onload = () => {
    if (!map.hasImage('end-pin')) map.addImage('end-pin', pinImg, { pixelRatio: dpr });
    if (!map.getLayer('route-end-point')) {
      map.addLayer({
        id: 'route-end-point',
        type: 'symbol',
        source: 'route-points',
        filter: ['==', ['get', 'pointType'], 'end'],
        layout: {
          'icon-image': 'end-pin',
          'icon-anchor': 'bottom',
          'icon-offset': [6, -8],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          visibility: showRoutePoints ? 'visible' : 'none',
        },
      });
    }
  };
  pinImg.src = pinUrl;

  if (map.getLayer('background')) {
    map.setPaintProperty(
      'background',
      'background-color',
      showContours || !showMap ? 'rgba(0,0,0,0)' : backgroundColor,
    );
  }

  if (!showContours) {
    for (const layer of map.getStyle().layers ?? []) {
      const { id, type } = layer;
      if (
        id === 'route-main' ||
        id === 'route-start-point' ||
        id === 'route-end-point' ||
        id === 'background'
      ) continue;

      if (!showMap) {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }

      const isWater = id.includes('water') && type === 'fill';
      const isRoad = id.includes('road') && type === 'line';

      if (isWater) {
        map.setPaintProperty(id, 'fill-color', waterColor);
        map.setPaintProperty(id, 'fill-opacity', isDark ? 0 : 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else if (isRoad) {
        map.setPaintProperty(id, 'line-color', roadColor);
        map.setPaintProperty(id, 'line-opacity', 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    }
  }
}

// routeColor / showMap / showRoutePoints 변경을 맵 재생성 없이 직접 적용
function applyStyleUpdates(
  map: MapLibreMap,
  routeColor: RouteColor,
  shirtColor: 'white' | 'black',
  showMap: boolean,
  showRoutePoints: boolean,
  showContours: boolean,
) {
  if (!map.isStyleLoaded()) return;

  const routeMainColor = getRouteColorValue(routeColor);
  const isDark = shirtColor === 'black';
  const backgroundColor = showContours ? 'rgba(0,0,0,0)' : isDark ? '#4b4a4a' : '#ffffff';
  const roadColor = showContours
    ? isDark ? '#2f2f2f' : '#bdbdbd'
    : isDark ? '#000000' : '#bdbdbd';
  const waterColor = showContours ? 'rgba(0,0,0,0)' : '#bdbdbd';

  // 루트 색상
  if (map.getLayer('route-main')) {
    map.setPaintProperty('route-main', 'line-color', routeMainColor);
  }
  if (map.getLayer('route-start-point')) {
    map.setPaintProperty('route-start-point', 'circle-color', routeMainColor);
  }

  // end-pin은 SVG 비트맵 이미지라 setPaintProperty로 색상 변경 불가 → 이미지 교체
  const dpr = window.devicePixelRatio || 1;
  const pinW = Math.round(27 * dpr);
  const pinH = Math.round(16 * dpr);
  const pinSvg = `<svg width="${pinW}" height="${pinH}" viewBox="0 0 30 18" xmlns="http://www.w3.org/2000/svg">
    <rect x="0"  y="0" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="12" y="0" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="24" y="0" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="6"  y="6" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="18" y="6" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="0"  y="12" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="12" y="12" width="6" height="6" fill="${routeMainColor}"/>
    <rect x="24" y="12" width="6" height="6" fill="${routeMainColor}"/>
  </svg>`;
  const pinUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg)}`;
  const pinImg = new Image(pinW, pinH);
  pinImg.onload = () => {
    if (map.hasImage('end-pin')) map.removeImage('end-pin');
    map.addImage('end-pin', pinImg, { pixelRatio: dpr });
  };
  pinImg.src = pinUrl;

  // 루트 포인트 표시 여부
  const pointVisibility = showRoutePoints ? 'visible' : 'none';
  if (map.getLayer('route-start-point')) {
    map.setLayoutProperty('route-start-point', 'visibility', pointVisibility);
  }
  if (map.getLayer('route-end-point')) {
    map.setLayoutProperty('route-end-point', 'visibility', pointVisibility);
  }

  // 배경 레이어
  if (map.getLayer('background')) {
    map.setPaintProperty(
      'background',
      'background-color',
      showContours || !showMap ? 'rgba(0,0,0,0)' : backgroundColor,
    );
  }

  // 지도 레이어 표시 여부 (showContours 모드에서는 건드리지 않음)
  if (!showContours) {
    for (const layer of map.getStyle().layers ?? []) {
      const { id, type } = layer;
      if (
        id === 'route-main' ||
        id === 'route-start-point' ||
        id === 'route-end-point' ||
        id === 'background'
      ) continue;

      if (!showMap) {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }

      const isWater = id.includes('water') && type === 'fill';
      const isRoad = id.includes('road') && type === 'line';

      if (isWater) {
        map.setPaintProperty(id, 'fill-color', waterColor);
        map.setPaintProperty(id, 'fill-opacity', isDark ? 0 : 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else if (isRoad) {
        map.setPaintProperty(id, 'line-color', roadColor);
        map.setPaintProperty(id, 'line-opacity', 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    }
  }
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

  // 카메라 상태 보존: coordinates가 바뀔 때만 초기화, 나머지는 항상 유지
  const preservedViewRef = useRef<SavedView | null>(null);
  const lastCoordinatesRef = useRef<typeof coordinates | null>(null);

  // 콜백을 ref로 안정화 — 부모 리렌더링으로 참조가 바뀌어도 맵 재생성 방지
  const onViewStateChangeRef = useRef(onViewStateChange);
  const onMapCanvasRef = useRef(onMapCanvas);
  useEffect(() => { onViewStateChangeRef.current = onViewStateChange; }, [onViewStateChange]);
  useEffect(() => { onMapCanvasRef.current = onMapCanvas; }, [onMapCanvas]);

  const routeFeature = useMemo<Feature<LineString>>(
    () => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: {},
    }),
    [coordinates],
  );

  const pointFeatures = useMemo<FeatureCollection<Point>>(() => {
    if (coordinates.length < 2) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coordinates[0] },
          properties: { pointType: 'start' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coordinates[coordinates.length - 1] },
          properties: { pointType: 'end' },
        },
      ],
    };
  }, [coordinates]);

  // ─── Effect 1: 맵 재생성 ───────────────────────────────────────────────────
  // coordinates / shirtColor / showContours 변경 시에만 실행.
  // routeColor / showMap / showRoutePoints / 콜백은 의존성에서 제거.
  useEffect(() => {
    if (!containerRef.current || coordinates.length < 2) return;
    console.log('[Effect1 triggered]', {
      coordinates: coordinates.length,
      routeFeature,
      pointFeatures,
      shirtColor,
      showContours,
    });
    // 새 route → 저장된 뷰 초기화 (fitBounds 재실행)
    if (lastCoordinatesRef.current !== coordinates) {
      lastCoordinatesRef.current = coordinates;
      preservedViewRef.current = null;
    }

    const viewToRestore = preservedViewRef.current;

    const map = createMap(containerRef.current, showContours, shirtColor);
    mapRef.current = map;

    map.on('load', () => {
      setupMapLayers(
        map,
        routeFeature,
        pointFeatures,
        routeColor,
        shirtColor,
        showMap,
        showRoutePoints,
        showContours,
      );

      if (viewToRestore) {
        // 설정 변경으로 맵이 재생성된 경우 — 이전 카메라 위치 복원
        map.jumpTo({
          center: viewToRestore.center,
          zoom: viewToRestore.zoom,
          bearing: viewToRestore.bearing,
          pitch: viewToRestore.pitch,
        });
      } else {
        // 새 route — 경로에 맞게 뷰 초기화
        map.fitBounds(getBounds(coordinates), {
          padding: { top: 20, bottom: 20, left: 16, right: 16 },
          duration: 0,
          maxZoom: showContours ? 15 : 17,
        });
      }

      map.resize();

      const saveAndEmit = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (mapRef.current !== map) return; // stale 맵 방어
            const c = map.getCenter();
            preservedViewRef.current = {
              center: [c.lng, c.lat],
              zoom: map.getZoom(),
              bearing: map.getBearing(),
              pitch: map.getPitch(),
            };
            onViewStateChangeRef.current?.(readFixedMapViewState(map));
            onMapCanvasRef.current?.(map.getCanvas());
          });
        });
      };

      map.once('idle', saveAndEmit);
      map.on('moveend', saveAndEmit);
      map.on('zoomend', saveAndEmit);
      map.on('rotateend', saveAndEmit);
      map.on('pitchend', saveAndEmit);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, routeFeature, pointFeatures, shirtColor, showContours]);
  //  ^ shirtColor/showContours는 맵 스타일 자체를 바꾸므로 재생성 필요.
  //    routeColor/showMap/showRoutePoints는 아래 Effect 2에서 처리.

  // ─── Effect 2: 스타일만 업데이트 (맵 재생성 없음) ─────────────────────────
  // routeColor / showMap / showRoutePoints 변경 시 setPaintProperty 등으로 직접 적용.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 스타일이 아직 로드되지 않은 경우 idle 이후 적용
    if (!map.isStyleLoaded()) {
      const onIdle = () => {
        applyStyleUpdates(map, routeColor, shirtColor, showMap, showRoutePoints, showContours);
        // 스타일 적용 후 canvas 갱신
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (mapRef.current !== map) return;
            onViewStateChangeRef.current?.(readFixedMapViewState(map));
            onMapCanvasRef.current?.(map.getCanvas());
          });
        });
      };
      map.once('idle', onIdle);
      return () => { map.off('idle', onIdle); };
    }

    applyStyleUpdates(map, routeColor, shirtColor, showMap, showRoutePoints, showContours);
    // 스타일 적용 후 canvas 갱신
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (mapRef.current !== map) return;
        onViewStateChangeRef.current?.(readFixedMapViewState(map));
        onMapCanvasRef.current?.(map.getCanvas());
      });
    });
  }, [routeColor, showMap, showRoutePoints, showContours, shirtColor]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: '300px',
        aspectRatio: '3 / 4',
        overflow: 'hidden',
        margin: '0 auto',
        background: (showContours || !showMap)
          ? 'transparent'
          : shirtColor === 'black' ? '#000' : '#fff',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: (showContours || !showMap) ? 'transparent' : undefined,
        }}
      >
        <div
          ref={containerRef}
          style={{ position: 'relative', width: '100%', height: '100%', background: 'transparent' }}
        />
      </div>
    </div>
  );
}