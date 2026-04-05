import type { ChangeEvent, ReactNode } from 'react';
import type { ProfileUser } from '../types/profile';

type Units = 'km' | 'miles';
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
  units: Units;
  distance: string;
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
  isGeneratingSnapshot?: boolean;
  onConfirm: () => void;
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
  isGeneratingSnapshot = false,
  onConfirm,
}: DesignSettingsPanelProps) {
  const handleInput =
    (key: 'title' | 'date' | 'location' | 'distance' | 'time' | 'myInstagramId') =>
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
    <aside className="w-full rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:sticky lg:top-6">
      <div className="mb-6">
        <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-neutral-950">
          Settings
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Edit the preview on the left in real time.
        </p>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-neutral-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Instagram
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Add your account and optionally one friend.
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
                <FieldLabel>My Instagram ID</FieldLabel>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={value.myInstagramId}
                    onChange={handleInput('myInstagramId')}
                    placeholder="@wearthemovement"
                    className="flex-1 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
                    disabled={isGeneratingSnapshot}
                  />

                  <button
                    type="button"
                    onClick={onLoadMyInstagram}
                    disabled={!canLoadMyInstagram}
                    className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {myInstagramFetchStatus === 'loading' ? 'Loading...' : 'Load'}
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
                  <FieldLabel>Friend</FieldLabel>
                  <span className="text-xs text-neutral-400">
                    {addedFriends.length}/1 added
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
                    ? 'Loading...'
                    : addedFriends.length > 0
                      ? 'Friend added'
                      : 'Add Friend'}
                </button>
              </div>

              {addedFriends.length > 0 && (
                <div>
                  <FieldLabel>Added Friend</FieldLabel>
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
                          Remove
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
          <FieldLabel>T-shirt Color</FieldLabel>

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
                  {shirtColor}
                </button>
              );
            })}
          </div>
        </section>

        <div className="rounded-[24px] border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Map</p>
              <p className="mt-1 text-xs text-neutral-500">
                Show or hide the background map.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  showMap: !value.showMap,
                  showContours: !value.showMap ? false : value.showContours,
                })
              }
              disabled={isGeneratingSnapshot}
              className={`relative h-7 w-12 rounded-full transition ${
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
        </div>

        <div className="rounded-[24px] border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Contours</p>
              <p className="mt-1 text-xs text-neutral-500">
                Show contour lines for terrain-based map styling.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  showContours: !value.showContours,
                })
              }
              className={`relative h-7 w-12 rounded-full transition ${
                value.showContours ? 'bg-neutral-900' : 'bg-neutral-200'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-pressed={value.showContours}
              disabled={isGeneratingSnapshot || !value.showMap}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  value.showContours ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Start / End Points
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Show minimal route markers on the map.
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
              className={`relative h-7 w-12 rounded-full transition ${
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

        <div className="rounded-[24px] border border-neutral-200 p-4">
          <p className="text-sm font-medium text-neutral-900">Route Color</p>
          <p className="mt-1 text-xs text-neutral-500">
            Choose the route highlight color.
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
              Red
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
              Orange
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <div className="space-y-4">
            <div>
              <FieldLabel required>Activity Name</FieldLabel>
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
                placeholder="E.G. CYCLING TOUR"
                maxLength={60}
                rows={2}
                disabled={isGeneratingSnapshot}
                className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm leading-6 uppercase outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel required>Activity Date</FieldLabel>
              <input
                type="text"
                value={value.date}
                onChange={handleInput('date')}
                placeholder="E.g. 3 NOVEMBER 2024"
                maxLength={20}
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel>Location</FieldLabel>
              <input
                type="text"
                value={value.location}
                onChange={handleInput('location')}
                placeholder="Where did this happen?"
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
              <FieldLabel required>Units</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'KM', value: 'km' },
                  { label: 'MILES', value: 'miles' },
                ] as const).map((option) => {
                  const selected = value.units === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField(value, onChange, 'units', option.value)}
                      disabled={isGeneratingSnapshot}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        selected
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel>Distance</FieldLabel>
              <input
                type="text"
                value={value.distance}
                onChange={handleInput('distance')}
                placeholder="Enter Distance"
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <FieldLabel required>Time</FieldLabel>
              <input
                type="text"
                value={value.time}
                onChange={handleInput('time')}
                placeholder="00:00"
                disabled={isGeneratingSnapshot}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isGeneratingSnapshot}
                className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingSnapshot ? 'Preparing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}