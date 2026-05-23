import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { ProfileUser } from '../types/profile';
import type { Mark } from '../types/mark';

type ShirtColor = 'white' | 'black';
type InstagramFetchStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'not_found';

export type DesignEditorState = {
  instagramEnabled: boolean;
  shirtColor: ShirtColor;
  title: string;
  date: string;
  location: string;
  distance: string;
  elevation: string;
  time: string;
  myInstagramId: string;
  selectedUsers: ProfileUser[];
  routeColor: 'orange';
  showMap: boolean;
  showRoutePoints: boolean;
  showContours: boolean;
};

type DesignSettingsPanelProps = {
  value: DesignEditorState;
  onChange: (next: DesignEditorState) => void;
  onOpenFriendPicker: () => void;
  onRemoveFriend: (userId: string) => void;
  onLoadMyInstagram: () => void;
  myInstagramFetchStatus?: InstagramFetchStatus;
  myInstagramErrorMessage?: string;
  isAddingFriend?: boolean;
  isMapReady?: boolean;
  isGeneratingSnapshot?: boolean;
  onConfirm: () => void;
  activityType: 'path' | 'motion' | null;
  marks?: Mark[];
  onMarksChange?: (marks: Mark[]) => void;
  selectedMarkId?: string | null;
  onMarkSelect?: (id: string | null) => void;
  coordinateCount?: number;
  elevations?: number[] | null;
  peakIndex?: number | null;
};

function updateField<K extends keyof DesignEditorState>(
  value: DesignEditorState,
  onChange: (next: DesignEditorState) => void,
  key: K,
  nextValue: DesignEditorState[K],
) {
  onChange({
    ...value,
    [key]: nextValue,
  });
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-neutral-900">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function getAvatarFallback(username?: string) {
  if (!username) return '?';
  return username.replace(/^@+/, '').slice(0, 2).toUpperCase();
}

function normalizeInstagramHandle(input: string) {
  return input.trim().replace(/^@+/, '').toLowerCase();
}

function normalizePosterTitle(input: string) {
  return input.replace(/\n/g, '').toUpperCase().slice(0, 15);
}

function MarksSection({
  marks,
  onMarksChange,
  selectedMarkId,
  onMarkSelect,
  coordinateCount,
  elevations,
  peakIndex,
  disabled = false,
}: {
  marks: Mark[];
  onMarksChange: (marks: Mark[]) => void;
  selectedMarkId: string | null;
  onMarkSelect: (id: string | null) => void;
  coordinateCount: number;
  elevations: number[] | null;
  peakIndex: number | null;
  disabled?: boolean;
}) {
  const chartW = 300;
  const chartH = 52;
  const padY = 7;
  const containerRef = useRef<HTMLDivElement>(null);

  const marksRef = useRef(marks);
  const onMarksChangeRef = useRef(onMarksChange);
  const selectedMarkIdRef = useRef(selectedMarkId);
  marksRef.current = marks;
  onMarksChangeRef.current = onMarksChange;
  selectedMarkIdRef.current = selectedMarkId;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function posFromClientX(clientX: number): number {
      const rect = el!.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function applyPos(clientX: number) {
      const sid = selectedMarkIdRef.current;
      if (!sid) return;
      const pos = posFromClientX(clientX);
      onMarksChangeRef.current(
        marksRef.current.map(m => m.id === sid ? { ...m, position: pos } : m),
      );
    }

    function onMouseDown(e: MouseEvent) {
      if (!selectedMarkIdRef.current) return;
      applyPos(e.clientX);
      function onMove(e: MouseEvent) { applyPos(e.clientX); }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    function onTouchStart(e: TouchEvent) {
      if (!selectedMarkIdRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      if (t) applyPos(t.clientX);
    }

    function onTouchMove(e: TouchEvent) {
      if (!selectedMarkIdRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      if (t) applyPos(t.clientX);
    }

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []); // refs handle live values — no deps needed

  let fillPath = '';
  if (elevations && elevations.length >= 2) {
    const minE = Math.min(...elevations);
    const maxE = Math.max(...elevations);
    const range = maxE - minE || 1;
    const pts = elevations.map((e, i) => {
      const x = (i / (elevations.length - 1)) * chartW;
      const y = chartH - padY - ((e - minE) / range) * (chartH - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    fillPath = `M0,${chartH} L${pts.join(' L')} L${chartW},${chartH} Z`;
  } else {
    const flatY = chartH * 0.55;
    fillPath = `M0,${flatY} L${chartW},${flatY} L${chartW},${chartH} L0,${chartH} Z`;
  }

  const peakPct = peakIndex != null && coordinateCount > 1
    ? (peakIndex / (coordinateCount - 1)) * 100
    : null;

  function markDotY(position: number): number {
    if (elevations && elevations.length >= 2) {
      const minE = Math.min(...elevations);
      const maxE = Math.max(...elevations);
      const range = maxE - minE || 1;
      const idx = Math.round(position * (elevations.length - 1));
      const e = elevations[Math.min(idx, elevations.length - 1)] ?? minE;
      return chartH - padY - ((e - minE) / range) * (chartH - padY * 2);
    }
    return chartH * 0.55;
  }

  const hasOptionalMark = marks.some(m => m.id === 'mk-mid');

  function addMark() {
    onMarksChange([
      ...marks.filter(m => m.id !== 'mk-end'),
      { id: 'mk-mid', name: 'mark', isDestination: false, position: 0.5 },
      ...marks.filter(m => m.id === 'mk-end'),
    ]);
  }

  function removeMark() {
    if (selectedMarkId === 'mk-mid') onMarkSelect(null);
    onMarksChange(marks.filter(m => m.id !== 'mk-mid'));
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-neutral-400">
        {selectedMarkId ? 'Drag the chart to move the selected mark' : 'Select a mark to move it'}
      </p>

      <div
        ref={containerRef}
        className="relative mt-3 touch-none"
        style={{ height: chartH, cursor: selectedMarkId ? 'ew-resize' : 'default' }}
      >
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path d={fillPath} fill="#e5e7eb" />

          {peakPct != null && (
            <line
              x1={(peakPct / 100) * chartW} y1={0}
              x2={(peakPct / 100) * chartW} y2={chartH}
              stroke="#F97316" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.45}
            />
          )}

          {marks.map(mark => {
            const x = mark.position * chartW;
            const y = markDotY(mark.position);
            const selected = mark.id === selectedMarkId;
            return (
              <g key={mark.id}>
                <line
                  x1={x} y1={0} x2={x} y2={chartH}
                  stroke={selected ? '#FF5A1F' : '#9ca3af'}
                  strokeWidth={selected ? 2 : 1.5}
                  strokeDasharray="3,2"
                  opacity={0.7}
                />
                <circle cx={x} cy={y} r={selected ? 5.5 : 4} fill={selected ? '#FF5A1F' : '#6b7280'} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-1 flex justify-between">
        <span className="text-xs text-neutral-400">Start</span>
        <span className="text-xs text-neutral-400">End</span>
      </div>

      <div className="mt-3 space-y-2">
        {marks.map(mark => {
          const isFixed = mark.id === 'mk-start' || mark.id === 'mk-end';
          const canToggleFlag = mark.id !== 'mk-start';
          const selected = mark.id === selectedMarkId;
          return (
            <div
              key={mark.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition cursor-pointer ${
                selected
                  ? 'border-[#FF5A1F] bg-orange-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
              onClick={() => onMarkSelect(mark.id === selectedMarkId ? null : mark.id)}
            >
              <span className="flex-1 min-w-0 text-sm text-neutral-900 select-none capitalize">{mark.name}</span>
              {canToggleFlag && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onMarksChange(marks.map(m => m.id === mark.id ? { ...m, isDestination: !m.isDestination } : m));
                  }}
                  disabled={disabled}
                  className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-medium transition ${
                    mark.isDestination
                      ? 'border-[#FF5A1F] bg-[#FF5A1F] text-white'
                      : 'border-neutral-300 text-neutral-500 hover:border-neutral-400'
                  } disabled:opacity-50`}
                >
                  {mark.isDestination ? 'flag' : 'waypoint'}
                </button>
              )}
              {!isFixed && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeMark(); }}
                  disabled={disabled}
                  className="shrink-0 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}

        {!hasOptionalMark && (
          <button
            type="button"
            onClick={addMark}
            disabled={disabled}
            className="w-full rounded-xl border border-dashed border-neutral-300 px-3 py-2.5 text-sm text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-50"
          >
            + Add Mark
          </button>
        )}
      </div>
    </div>
  );
}

export default function DesignSettingsPanel({
  value,
  onChange,
  onOpenFriendPicker,
  onRemoveFriend,
  onLoadMyInstagram,
  myInstagramFetchStatus = 'idle',
  myInstagramErrorMessage = '',
  isAddingFriend = false,
  isMapReady = false,
  isGeneratingSnapshot = false,
  onConfirm,
  activityType,
  marks,
  onMarksChange,
  selectedMarkId,
  onMarkSelect,
  coordinateCount,
  elevations,
  peakIndex,
}: DesignSettingsPanelProps) {
  const t = useTranslations('settings');

  const handleInput =
    (key: 'title' | 'date' | 'location' | 'distance' | 'elevation' | 'time' | 'myInstagramId') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      updateField(value, onChange, key, e.target.value);
    };

  const addedFriends = (value.selectedUsers ?? []).filter((user) => !user.isPrimary);
  const normalizedMyInstagramId = normalizeInstagramHandle(value.myInstagramId);

  const canAddFriend =
    value.instagramEnabled && addedFriends.length < 1 && !isAddingFriend;

  const canLoadMyInstagram =
    value.instagramEnabled &&
    normalizedMyInstagramId.length > 0 &&
    myInstagramFetchStatus !== 'loading' &&
    !isGeneratingSnapshot;

  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;


  return (
    <aside className="w-full rounded-[20px] border border-neutral-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] lg:sticky lg:top-6">
      <div className="mb-6">
        <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-neutral-950">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-neutral-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                {t('instagram.title')}
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                {t('instagram.description')}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateField(
                  value,
                  onChange,
                  'instagramEnabled',
                  !value.instagramEnabled,
                )
              }
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                value.instagramEnabled ? 'bg-neutral-900' : 'bg-neutral-300'
              }`}
              aria-pressed={value.instagramEnabled}
              disabled={isGeneratingSnapshot}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  value.instagramEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {value.instagramEnabled && (
            <div className="space-y-4">
              <div>
                <FieldLabel>{t('instagram.myId')}</FieldLabel>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={value.myInstagramId}
                    onChange={handleInput('myInstagramId')}
                    placeholder={t('instagram.placeholder')}
                    className="flex-1 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                    disabled={isGeneratingSnapshot}
                  />

                  <button
                    type="button"
                    onClick={onLoadMyInstagram}
                    disabled={!canLoadMyInstagram}
                    className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {myInstagramFetchStatus === 'loading' ? t('instagram.loading') : t('instagram.load')}
                  </button>
                </div>

                {(myInstagramFetchStatus === 'error' ||
                  myInstagramFetchStatus === 'not_found') &&
                myInstagramErrorMessage ? (
                  <p className="mt-2 text-xs text-red-500">
                    {myInstagramErrorMessage}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel>{t('instagram.friend')}</FieldLabel>
                  <span className="text-xs text-neutral-400">
                    {t('instagram.addedCount', { count: addedFriends.length })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenFriendPicker}
                  disabled={!canAddFriend || isGeneratingSnapshot}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    canAddFriend && !isGeneratingSnapshot
                      ? 'border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:text-neutral-900'
                      : 'cursor-not-allowed border-neutral-200 text-neutral-400'
                  }`}
                >
                  {isAddingFriend
                    ? t('instagram.loading')
                    : addedFriends.length > 0
                      ? t('instagram.friendAdded')
                      : t('instagram.addFriend')}
                </button>
              </div>

              {addedFriends.length > 0 && (
                <div>
                  <FieldLabel>{t('instagram.addedFriend')}</FieldLabel>
                  <div className="space-y-2">
                    {addedFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {friend.avatarUrl ? (
                            <img
                              src={friend.avatarUrl}
                              alt={`@${friend.username}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                              {getAvatarFallback(friend.username)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900">
                              @{friend.username}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveFriend(friend.id)}
                          disabled={isGeneratingSnapshot}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('instagram.remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <FieldLabel>{t('shirtColor.title')}</FieldLabel>

          <div className="grid grid-cols-2 gap-3">
            {(['white', 'black'] as const).map((shirtColor) => {
              const selected = value.shirtColor === shirtColor;
              return (
                <button
                  key={shirtColor}
                  type="button"
                  onClick={() => updateField(value, onChange, 'shirtColor', shirtColor)}
                  disabled={isGeneratingSnapshot}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                    selected
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {shirtColor === 'white' ? t('shirtColor.white') : t('shirtColor.black')}
                </button>
              );
            })}
          </div>
        </section>

        {activityType !== 'motion' && (
          <div className="rounded-[16px] border border-neutral-200 p-4 space-y-4">
            {/* Map toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">{t('map.title')}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {t('map.description')}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    showMap: !value.showMap,
                    showContours: value.showMap ? false : value.showContours,
                  })
                }
                disabled={isGeneratingSnapshot}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  value.showMap ? 'bg-neutral-900' : 'bg-neutral-200'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    value.showMap ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-100" />

            {/* Contours toggle — disabled when Map is off */}
            <div className={`flex items-center justify-between gap-4 transition ${!value.showMap ? 'opacity-40' : ''}`}>
              <div>
                <p className="text-sm font-medium text-neutral-900">{t('contours.title')}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {t('contours.description')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!value.showMap) return;
                  onChange({ ...value, showContours: !value.showContours });
                }}
                disabled={isGeneratingSnapshot || !value.showMap}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  value.showContours && value.showMap ? 'bg-neutral-900' : 'bg-neutral-200'
                } disabled:cursor-not-allowed`}
                aria-pressed={value.showContours}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    value.showContours && value.showMap ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {activityType !== 'motion' && (
          <div className="rounded-[16px] border border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {t('routePoints.title')}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {t('routePoints.description')}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    showRoutePoints: !value.showRoutePoints,
                  })
                }
                disabled={isGeneratingSnapshot}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  value.showRoutePoints ? 'bg-neutral-900' : 'bg-neutral-200'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    value.showRoutePoints ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {value.showRoutePoints && marks != null && coordinateCount != null && coordinateCount > 1 && (
              <>
                <div className="mt-4 h-px bg-neutral-100" />
                <MarksSection
                  marks={marks}
                  onMarksChange={onMarksChange ?? (() => undefined)}
                  selectedMarkId={selectedMarkId ?? null}
                  onMarkSelect={onMarkSelect ?? (() => undefined)}
                  coordinateCount={coordinateCount}
                  elevations={elevations ?? null}
                  peakIndex={peakIndex ?? null}
                  disabled={isGeneratingSnapshot}
                />
              </>
            )}
          </div>
        )}


        <section className="rounded-2xl border border-neutral-200 p-4">
          <div className="space-y-4">
            <div>
              <FieldLabel required>{t('activity.name')}</FieldLabel>
              <input
                type="text"
                value={value.title}
                onChange={(e) =>
                  updateField(
                    value,
                    onChange,
                    'title',
                    normalizePosterTitle(e.target.value),
                  )
                }
                placeholder={t('activity.namePlaceholder')}
                maxLength={15}
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm uppercase outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel required>{t('activity.date')}</FieldLabel>
              <input
                type="text"
                value={value.date}
                onChange={handleInput('date')}
                placeholder={t('activity.datePlaceholder')}
                maxLength={20}
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel>{t('activity.location')}</FieldLabel>
              <input
                type="text"
                value={value.location}
                onChange={handleInput('location')}
                placeholder={t('activity.locationPlaceholder')}
                maxLength={30}
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <button
                type="button"
                onClick={onConfirm}
                disabled={!isMapReady || isGeneratingSnapshot}
                className="w-full rounded-[14px] bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingSnapshot
                  ? t('confirm.preparing')
                  : !isMapReady
                    ? t('confirm.loadingMap')
                    : t('confirm.confirm')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}