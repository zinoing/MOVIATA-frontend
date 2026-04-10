import { useMemo } from 'react';
import ActivityMap, { type RouteColor } from './ActivityMap';
import ProfileGroup from './ProfileGroup';
import type { ProfileUser } from '../types/profile';
import { createProfileUser, dedupeProfileUsers } from '../lib/profileUsers';
import type { FixedMapViewState } from '../lib/poster/types';

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
  onRemoveUser?: (userId: string) => void;
  compact?: boolean;
  onMapViewStateChange?: (viewState: FixedMapViewState) => void;
  onMapCanvas?: (canvas: HTMLCanvasElement) => void;
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
  onRemoveUser,
  compact = false,
  onMapViewStateChange,
  onMapCanvas,
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
      return dedupeProfileUsers(selectedUsers);
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

  const primaryTextClass = isDark ? 'text-white' : 'text-neutral-900';
  const secondaryTextClass = isDark ? 'text-neutral-300' : 'text-neutral-700';
  const tertiaryTextClass = isDark ? 'text-neutral-500' : 'text-neutral-500';

  const wrapperClass = compact
    ? `w-full aspect-[3/5] rounded-[24px] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.10)] ${cardClass}`
    : `w-[420px] max-w-full mx-auto rounded-[32px] overflow-hidden px-6 pt-6 pb-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] ${cardClass}`;

  const titleClass = compact
    ? 'text-[1.3rem] font-bold leading-[1.08] tracking-[-0.03em] uppercase'
    : 'text-[2.35rem] font-bold leading-[1.02] tracking-[-0.045em] uppercase';

  const locationClass = compact
    ? `text-[12px] font-medium tracking-[0.14em] ${secondaryTextClass}`
    : `text-[12px] font-medium tracking-[0.18em] ${secondaryTextClass}`;

  const dateClass = compact
    ? `text-[12px] font-medium tracking-[0.12em] uppercase ${secondaryTextClass}`
    : `text-[12px] font-medium tracking-[0.16em] uppercase ${secondaryTextClass}`;

  const statLabelClass = compact
    ? `mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] ${tertiaryTextClass}`
    : `mt-1 text-[10px] font-medium uppercase tracking-[0.24em] ${tertiaryTextClass}`;

  const statValueClass = compact
    ? `mt-1 text-[15px] font-bold tracking-[-0.02em] ${primaryTextClass}`
    : `mt-1.5 text-[1.45rem] font-bold leading-none tracking-[-0.03em] ${primaryTextClass}`;

  const contentWidthClass = compact
    ? 'mx-auto w-full max-w-[260px]'
    : 'mx-auto w-full max-w-[300px]';

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
          alignItems: 'flex-start',
          marginBottom: instagramEnabled ? (compact ? 10 : 20) : 0,
        }}
      >
        {instagramEnabled ? (
          <ProfileGroup
            users={instagramUsers}
            compact={compact}
            isDark={isDark}
          />
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
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-line',
          }}
        >
          {title || 'Untitled Route'}
        </h1>

        {(hasLocation || hasDate) && (
          hasLocation ? (
            <div className={`${compact ? 'mt-3' : 'mt-4'} ${contentWidthClass}`}>
              <div className="flex items-center justify-between gap-6">
                <span className={`${locationClass} text-left`}>{location}</span>
                {hasDate ? (
                  <span className={`${dateClass} text-right`}>{date}</span>
                ) : <span />}
              </div>
            </div>
          ) : (
            <div className={compact ? 'mt-3' : 'mt-4'}>
              {hasDate ? (
                <span className={dateClass}>{date}</span>
              ) : null}
            </div>
          )
        )}
      </div>

      <div className={compact ? 'mt-3 flex justify-center' : 'mt-5 flex justify-center'}>
        <div className={compact ? 'w-full max-w-[260px]' : 'w-full max-w-[300px]'}>
          {coordinates.length > 1 ? (
            <ActivityMap
              coordinates={coordinates}
              shirtColor={shirtColor}
              routeColor={routeColor}
              showMap={showMap}
              showRoutePoints={showRoutePoints}
              showContours={showContours}
              onViewStateChange={onMapViewStateChange}
              onMapCanvas={onMapCanvas}
              className="w-full max-w-full"
            />
          ) : (
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
          )}
        </div>
      </div>

      <div className={compact ? 'mt-3' : 'mt-5'}>
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
                <p className={statLabelClass}>MAX ELEV</p>
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
            <div className={`flex items-center ${justifyClass}`}>
              {stats}
            </div>
          );
        })()}
      </div>
    </div>
  );
}