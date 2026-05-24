import { useMemo } from 'react';
import type { ReactNode } from 'react';
import ActivityMap, { type RouteColor } from './ActivityMap';
import ProfileGroup from './ProfileGroup';
import type { ProfileUser } from '../types/profile';
import { createProfileUser, dedupeProfileUsers } from '../lib/profileUsers';
import type { FixedMapViewState } from '../lib/poster/types';
import type { Mark } from '../types/mark';

function coordTicks(min: number, max: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => min + (i / (n - 1)) * (max - min));
}

function MapFrame({
  coordinates,
  compact,
  isDark,
  children,
}: {
  coordinates: [number, number][];
  compact: boolean;
  isDark: boolean;
  children: ReactNode;
}) {
  const bounds = useMemo(() => {
    if (coordinates.length < 2) return null;
    let w = coordinates[0][0], e = coordinates[0][0];
    let s = coordinates[0][1], n = coordinates[0][1];
    for (const [lng, lat] of coordinates) {
      w = Math.min(w, lng); e = Math.max(e, lng);
      s = Math.min(s, lat); n = Math.max(n, lat);
    }
    return { w, e, s, n };
  }, [coordinates]);

  if (!bounds) return <>{children}</>;

  const latTicks = coordTicks(bounds.s, bounds.n, 4);
  const lngTicks = coordTicks(bounds.w, bounds.e, 4);

  const borderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)';
  const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.32)';
  const fs = compact ? 6.5 : 7.5;
  const labelW = compact ? 30 : 36;
  const bottomH = compact ? 13 : 16;
  const sans = '"Inter", system-ui, sans-serif';

  return (
    <div style={{ position: 'relative', paddingLeft: labelW, paddingBottom: bottomH }}>
      {/* Latitude labels: left side, bottom→top */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: bottomH, width: labelW - 3 }}>
        {latTicks.map((lat, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: `${(i / (latTicks.length - 1)) * 100}%`,
              right: 3,
              transform: 'translateY(50%)',
              fontSize: fs,
              fontFamily: sans,
              fontWeight: 500,
              color: textColor,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {lat.toFixed(2)}°
          </div>
        ))}
      </div>

      {/* Map with border */}
      <div style={{ border: `1px solid ${borderColor}` }}>
        {children}
      </div>

      {/* Longitude labels: bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 3 }}>
        {lngTicks.map((lng, i) => (
          <span
            key={i}
            style={{
              fontSize: fs,
              fontFamily: sans,
              fontWeight: 500,
              color: textColor,
              lineHeight: 1,
            }}
          >
            {lng.toFixed(2)}°
          </span>
        ))}
      </div>
    </div>
  );
}

const FC = {
  wrapper: 'font-belmonte',
  title: {
    compact: 'text-[1.68rem] font-bold leading-[1.1] tracking-[0.01em] uppercase',
    full: 'text-[3rem] font-bold leading-[1.0] tracking-[0.01em] uppercase',
  },
  meta: 'text-[19px] font-bold tracking-[0.12em]',
  statValue: {
    compact: 'mt-1 text-[15px] font-bold tracking-[-0.02em]',
    full: 'mt-1.5 text-[1.45rem] font-bold leading-none tracking-[-0.03em]',
  },
  statLabel: {
    compact: 'mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em]',
      full: 'mt-1 text-[10px] font-medium uppercase tracking-[0.24em]',
  },
  moviata: { fontFamily: '"Belmonte Ballpoint Print", sans-serif', fontWeight: 700 as const },
};

type Props = {
  coordinates?: [number, number][];
  title: string;
  date: string;
  location: string;
  distance: string;
  duration: string;
  elevation?: string;
  shirtColor: 'white' | 'black';
  routeColor: RouteColor;
  showMap: boolean;
  showRoutePoints: boolean;
  showContours: boolean;
  instagramEnabled: boolean;
  instagramId: string;
  selectedUsers: ProfileUser[];
  compact?: boolean;
  onMapViewStateChange?: (viewState: FixedMapViewState) => void;
  onMapCanvas?: (canvas: HTMLCanvasElement) => void;
  initialMapViewState?: FixedMapViewState | null;
  mapSlot?: React.ReactNode;
  titleFallback?: string;
  endpointIndex?: number;
  marks?: Mark[];
};

export default function PosterCard({
  coordinates = [],
  title,
  date,
  location,
  distance,
  duration,
  elevation,
  shirtColor,
  routeColor,
  showMap,
  showRoutePoints,
  showContours,
  instagramEnabled,
  instagramId,
  selectedUsers,
  compact = false,
  onMapViewStateChange,
  onMapCanvas,
  initialMapViewState = null,
  mapSlot,
  titleFallback = 'Untitled Route',
  endpointIndex,
  marks,
}: Props) {
  const isDark = shirtColor === 'black';
  const hasLocation = Boolean(location?.trim());
  const hasDate = Boolean(date?.trim());
  const distanceValue = distance?.replace(/\s*[a-zA-Z]+$/, '') || '-';

  function formatWithCommas(value?: string) {
    if (!value || value === '-') return '-';
    const [integer, decimal] = value.split('.');
    const formatted = integer!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
  }

  const instagramUsers = useMemo(() => {
    if (!instagramEnabled) return [];

    if (selectedUsers.length > 0) {
      const deduped = dedupeProfileUsers(selectedUsers);

      // selectedUsers에 primary가 없는 상태(내 프로필 로드 전 친구만 있는 경우)
      // instagramId로 primary를 보완해 친구가 내 자리에 표시되는 것을 방지
      const hasPrimary = deduped.some((u) => u.isPrimary);
      if (!hasPrimary && instagramId) {
        return dedupeProfileUsers([
          createProfileUser('manual', instagramId, '', true),
          ...deduped,
        ]);
      }

      return deduped;
    }

    if (instagramId) {
      return dedupeProfileUsers([
        createProfileUser('manual', instagramId, '', true),
      ]);
    }

    return [];
  }, [instagramEnabled, instagramId, selectedUsers]);

  const cardClass = isDark
    ? 'bg-[#090b10] text-white'
    : 'bg-white text-neutral-900';

  const primaryTextClass = isDark ? 'text-[#EDE8DC]' : 'text-[#1A1A1A]';
  const tertiaryTextClass = isDark ? 'text-[#EDE8DC] font-medium' : 'text-[#1A1A1A] font-semibold';
  const tertiaryColorClass = isDark ? 'text-[#EDE8DC]' : 'text-[#1A1A1A]';

  const fc = FC;

  const wrapperClass = compact
    ? `${fc.wrapper} relative w-full aspect-[3/5] rounded-[24px] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.10)] ${cardClass}`
    : `${fc.wrapper} relative w-[428px] h-[760px] max-w-full mx-auto rounded-[32px] overflow-hidden px-6 pt-6 pb-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] ${cardClass}`;

  const titleClass = compact ? fc.title.compact : fc.title.full;

  const locationClass = `${fc.meta} ${tertiaryColorClass}`;

  const dateClass = `${fc.meta} uppercase ${tertiaryColorClass}`;

  const statLabelClass = `${compact ? fc.statLabel.compact : fc.statLabel.full} ${tertiaryTextClass}`;

  const statValueClass = `${compact ? fc.statValue.compact : fc.statValue.full} ${primaryTextClass}`;

  const contentWidthClass = compact
    ? 'mx-auto w-full max-w-[312px]'
    : 'mx-auto w-full max-w-[380px]';

  return (
    <div className={wrapperClass}>
      {/* FIX: always use a fixed height regardless of instagramEnabled so
          html2canvas has a stable containing-block height to measure against.
          Without this, overflow:visible caused the ProfileGroup's rendered
          height to vary between the browser and the capture, pushing every
          element below (Title / Date / IDs) downward in the snapshot. */}
      <div
        style={{
          height: compact ? 40 : 52,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          marginBottom: instagramEnabled ? (compact ? 10 : 20) : 0,
        }}
      >
        {instagramEnabled ? (
          <div style={{ width: '100%', maxWidth: compact ? 312 : 380 }}>
            <ProfileGroup
              users={instagramUsers}
              compact={compact}
              isDark={isDark}
            />
          </div>
        ) : null}
      </div>

      <div
        className={
          compact
            ? 'mt-2 flex flex-col items-center text-center'
            : 'mt-3 flex min-h-[30px] flex-col items-center text-center'
        }
      >
        <h1
          className={`${titleClass} ${primaryTextClass} text-center`}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
        >
          {title || titleFallback}
        </h1>

        {(hasLocation || hasDate) && (
          hasLocation ? (
            <div className={`${compact ? 'mt-3' : 'mt-5'} ${contentWidthClass}`}>
              <div className="flex items-center justify-between gap-6">
                <span className={`${locationClass} ml-12 text-left`}>{location}</span>
                {hasDate ? (
                  <span className={`${dateClass} mr-12 text-right`}>{date}</span>
                ) : <span />}
              </div>
            </div>
          ) : (
            <div className={compact ? 'mt-3' : 'mt-5'}>
              {hasDate ? (
                <span className={dateClass}>{date}</span>
              ) : null}
            </div>
          )
        )}
      </div>

      <div className={compact ? 'mt-3 flex justify-center' : 'mt-5 flex justify-center'}>
        <div className={compact ? 'w-full max-w-[312px]' : 'w-full max-w-[380px]'}>
          {coordinates.length > 1 ? (
            <MapFrame coordinates={coordinates} compact={compact} isDark={isDark}>
              {mapSlot ?? (
                <ActivityMap
                  coordinates={coordinates}
                  shirtColor={shirtColor}
                  routeColor={routeColor}
                  showMap={showMap}
                  showRoutePoints={showRoutePoints}
                  showContours={showContours}
                  onViewStateChange={onMapViewStateChange}
                  onMapCanvas={onMapCanvas}
                  initialViewState={initialMapViewState}
                  marks={marks}
                  className="w-full max-w-full"
                />
              )}
            </MapFrame>
          ) : (mapSlot ?? (
            <div
              className={`flex aspect-[3/4] items-center justify-center rounded-[18px] border ${
                isDark
                  ? 'border-neutral-700 bg-black text-neutral-500'
                  : 'border-neutral-200 bg-white text-neutral-400'
              }`}
            >
              <span className={compact ? 'text-[11px]' : 'text-xs'}>
                Route unavailable
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={compact ? 'mt-3 flex justify-center' : 'mt-6 flex justify-center'}>
        <span
          style={{
            ...fc.moviata,
            fontSize: compact ? '20px' : '28px',
            letterSpacing: '-0.03em',
            color: isDark ? '#EDE8DC' : '#1A1A1A',
            userSelect: 'none',
          }}
        >
          MOVIATA
        </span>
      </div>

      <div className={compact ? 'mt-2' : 'mt-3'}>
        {(() => {
          const hasDistance = Boolean(distanceValue && distanceValue !== '-');
          const hasElevation = Boolean(elevation && elevation !== '-');
          const hasDuration = Boolean(duration && duration !== '-');

          const stats = [
            hasDistance && (
              <div key="distance" className="min-w-0 flex-1 text-center">
                <p className={statValueClass}>{formatWithCommas(distanceValue)}</p>
                <p className={statLabelClass}>KM</p>
              </div>
            ),
            hasElevation && (
              <div key="elevation" className="min-w-0 flex-1 text-center">
                <p className={statValueClass}>{formatWithCommas(elevation)}m</p>
                <p className={statLabelClass}>ELEV GAIN</p>
              </div>
            ),
            hasDuration && (
              <div key="duration" className="min-w-0 flex-1 text-center">
                <p className={statValueClass}>{duration}</p>
                <p className={statLabelClass}>TIME</p>
              </div>
            ),
          ].filter(Boolean);

          const count = stats.length;
          const justifyClass =
            count === 1 ? 'justify-center' :
            count === 2 ? 'justify-around' :
            'justify-between';

          return (
            <div className={contentWidthClass}>
              <div className={`flex items-center ${justifyClass}`}>
                {stats}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}