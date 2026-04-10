import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import { apiFetch, API_BASE_URL } from '../../lib/api';
import {
  ActivitySummary,
  formatDateTime,
  formatDistanceKm,
  formatMinutes,
} from '../../lib/activity';

type PageState = 'loading' | 'ready' | 'notConnected' | 'empty' | 'error';

type ActivityWithMap = ActivitySummary & {
  total_elevation_gain?: number;
  map?: {
    summary_polyline?: string | null;
  } | null;
};

type Point = {
  x: number;
  y: number;
};

// ─── Shared polyline utilities ────────────────────────────────────────────────

function decodePolyline(encoded: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

function normalizeRouteToSvgPoints(
  coordinates: [number, number][],
  width = 240,
  height = 320,
  padding = 6
): Point[] {
  if (coordinates.length === 0) return [];

  const xs = coordinates.map(([lng]) => lng);
  const ys = coordinates.map(([, lat]) => lat);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scale = Math.min(drawableWidth / rangeX, drawableHeight / rangeY);

  const scaledWidth = rangeX * scale;
  const scaledHeight = rangeY * scale;

  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  return coordinates.map(([lng, lat]) => ({
    x: offsetX + (lng - minX) * scale,
    y: offsetY + (maxY - lat) * scale,
  }));
}

function buildSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(' ');
}

function getRouteHintKey(distanceM: number, points: Point[]): string {
  if (points.length < 2) return '';

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const aspectRatio = spanY > 0 ? spanX / spanY : 1;
  const km = distanceM / 1000;

  if (km < 3)            return 'short';
  if (aspectRatio < 0.5) return 'vertical';
  if (aspectRatio > 2)   return 'wide';
  if (km > 15)           return 'long';
  return 'clean';
}

// ─── Desktop: RoutePreview ────────────────────────────────────────────────────

function RoutePreview({
  polyline,
  distanceM = 0,
}: {
  polyline?: string | null;
  distanceM?: number;
}) {
  const t = useTranslations('activities');

  if (!polyline) return null;

  try {
    const decodedCoordinates = decodePolyline(polyline);
    const normalizedPoints = normalizeRouteToSvgPoints(decodedCoordinates);
    const pathData = buildSvgPath(normalizedPoints);
    if (!pathData) return null;

    const hintKey = getRouteHintKey(distanceM, normalizedPoints);
    const hint = hintKey ? t(`routeHints.${hintKey}`) : '';

    return (
      <div className="flex h-full flex-col">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-[14px] border border-neutral-200 bg-[#f8f8f7]">
          <svg
            viewBox="0 0 240 320"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d={pathData}
              stroke="#a3a3a3"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.45"
            />
          </svg>
        </div>
        {hint && (
          <p className="mt-3 text-center text-[11px] leading-[1.5] text-neutral-400 italic">
            {hint}
          </p>
        )}
      </div>
    );
  } catch {
    return null;
  }
}

// ─── Mobile: MobileActivityCard ───────────────────────────────────────────────

function MobileRouteSketch({
  polyline,
  distanceM = 0,
}: {
  polyline: string;
  distanceM?: number;
}) {
  const t = useTranslations('activities');
  const { pathData, hintKey } = useMemo(() => {
    try {
      const coords = decodePolyline(polyline);
      const pts = normalizeRouteToSvgPoints(coords);
      return { pathData: buildSvgPath(pts), hintKey: getRouteHintKey(distanceM, pts) };
    } catch {
      return { pathData: '', hintKey: '' };
    }
  }, [polyline, distanceM]);

  if (!pathData) return null;

  const hint = hintKey ? t(`routeHints.${hintKey}`) : '';

  return (
    <div className="flex flex-col items-center py-5">
      <div className="aspect-[2/3] w-[110px] overflow-hidden rounded-[12px] border border-neutral-200 bg-[#f8f8f7]">
        <svg viewBox="0 0 240 320" className="h-full w-full" fill="none" aria-hidden="true">
          <path
            d={pathData}
            stroke="#a3a3a3"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.45"
          />
        </svg>
      </div>
      <p className="mt-2 text-[10px] italic text-neutral-400">{t('card.mobilePreviewGuide')}</p>
      {hint && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function MobileActivityCard({ activity }: { activity: ActivityWithMap }) {
  const t = useTranslations('activities');
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasRoute    = Boolean(activity.map?.summary_polyline);
  const hasDistance = (activity.distance || 0) > 0;
  const canDesign   = hasRoute && hasDistance;

  const hint = useMemo(() => {
    if (!canDesign) return t('routeHints.noDesign');
    if (!activity.map?.summary_polyline) return '';
    try {
      const coords = decodePolyline(activity.map.summary_polyline);
      const pts = normalizeRouteToSvgPoints(coords);
      const key = getRouteHintKey(activity.distance || 0, pts);
      return key ? t(`routeHints.${key}`) : '';
    } catch {
      return '';
    }
  }, [canDesign, activity, t]);

  return (
    <div
      className={`overflow-hidden rounded-[18px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] ${
        !canDesign ? 'opacity-55' : ''
      }`}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Text block */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
            {activity.name || t('card.untitled')}
          </p>
          <p className="mt-0.5 text-[12px] text-neutral-400">
            {formatDateTime(activity.start_date_local)}
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                {t('card.distance')}
              </span>
              <span className="text-[12px] font-medium text-neutral-700">
                {formatDistanceKm(activity.distance)}
              </span>
            </div>
            {activity.total_elevation_gain != null && activity.total_elevation_gain > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                  {t('card.elevGain')}
                </span>
                <span className="text-[12px] text-neutral-500">
                  {Math.round(activity.total_elevation_gain)}m
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                {t('card.movingTime')}
              </span>
              <span className="text-[12px] text-neutral-500">
                {formatMinutes(activity.moving_time)}
              </span>
            </div>
          </div>
          <p
            className={`mt-1.5 text-[11px] leading-snug ${
              canDesign ? 'text-neutral-400' : 'text-red-400'
            }`}
          >
            {hint}
          </p>
        </div>

        {/* Action column */}
        <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
          {canDesign ? (
            <Link
              href={`/design/${activity.id}`}
              className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#FF5A1F] active:scale-95"
            >
              {t('card.design')}
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-4 py-2 text-[12px] font-semibold text-neutral-400">
              {t('card.unavailable')}
            </span>
          )}

          {canDesign && activity.map?.summary_polyline && (
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="text-[11px] text-neutral-400 underline-offset-2 transition hover:text-neutral-600 hover:underline"
            >
              {previewOpen ? t('card.hidePreview') : t('card.viewPreview')}
            </button>
          )}
        </div>
      </div>

      {/* Expandable preview section */}
      {previewOpen && activity.map?.summary_polyline && (
        <div className="border-t border-neutral-100 bg-neutral-50">
          <MobileRouteSketch
            polyline={activity.map.summary_polyline}
            distanceM={activity.distance}
          />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const router = useRouter();
  const t = useTranslations('activities');

  const [activities, setActivities] = useState<ActivityWithMap[]>([]);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    async function loadActivities() {
      try {
        const data = await apiFetch<ActivityWithMap[]>('/activities');
        setActivities(data);
        setPageState(data.length > 0 ? 'ready' : 'empty');
      } catch (error) {
        const status = (error as Error & { status?: number }).status;

        if (status === 401 || status === 403) {
          setPageState('notConnected');
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'An unknown error occurred.'
        );
        setPageState('error');
      }
    }

    loadActivities();
  }, []);

  async function handleDisconnect() {
    if (isDisconnecting) return;

    setIsDisconnecting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/strava`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Strava.');
      }

      setActivities([]);
      setPageState('notConnected');
      await router.replace('/start');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'An error occurred while disconnecting Strava.'
      );
      setIsDisconnecting(false);
    }
  }

  const totalDistance = useMemo(() => {
    return activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  }, [activities]);

  const totalMovingTime = useMemo(() => {
    return activities.reduce(
      (sum, activity) => sum + (activity.moving_time || 0),
      0
    );
  }, [activities]);

  const showDisconnectButton =
    pageState === 'ready' || pageState === 'empty';

  return (
    <Layout title={t('title')}>
      <div className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">

          {/* ── Header (shared) ── */}
          <section className="mb-8 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.5fr_0.5fr] lg:px-10 lg:py-10">
              <div className="flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-900">
                  {t('header.label')}
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-neutral-950 sm:text-4xl lg:text-5xl">
                  {t('header.heading')}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-900 sm:text-base">
                  {t('header.description')}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {showDisconnectButton && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDisconnecting ? t('header.disconnecting') : t('header.disconnect')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 max-w-[260px] ml-auto">
                <div className="rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.totalActivities')}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {activities.length}
                  </p>
                </div>
                <div className="rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.totalDistance')}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {formatDistanceKm(totalDistance)}
                  </p>
                </div>
                <div className="rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white p-5 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.totalMovingTime')}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {formatMinutes(totalMovingTime)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── State sections (shared) ── */}
          {pageState === 'loading' && (
            <section className="rounded-[20px] bg-white px-6 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-medium text-neutral-500">
                {t('loading.label')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                {t('loading.heading')}
              </h2>
            </section>
          )}

          {pageState === 'notConnected' && (
            <section className="rounded-[20px] bg-white px-6 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                {t('notConnected.label')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                {t('notConnected.heading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                {t('notConnected.description')}
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center rounded-[14px] bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F]"
                >
                  {t('notConnected.button')}
                </Link>
              </div>
            </section>
          )}

          {pageState === 'empty' && (
            <section className="rounded-[20px] bg-white px-6 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                {t('empty.label')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                {t('empty.heading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                {t('empty.description')}
              </p>
            </section>
          )}

          {pageState === 'error' && (
            <section className="rounded-[20px] bg-white px-6 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
                {t('error.label')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                {t('error.heading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                {errorMessage || t('error.fallback')}
              </p>
            </section>
          )}

          {pageState === 'ready' && (
            <section>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  {t('list.label')}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-neutral-950">
                  {t('list.heading')}
                </h2>
              </div>

              {/* ── Mobile list · < sm (640px) ── */}
              <div className="flex flex-col gap-3 sm:hidden">
                {activities.map((activity) => (
                  <MobileActivityCard key={activity.id} activity={activity} />
                ))}
              </div>

              {/* ── Desktop list · ≥ sm (640px) ── */}
              <div className="hidden sm:grid gap-4">
                {activities.map((activity) => {
                  const hasRoute    = Boolean(activity.map?.summary_polyline);
                  const hasDistance = (activity.distance || 0) > 0;
                  const canDesign   = hasRoute && hasDistance;

                  const cardContent = (
                    <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                      {/* Left: activity info */}
                      <div className="flex flex-col justify-between px-6 py-6 sm:px-8 sm:py-8">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                            {t('card.activity')}
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                            {activity.name || t('card.untitled')}
                          </h3>
                          <p className="mt-3 text-sm text-neutral-500">
                            {formatDateTime(activity.start_date_local)}
                          </p>
                        </div>

                        <div className={`mt-5 grid gap-2 ${activity.total_elevation_gain != null && activity.total_elevation_gain > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <div className="rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                              {t('card.distance')}
                            </p>
                            <p className="mt-1.5 text-base font-semibold text-neutral-900">
                              {formatDistanceKm(activity.distance)}
                            </p>
                          </div>
                          {activity.total_elevation_gain != null && activity.total_elevation_gain > 0 && (
                            <div className="rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                                {t('card.elevGain')}
                              </p>
                              <p className="mt-1.5 text-base font-semibold text-neutral-900">
                                {Math.round(activity.total_elevation_gain)}m
                              </p>
                            </div>
                          )}
                          <div className="rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                              {t('card.movingTime')}
                            </p>
                            <p className="mt-1.5 text-base font-semibold text-neutral-900">
                              {formatMinutes(activity.moving_time)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-4">
                          {canDesign ? (
                            <p className="text-sm text-neutral-400">
                              {t('card.looksGood')}
                            </p>
                          ) : (
                            <p className="text-sm text-neutral-400">
                              {t('card.cantDesign')}
                            </p>
                          )}
                          <div
                            className={`inline-flex shrink-0 items-center justify-center rounded-[14px] px-5 py-2.5 text-sm font-semibold transition ${
                              canDesign
                                ? 'bg-neutral-900 text-white group-hover:bg-[#FF5A1F]'
                                : 'cursor-default bg-neutral-100 text-neutral-400'
                            }`}
                          >
                            {canDesign ? t('card.design') : t('card.unavailable')}
                          </div>
                        </div>
                      </div>

                      {/* Right: route preview panel */}
                      <div className="border-t border-neutral-100 bg-neutral-50 lg:border-l lg:border-t-0">
                        {canDesign ? (
                          <div className="flex h-full flex-col px-6 py-6">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                              {t('card.previewLabel')}
                            </p>
                            <div className="mt-4 flex flex-1 items-center justify-center">
                              <RoutePreview
                                polyline={activity.map?.summary_polyline}
                                distanceM={activity.distance}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                              <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </div>
                            <p className="mt-3 text-sm font-medium text-neutral-600">
                              {t('card.noRouteData')}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-neutral-400">
                              {!hasRoute
                                ? t('card.routeMissing')
                                : t('card.zeroDistance')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  if (!canDesign) {
                    return (
                      <div
                        key={activity.id}
                        className="block overflow-hidden rounded-[20px] bg-white opacity-60 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                      >
                        {cardContent}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={activity.id}
                      href={`/design/${activity.id}`}
                      className="group block overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
                    >
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </Layout>
  );
}
