import { useEffect, useMemo, useRef } from 'react';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import maplibregl, {
  GeoJSONSource,
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
import type { Mark } from '../types/mark';

let protocolRegistered = false;

function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

export type RouteColor = 'orange';

export type ActivityMapProps = {
  coordinates: [number, number][];
  className?: string;
  shirtColor?: 'white' | 'black';
  routeColor?: RouteColor;
  showMap?: boolean;
  showRoute?: boolean;
  showRoutePoints?: boolean;
  showContours?: boolean;
  onViewStateChange?: (viewState: FixedMapViewState) => void;
  onMapCanvas?: (canvas: HTMLCanvasElement) => void;
  /**
   * confirm → design 복귀 시 이전 카메라 상태를 주입합니다.
   * 제공되면 fitBounds 대신 이 값으로 jumpTo합니다.
   * 최초 마운트 시 한 번만 적용되며 이후 변경은 무시됩니다.
   */
  initialViewState?: FixedMapViewState | null;
  /** 경로 위에 표시할 마크 목록. showRoutePoints가 true일 때 circle/flag로 표시. */
  marks?: Mark[];
};

type SavedView = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

// ─── 도로 등급 분류 ────────────────────────────────────────────────────────────
// Protomaps 레이어 id 패턴 기준:
//   high   : roads_high      → 고속도로·주요간선 (highway, motorway, trunk, primary)
//   medium : roads_medium    → 일반도로 (secondary, tertiary)
//   low    : roads_low       → 지선도로 (residential, unclassified)
//   other  : roads_other     → 서비스로·보조도로
//   path   : roads_path      → 도보/자전거 전용
type RoadTier = 'high' | 'medium' | 'low' | 'other' | 'path';

function getRoadTier(layerId: string): RoadTier | null {
  if (!/road/.test(layerId)) return null;
  if (/casing/.test(layerId)) return null;  // casing 레이어는 fill과 겹쳐 3선으로 보이므로 제외
  if (/high/.test(layerId))   return 'high';
  if (/medium/.test(layerId)) return 'medium';
  if (/low/.test(layerId))    return 'low';
  if (/path/.test(layerId))   return 'path';
  if (/other/.test(layerId))  return 'other';
  // 패턴 미매칭 road 레이어는 'low'로 fallback
  return 'low';
}

type RoadColors = Record<RoadTier, string>;

function getRoadColors(isDark: boolean): RoadColors {
  const color = isDark ? '#4b4a4a' : '#c0c0c0';
  return { high: color, medium: color, low: color, other: color, path: color };
}

// ─────────────────────────────────────────────────────────────────────────────

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

function getRouteColorValue(_routeColor: RouteColor) {
  return '#F97316';
}

function buildFlagImage(): { img: HTMLImageElement; dpr: number } {
  const dpr = 3;
  const size = 32;
  const img = new Image(size * dpr, size * dpr);
  img.src = '/resources/checkered-flag.svg';
  return { img, dpr };
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
    pixelRatio: 3,
  });
}

function setupMapLayers(
  map: MapLibreMap,
  routeFeature: Feature<LineString>,
  marksFC: FeatureCollection<Point>,
  routeColor: RouteColor,
  shirtColor: 'white' | 'black',
  showMap: boolean,
  showRoute: boolean,
  showRoutePoints: boolean,
  showContours: boolean,
) {
  const routeMainColor = getRouteColorValue(routeColor);
  const isDark = shirtColor === 'black';
  const backgroundColor = showContours ? 'rgba(0,0,0,0)' : isDark ? '#000000' : 'rgba(0,0,0,0)';
  const roadColors = getRoadColors(isDark);
  const waterColor = showContours ? 'rgba(0,0,0,0)' : isDark ? '#7a7a7a' : '#BED6D8';

  map.getCanvas().style.background = 'transparent';

  map.addSource('route', { type: 'geojson', data: routeFeature });
  map.addSource('marks-source', { type: 'geojson', data: marksFC });

  map.addLayer({
    id: 'route-main',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: showRoute ? 'visible' : 'none' },
    paint: { 'line-color': routeMainColor, 'line-width': 5.5, 'line-opacity': 0.98 },
  });

  // Non-destination marks — circle only
  map.addLayer({
    id: 'marks-dots',
    type: 'circle',
    source: 'marks-source',
    filter: ['!=', ['get', 'isDestination'], true],
    layout: { visibility: showRoutePoints ? 'visible' : 'none' },
    paint: {
      'circle-radius': 6.5,
      'circle-color': routeMainColor,
      'circle-stroke-color': '#EDE8DC',
      'circle-stroke-width': 2.2,
      'circle-opacity': 1,
    },
  });

  // Destination marks — checkered flag SVG (pole tip anchored to mark position)
  const { img: flagImg, dpr } = buildFlagImage();
  flagImg.onload = () => {
    if (!map.hasImage('end-pin')) map.addImage('end-pin', flagImg, { pixelRatio: dpr });
    if (!map.getLayer('marks-flag')) {
      map.addLayer({
        id: 'marks-flag',
        type: 'symbol',
        source: 'marks-source',
        filter: ['==', ['get', 'isDestination'], true],
        layout: {
          'icon-image': 'end-pin',
          'icon-anchor': 'bottom-left',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          visibility: showRoutePoints ? 'visible' : 'none',
        },
      });
    }
  };

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
        id === 'marks-dots' ||
        id === 'marks-flag' ||
        id === 'background'
      ) continue;

      if (!showMap) {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }

      const isWater = id.includes('water') && type === 'fill';
      const roadTier = type === 'line' ? getRoadTier(id) : null;

      if (isWater) {
        map.setPaintProperty(id, 'fill-color', waterColor);
        map.setPaintProperty(id, 'fill-opacity', 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else if (roadTier) {
        map.setPaintProperty(id, 'line-color', roadColors[roadTier]);
        map.setPaintProperty(id, 'line-opacity', 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    }
  }
}

// routeColor / showMap / showRoute / showRoutePoints 변경을 맵 재생성 없이 직접 적용
function applyStyleUpdates(
  map: MapLibreMap,
  routeColor: RouteColor,
  shirtColor: 'white' | 'black',
  showMap: boolean,
  showRoute: boolean,
  showRoutePoints: boolean,
  showContours: boolean,
) {
  if (!map.isStyleLoaded()) return;

  const routeMainColor = getRouteColorValue(routeColor);
  const isDark = shirtColor === 'black';
  const backgroundColor = showContours ? 'rgba(0,0,0,0)' : isDark ? '#000000' : 'rgba(0,0,0,0)';
  const roadColors = getRoadColors(isDark);
  const waterColor = showContours ? 'rgba(0,0,0,0)' : isDark ? '#7a7a7a' : '#BED6D8';

  // 루트 선 표시 여부 및 색상
  if (map.getLayer('route-main')) {
    map.setLayoutProperty('route-main', 'visibility', showRoute ? 'visible' : 'none');
    map.setPaintProperty('route-main', 'line-color', routeMainColor);
  }

  // 마크 원 색상
  if (map.getLayer('marks-dots')) {
    map.setPaintProperty('marks-dots', 'circle-color', routeMainColor);
    map.setPaintProperty('marks-dots', 'circle-stroke-color', '#EDE8DC');
  }


  // 배경 레이어
  if (map.getLayer('background')) {
    map.setPaintProperty(
      'background',
      'background-color',
      showContours || !showMap ? 'rgba(0,0,0,0)' : backgroundColor,
    );
  }

  // 마크 표시 여부
  const pointVisibility = showRoutePoints ? 'visible' : 'none';
  if (map.getLayer('marks-dots')) {
    map.setLayoutProperty('marks-dots', 'visibility', pointVisibility);
  }
  if (map.getLayer('marks-flag')) {
    map.setLayoutProperty('marks-flag', 'visibility', pointVisibility);
  }

  // 지도 레이어 표시 여부 (showContours 모드에서는 건드리지 않음)
  if (!showContours) {
    for (const layer of map.getStyle().layers ?? []) {
      const { id, type } = layer;
      if (
        id === 'route-main' ||
        id === 'marks-dots' ||
        id === 'marks-flag' ||
        id === 'background'
      ) continue;

      if (!showMap) {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }

      const isWater = id.includes('water') && type === 'fill';
      const roadTier = type === 'line' ? getRoadTier(id) : null;

      if (isWater) {
        map.setPaintProperty(id, 'fill-color', waterColor);
        map.setPaintProperty(id, 'fill-opacity', 1);
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else if (roadTier) {
        map.setPaintProperty(id, 'line-color', roadColors[roadTier]);
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
  routeColor = 'orange',
  showMap = true,
  showRoute = true,
  showRoutePoints = false,
  showContours = false,
  onViewStateChange,
  onMapCanvas,
  initialViewState = null,
  marks,
}: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // 카메라 상태 보존: coordinates가 바뀔 때만 초기화, 나머지는 항상 유지
  const preservedViewRef = useRef<SavedView | null>(null);
  const lastCoordinatesRef = useRef<typeof coordinates | null>(null);

  // confirm → design 복귀 시 외부에서 주입된 초기 카메라 상태.
  // 최초 마운트 시 한 번만 preservedViewRef에 적용하고 이후 prop 변경은 무시.
  const initialViewStateRef = useRef<FixedMapViewState | null>(initialViewState);

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

  const marksFeatures = useMemo<FeatureCollection<Point>>(() => {
    if (!marks || coordinates.length < 2) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: marks.map((mark) => {
        const idx = Math.max(0, Math.min(
          Math.round(mark.position * (coordinates.length - 1)),
          coordinates.length - 1,
        ));
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: coordinates[idx] },
          properties: { markId: mark.id, markName: mark.name, isDestination: mark.isDestination },
        };
      }),
    };
  }, [marks, coordinates]);

  const marksFeaturesRef = useRef(marksFeatures);
  useEffect(() => { marksFeaturesRef.current = marksFeatures; }, [marksFeatures]);

  // ─── Effect 1: 맵 재생성 ───────────────────────────────────────────────────
  // coordinates / shirtColor / showContours 변경 시에만 실행.
  // routeColor / showMap / showRoutePoints / 콜백은 의존성에서 제거.
  useEffect(() => {
    if (!containerRef.current || coordinates.length < 2) return;
    console.log('[Effect1 triggered]', {
      coordinates: coordinates.length,
      routeFeature,
      shirtColor,
      showContours,
    });
    // 새 route → 저장된 뷰 초기화 (fitBounds 재실행)
    if (lastCoordinatesRef.current !== coordinates) {
      lastCoordinatesRef.current = coordinates;
      preservedViewRef.current = null;
    }

    // confirm → design 복귀 시 주입된 초기 카메라 상태를 preservedViewRef에 반영.
    // 한 번만 소비하고 이후에는 null로 초기화해 일반 흐름으로 복귀.
    if (initialViewStateRef.current && !preservedViewRef.current) {
      const iv = initialViewStateRef.current;
      preservedViewRef.current = {
        center: iv.center,
        zoom: iv.zoom,
        bearing: iv.bearing,
        pitch: iv.pitch,
      };
      initialViewStateRef.current = null;
    }

    const viewToRestore = preservedViewRef.current;

    const map = createMap(containerRef.current, showContours, shirtColor);
    mapRef.current = map;

    map.on('load', () => {
      setupMapLayers(
        map,
        routeFeature,
        marksFeaturesRef.current,
        routeColor,
        shirtColor,
        showMap,
        showRoute,
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
  }, [coordinates, routeFeature, shirtColor, showContours]);
  //  ^ shirtColor/showContours는 맵 스타일 자체를 바꾸므로 재생성 필요.
  //    routeColor/showMap/showRoutePoints는 Effect 2에서, pointFeatures는 Effect 3에서 처리.

  // ─── Effect 2: 스타일만 업데이트 (맵 재생성 없음) ─────────────────────────
  // routeColor / showMap / showRoutePoints 변경 시 setPaintProperty 등으로 직접 적용.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const emitAfterIdle = () => {
      // setPaintProperty는 즉시 WebGL에 반영되지 않으므로
      // idle 이벤트(렌더 완료)를 기다린 후 canvas 캡처
      map.once('idle', () => {
        if (mapRef.current !== map) return;
        onViewStateChangeRef.current?.(readFixedMapViewState(map));
        onMapCanvasRef.current?.(map.getCanvas());
      });
    };

    // 스타일이 아직 로드되지 않은 경우 idle 이후 적용
    if (!map.isStyleLoaded()) {
      const onIdle = () => {
        applyStyleUpdates(map, routeColor, shirtColor, showMap, showRoute, showRoutePoints, showContours);
        emitAfterIdle();
      };
      map.once('idle', onIdle);
      return () => { map.off('idle', onIdle); };
    }

    applyStyleUpdates(map, routeColor, shirtColor, showMap, showRoute, showRoutePoints, showContours);
    emitAfterIdle();
  }, [routeColor, showMap, showRoute, showRoutePoints, showContours, shirtColor]);

  // ─── Effect 3: marks 위치/상태 업데이트 (맵 재생성 없음) ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    (map.getSource('marks-source') as GeoJSONSource | undefined)?.setData(marksFeatures);
    // marks 변경 후 canvas 스냅샷 갱신 — 변경 전 스냅샷이 Confirm 페이지에 전달되는 것을 방지
    map.once('idle', () => {
      if (mapRef.current !== map) return;
      onMapCanvasRef.current?.(map.getCanvas());
    });
  }, [marksFeatures]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        margin: '0 auto',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        <div
          ref={containerRef}
          style={{ position: 'relative', width: '100%', height: '100%', background: 'transparent' }}
        />
      </div>

      {/* Desktop-only rotation buttons */}
      <div data-no-capture className="absolute bottom-2 right-2 hidden gap-1 md:flex">
        {[{ label: '↻', delta: -15 }, { label: '↺', delta: 15 }].map(({ label, delta }) => (
          <button
            key={delta}
            type="button"
            aria-label={delta < 0 ? 'Rotate left' : 'Rotate right'}
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              map.easeTo({ bearing: map.getBearing() + delta, duration: 200 });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-base text-neutral-700 shadow backdrop-blur-sm transition hover:bg-white"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}