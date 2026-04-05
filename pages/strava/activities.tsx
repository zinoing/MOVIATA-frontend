import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  map?: {
    summary_polyline?: string | null;
  } | null;
};

type Point = {
  x: number;
  y: number;
};

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

function RoutePreview({
  polyline,
  activityName,
}: {
  polyline?: string | null;
  activityName: string;
}) {
  if (!polyline) {
    return (
      <div className="text-center">
        <p className="text-base font-medium text-neutral-700">
          Route preview is not available
        </p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          This activity does not include summary polyline data yet.
        </p>
      </div>
    );
  }

  try {
    const decodedCoordinates = decodePolyline(polyline);
    const normalizedPoints = normalizeRouteToSvgPoints(decodedCoordinates);
    const pathData = buildSvgPath(normalizedPoints);

    if (!pathData) {
      return (
        <div className="text-center">
          <p className="text-base font-medium text-neutral-700">
            Route preview is not available
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            The route data was provided, but the preview could not be rendered.
          </p>
        </div>
      );
    }

    const startPoint = normalizedPoints[0];
    const endPoint = normalizedPoints[normalizedPoints.length - 1];

    return (
      <div className="w-full">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-[24px] border border-neutral-200 bg-[#f7f7f5]">
          <div className="absolute inset-0 opacity-80">
            <svg
              viewBox="0 0 240 320"
              className="h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label={`${activityName} route preview`}
            >
              <path
                d="M20 50 H220"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
              <path
                d="M20 95 H220"
                stroke="#ececec"
                strokeWidth="1"
              />
              <path
                d="M20 140 H220"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
              <path
                d="M20 185 H220"
                stroke="#ececec"
                strokeWidth="1"
              />
              <path
                d="M20 230 H220"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
              <path
                d="M20 275 H220"
                stroke="#ececec"
                strokeWidth="1"
              />

              <path
                d="M45 20 V300"
                stroke="#ececec"
                strokeWidth="1"
              />
              <path
                d="M90 20 V300"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
              <path
                d="M135 20 V300"
                stroke="#ececec"
                strokeWidth="1"
              />
              <path
                d="M180 20 V300"
                stroke="#e5e5e5"
                strokeWidth="1"
              />

              <path
                d={pathData}
                stroke="#111111"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {startPoint && (
                <circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r="5"
                  fill="#16a34a"
                />
              )}

              {endPoint && (
                <circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r="5"
                  fill="#f97316"
                />
              )}
            </svg>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Real route preview generated from Strava summary polyline.
        </p>
      </div>
    );
  } catch {
    return (
      <div className="text-center">
        <p className="text-base font-medium text-neutral-700">
          Route preview could not be rendered
        </p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          The polyline format may be invalid or incomplete.
        </p>
      </div>
    );
  }
}

export default function ActivitiesPage() {
  const router = useRouter();

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
      await router.replace('/');
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
    <Layout title="Recent Activities">
      <div
        className="min-h-screen"
        style={{
          backgroundImage: 'url(/resources/running-activities.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="min-h-screen bg-black/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="mb-8 overflow-hidden rounded-[32px] border border-white/30 bg-white/40 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.5fr_0.5fr] lg:px-10 lg:py-10">
              <div className="flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  MOVIATA × Strava
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                  Pick a movement you want to keep.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
                  Your latest Strava activities are ready. Pick one activity and
                  move directly into the design workspace.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {showDisconnectButton && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect Strava'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 max-w-[260px] ml-auto">
                <div className="rounded-[20px] border border-white/30 bg-white/20 backdrop-blur-sm p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Total Activities
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {activities.length}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/30 bg-white/20 backdrop-blur-sm p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Total Distance
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {formatDistanceKm(totalDistance)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/30 bg-white/20 backdrop-blur-sm p-5 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Total Moving Time
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {formatMinutes(totalMovingTime)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {pageState === 'loading' && (
            <section className="rounded-[28px] border border-white/30 bg-white/40 backdrop-blur-md px-6 py-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
              <p className="text-sm font-medium text-neutral-500">
                Loading your activities...
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                Fetching the latest data from Strava
              </h2>
            </section>
          )}

          {pageState === 'notConnected' && (
            <section className="rounded-[28px] border border-white/30 bg-white/40 backdrop-blur-md px-6 py-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                Connection required
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                Connect your Strava account first
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                Once your account is connected, your recent activities will appear
                here automatically.
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Connect Strava
                </Link>
              </div>
            </section>
          )}

          {pageState === 'empty' && (
            <section className="rounded-[28px] border border-white/30 bg-white/40 backdrop-blur-md px-6 py-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                No activities found
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                Your activity list is currently empty
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                Record a new activity in Strava and come back here to turn it into
                a poster or apparel design.
              </p>
            </section>
          )}

          {pageState === 'error' && (
            <section className="rounded-[28px] border border-red-200/50 bg-white/40 backdrop-blur-md px-6 py-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
                Error
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                Something went wrong while loading activities
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                {errorMessage || 'Please try again in a moment.'}
              </p>
            </section>
          )}

          {pageState === 'ready' && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                    Activity Library
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Recent activities
                  </h2>
                </div>
              </div>

              <div className="grid gap-5">
                {activities.map((activity) => {
                  const hasRoutePreview = Boolean(activity.map?.summary_polyline);

                  return (
                    <Link
                      key={activity.id}
                      href={`/design/${activity.id}`}
                      className="group block overflow-hidden rounded-[30px] border border-white/30 bg-white/40 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.08)]"
                    >
                      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="flex flex-col justify-between px-6 py-6 sm:px-8 sm:py-8">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700">
                              Activity
                            </p>

                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                              {activity.name || 'Untitled activity'}
                            </h3>

                            <p className="mt-3 text-sm text-neutral-700">
                              {formatDateTime(activity.start_date_local)}
                            </p>
                          </div>

                          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/30 bg-white/30 backdrop-blur-sm px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                                Distance
                              </p>
                              <p className="mt-1.5 text-base font-semibold text-neutral-900">
                                {formatDistanceKm(activity.distance)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/30 bg-white/30 backdrop-blur-sm px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                                Moving Time
                              </p>
                              <p className="mt-1.5 text-base font-semibold text-neutral-900">
                                {formatMinutes(activity.moving_time)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/30 bg-white/30 backdrop-blur-sm px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                                Route Data
                              </p>
                              <p className="mt-1.5 text-base font-semibold text-neutral-900">
                                {hasRoutePreview ? 'Available' : 'Missing'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-4">
                            <p className="text-sm" style={{ color: 'rgba(0,0,0,0.6)' }}>
                              Open this activity in the design workspace.
                            </p>

                            <div className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-orange-500">
                              Design this activity
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/20 bg-white/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
                          <div className="flex h-full min-h-[200px] flex-col rounded-[24px] border border-white/30 bg-white/30 backdrop-blur-sm p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Route preview
                              </p>
                              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-neutral-700">
                                {hasRoutePreview ? 'Live preview' : 'No polyline'}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-1 items-center justify-center rounded-[18px] border border-dashed border-white/40 p-3">
                              <RoutePreview
                                polyline={activity.map?.summary_polyline}
                                activityName={activity.name || 'Untitled activity'}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
}