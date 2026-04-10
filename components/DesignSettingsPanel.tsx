import type { ChangeEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { ProfileUser } from '../types/profile';

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
  routeColor: 'red' | 'orange';
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
  isDownloading?: boolean;
  onConfirm: () => void;
  onDownload: () => void;
  activityType: 'path' | 'motion' | null;
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
  // Max 2 lines (one \n allowed), total 60 chars
  const lines = input.toUpperCase().split('\n').slice(0, 2);
  return lines.join('\n').slice(0, 60);
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
  isDownloading = false,
  onConfirm,
  onDownload,
}: DesignSettingsPanelProps) {
  const t = useTranslations('settings');

  const handleInput =
    (key: 'title' | 'date' | 'location' | 'distance' | 'elevation' | 'time' | 'myInstagramId') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      updateField(value, onChange, key, e.target.value);
    };

  const addedFriends = value.selectedUsers.filter((user) => !user.isPrimary);
  const normalizedMyInstagramId = normalizeInstagramHandle(value.myInstagramId);

  const canAddFriend =
    value.instagramEnabled && addedFriends.length < 1 && !isAddingFriend;

  const canLoadMyInstagram =
    value.instagramEnabled &&
    normalizedMyInstagramId.length > 0 &&
    myInstagramFetchStatus !== 'loading' &&
    !isGeneratingSnapshot;

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
        </div>

        <div className="rounded-[16px] border border-neutral-200 p-4">
          <p className="text-sm font-medium text-neutral-900">{t('routeColor.title')}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {t('routeColor.description')}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  routeColor: 'red',
                })
              }
              disabled={isGeneratingSnapshot}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                value.routeColor === 'red'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 bg-white text-neutral-900'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {t('routeColor.red')}
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  routeColor: 'orange',
                })
              }
              disabled={isGeneratingSnapshot}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                value.routeColor === 'orange'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 bg-white text-neutral-900'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {t('routeColor.orange')}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <div className="space-y-4">
            <div>
              <FieldLabel required>{t('activity.name')}</FieldLabel>
              <textarea
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
                maxLength={60}
                rows={2}
                disabled={isGeneratingSnapshot}
                className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm leading-6 uppercase outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div>
              <FieldLabel>{t('distance.title')}</FieldLabel>
              <input
                type="text"
                value={value.distance}
                onChange={handleInput('distance')}
                placeholder={t('distance.placeholder')}
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel>Max Elev (m)</FieldLabel>
              <input
                type="text"
                value={value.elevation}
                onChange={handleInput('elevation')}
                placeholder="e.g. 295"
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel required>{t('time.title')}</FieldLabel>
              <input
                type="text"
                value={value.time}
                onChange={handleInput('time')}
                placeholder="00:00"
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={onConfirm}
                disabled={!isMapReady || isGeneratingSnapshot || isDownloading}
                className="w-full rounded-[14px] bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingSnapshot
                  ? t('confirm.preparing')
                  : !isMapReady
                    ? t('confirm.loadingMap')
                    : t('confirm.confirm')}
              </button>

              <button
                type="button"
                onClick={onDownload}
                disabled={!isMapReady || isGeneratingSnapshot || isDownloading}
                className="w-full rounded-[14px] border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? t('confirm.downloading') : t('confirm.download')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
