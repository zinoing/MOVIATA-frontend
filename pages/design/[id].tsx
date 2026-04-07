import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import PosterCard from '../../components/PosterCard';
import DesignSettingsPanel, {
  type DesignEditorState,
} from '../../components/DesignSettingsPanel';
import FriendPickerModal from '../../components/FriendPickerModal';
import {
  type ActivityDetail,
  formatDistanceKm,
  formatMinutes,
} from '../../lib/activity';
import { apiFetch } from '../../lib/api';
import { addManualProfileUser } from '../../lib/design/friends';
import { decodePolyline, getPrimaryRoute  } from '../../lib/polyline';
import { useInstagramProfile } from '../../hooks/useInstagramProfile';
import { createProfileUser, dedupeProfileUsers } from '../../lib/profileUsers';
import { useDesignConfig } from '../../context/DesignConfigContext';
import { buildDesignConfig } from '../../lib/poster/buildDesignConfig';
import { capturePosterCard } from '../../lib/poster/capturePosterCard';
import type { FixedMapViewState } from '../../lib/poster/types';

type ActivityMapData = {
  id?: string;
  polyline?: string;
  summary_polyline?: string;
};

type ActivityResponse = ActivityDetail & {
  map?: ActivityMapData;
};

type ActivityFetchState = 'idle' | 'loading' | 'success' | 'error';

type RouteState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; coordinates: [number, number][] }
  | { status: 'not_found' };

function formatPosterDate(value?: string) {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatDistanceMiles(distanceMeters?: number) {
  if (!distanceMeters) return '-';
  return `${(distanceMeters / 1609.344).toFixed(2)} mi`;
}

function restoreEditorFromConfig(config: import('../../lib/poster/types').DesignConfig): DesignEditorState {
  return {
    instagramEnabled: config.instagramEnabled,
    shirtColor: config.shirtColor,
    title: config.title,
    date: config.date,
    location: config.location,
    units: config.units,
    distance: config.distance,
    time: config.duration,
    myInstagramId: config.myInstagramId,
    selectedUsers: config.selectedUsers,
    routeColor: config.routeColor,
    showMap: config.showMap ?? true,
    showRoutePoints: config.showRoutePoints,
    showContours: config.mapStyle === 'contours',
  };
}

function buildInitialEditorState(activity: ActivityResponse, activityType: 'running' | 'hiking' | null): DesignEditorState {
  return {
    instagramEnabled: false,
    shirtColor: 'white',
    routeColor: 'red',
    showMap: true,
    showRoutePoints: false,
    showContours: activityType === 'hiking',
    title: activity.name || 'Untitled Activity',
    date: formatPosterDate(activity.start_date_local),
    location: '',
    units: 'km',
    distance: formatDistanceKm(activity.distance),
    time: formatMinutes(activity.moving_time),
    myInstagramId: '',
    selectedUsers: [],
  };
}

function convertDistanceValue(value: string, to: 'km' | 'miles') {
  const numeric = parseFloat(value.replace(/[^\d.]/g, ''));
  if (Number.isNaN(numeric)) return value;

  if (to === 'miles') {
    return `${(numeric * 0.621371).toFixed(2)} mi`;
  }

  return `${(numeric / 0.621371).toFixed(2)} km`;
}

function getRouteState(
  activityFetchState: ActivityFetchState,
  errorMessage: string | null,
  coordinates: [number, number][],
): RouteState {
  if (activityFetchState === 'loading' || activityFetchState === 'idle') {
    return { status: 'loading' };
  }

  if (activityFetchState === 'error') {
    return {
      status: 'error',
      message: errorMessage || '활동 정보를 불러오지 못했습니다.',
    };
  }

  if (coordinates.length > 1) {
    return { status: 'ready', coordinates };
  }

  return { status: 'not_found' };
}

export default function DesignWorkspacePage() {
  const router = useRouter();
  const { id } = router.query;

  const instagram = useInstagramProfile();
  const { saveDraft, config: savedConfig } = useDesignConfig();

  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [editor, setEditor] = useState<DesignEditorState | null>(null);
  const [activityType, setActivityType] = useState<'running' | 'hiking' | null>(null);
  const [activityFetchState, setActivityFetchState] =
    useState<ActivityFetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [fixedMapViewState, setFixedMapViewState] =
    useState<FixedMapViewState | null>(null);
  // Stores the map pixels captured at idle time, while the WebGL context is live.
  const mapSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('activityType');
    if (stored === 'running' || stored === 'hiking') {
      setActivityType(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof id !== 'string') return;

    let ignore = false;

    async function loadActivity() {
      try {
        setActivityFetchState('loading');
        setError(null);

        const data = await apiFetch<ActivityResponse>(`/activities/${id}`);
        const stored = sessionStorage.getItem('activityType');
        const type = stored === 'running' || stored === 'hiking' ? stored : null;

        if (!ignore) {
          setActivity(data);
          setEditor(
            savedConfig && savedConfig.activityId === id
              ? restoreEditorFromConfig(savedConfig)
              : buildInitialEditorState(data, type),
          );
          setActivityFetchState('success');
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : '활동 정보를 불러오지 못했습니다.',
          );
          setActivityFetchState('error');
        }
      }
    }

    void loadActivity();

    return () => {
      ignore = true;
    };
  }, [id]);

  const encodedPolyline = useMemo(() => {
    return activity?.map?.polyline || activity?.map?.summary_polyline || '';
  }, [activity]);

  const coordinates = useMemo<[number, number][]>(() => {
    if (!encodedPolyline) return [];

    try {
      const rawCoordinates = decodePolyline(encodedPolyline);
      return getPrimaryRoute(rawCoordinates);
    } catch {
      return [];
    }
  }, [encodedPolyline]);

  const routeState = useMemo(
    () => getRouteState(activityFetchState, error, coordinates),
    [activityFetchState, error, coordinates],
  );

  const posterCoordinates =
    routeState.status === 'ready' ? routeState.coordinates : [];

  const previewDistance = useMemo(() => {
    if (!activity || !editor) return '-';

    if (editor.units === 'miles') {
      return formatDistanceMiles(activity.distance);
    }

    return editor.distance;
  }, [activity, editor]);

  const handleOpenFriendPicker = useCallback(() => {
    if (isAddingFriend) return;
    setIsFriendPickerOpen(true);
  }, [isAddingFriend]);

  const handleCloseFriendPicker = useCallback(() => {
    setIsFriendPickerOpen(false);
  }, []);

  const handleManualAdd = useCallback(
    async (username: string) => {
      try {
        setIsAddingFriend(true);

        if (!editor) return;

        const extraFriendCount = editor.selectedUsers.filter(
          (user) => !user.isPrimary,
        ).length;

        if (extraFriendCount >= 1) return;

        const nextSelectedUsers = await addManualProfileUser(
          editor.selectedUsers,
          username,
        );

        setEditor((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            selectedUsers: nextSelectedUsers,
          };
        });
      } finally {
        setIsAddingFriend(false);
      }
    },
    [editor],
  );

  const handleRemoveUser = useCallback((userId: string) => {
    setEditor((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        selectedUsers: prev.selectedUsers.filter((user) => user.id !== userId),
      };
    });
  }, []);

  const handleEditorChange = useCallback(
    (next: DesignEditorState) => {
      setEditor((prev) => {
        if (!prev) return next;

        const unitsChanged = prev.units !== next.units;
        let updated = next;

        if (unitsChanged) {
          updated = {
            ...next,
            distance: convertDistanceValue(prev.distance, next.units),
          };
        }

        if (!updated.instagramEnabled) {
          instagram.removeInstagramProfile();

          return {
            ...updated,
            myInstagramId: '',
            selectedUsers: updated.selectedUsers.filter(
              (user) => !user.isPrimary,
            ),
          };
        }

        return {
          ...updated,
          selectedUsers: dedupeProfileUsers(updated.selectedUsers),
        };
      });
    },
    [instagram],
  );

  const handleLoadMyInstagram = useCallback(async () => {
    if (!editor) return;
    await instagram.fetchProfile(editor.myInstagramId);
  }, [editor, instagram]);

  useEffect(() => {
    if (!editor?.instagramEnabled) return;

    const fetchState = instagram.state.fetchState;
    if (fetchState.status !== 'success') return;

    setEditor((prev) => {
      if (!prev || !prev.instagramEnabled) return prev;

      const primaryUser = createProfileUser(
        'fetched_profile',
        fetchState.profile.normalizedHandle,
        fetchState.profile.avatarUrl,
        true,
      );

      const nonPrimaryUsers = prev.selectedUsers.filter((user) => !user.isPrimary);
      const nextSelectedUsers = dedupeProfileUsers([
        primaryUser,
        ...nonPrimaryUsers,
      ]);
      const nextInstagramId = fetchState.profile.normalizedHandle;

      const isSameInstagramId = prev.myInstagramId === nextInstagramId;

      const isSameUsers =
        prev.selectedUsers.length === nextSelectedUsers.length &&
        prev.selectedUsers.every((user, index) => {
          const nextUser = nextSelectedUsers[index];
          return (
            !!nextUser &&
            user.id === nextUser.id &&
            user.username === nextUser.username &&
            user.normalizedUsername === nextUser.normalizedUsername &&
            user.avatarUrl === nextUser.avatarUrl &&
            user.isPrimary === nextUser.isPrimary &&
            user.source === nextUser.source
          );
        });

      if (isSameInstagramId && isSameUsers) {
        return prev;
      }

      return {
        ...prev,
        myInstagramId: nextInstagramId,
        selectedUsers: nextSelectedUsers,
      };
    });
  }, [editor?.instagramEnabled, instagram.state.fetchState]);

  // Auto-insert \n in title to match where the poster actually wraps.
  // Uses Range API on the real rendered h1 — the only reliable way to detect
  // the exact wrap point since html-to-image doesn't replicate CSS auto-wrap.
  useEffect(() => {
    if (!editor?.title || editor.title.includes('\n')) return;

    const words = editor.title.split(' ');
    if (words.length <= 1) return;

    const posterCard = document.getElementById('poster-card');
    if (!posterCard) return;

    const h1 = posterCard.querySelector<HTMLElement>('h1');
    if (!h1) return;

    const textNode = Array.from(h1.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE,
    ) as Text | undefined;
    if (!textNode?.textContent) return;

    const text = textNode.textContent;
    const range = document.createRange();

    // Top of the very first character (= top of line 1)
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    const firstTop = range.getBoundingClientRect().top;

    // Find the first word whose first character is on a different (lower) line
    let breakIndex = -1;
    for (let i = 1; i < words.length; i++) {
      // index of the first character of word i in the raw text
      const wordStart = words.slice(0, i).join(' ').length + 1;
      if (wordStart >= text.length) break;

      range.setStart(textNode, wordStart);
      range.setEnd(textNode, wordStart + 1);
      const wordTop = range.getBoundingClientRect().top;

      if (wordTop > firstTop + 5) {
        breakIndex = i;
        break;
      }
    }

    if (breakIndex < 1) return;

    const newTitle =
      words.slice(0, breakIndex).join(' ') +
      '\n' +
      words.slice(breakIndex).join(' ');

    setEditor((prev) => (prev ? { ...prev, title: newTitle } : prev));
  }, [editor?.title]);

  const handleConfirm = async () => {
    if (isGeneratingSnapshot) return;
    if (typeof id !== 'string' || !editor) return;

    try {
      setIsGeneratingSnapshot(true);

      const config = buildDesignConfig(
        id,
        editor,
        posterCoordinates,
        fixedMapViewState,
      );

      let snapshot: string | null = null;
      const posterCard = document.getElementById('poster-card');
      if (posterCard) {
        snapshot = await capturePosterCard(posterCard, mapSnapshotRef.current);
      }

      saveDraft({ config, posterSnapshot: snapshot });
      await router.push('/confirm');
    } catch (e) {
      console.error('[confirm] failed:', e);
      alert(e instanceof Error ? `Failed to generate design: ${e.message}` : 'Failed to generate design.');
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  return (
    <Layout title={activity ? `${activity.name} 디자인` : '디자인 워크스페이스'}>
      {routeState.status === 'loading' && (
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-neutral-600">
            Loading activity information…
          </p>
        </div>
      )}

      {routeState.status === 'error' && (
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-red-600">Error: {routeState.message}</p>
        </div>
      )}

      {(routeState.status === 'ready' || routeState.status === 'not_found') &&
        activity &&
        editor && (
          <div className="min-h-screen bg-white px-4 py-8 lg:px-8">
            {isGeneratingSnapshot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="rounded-2xl bg-white px-6 py-4 shadow-lg">
                  Generating poster...
                </div>
              </div>
            )}
            <div className="mx-auto w-full max-w-[1440px] pb-6">
              <p className="text-sm text-neutral-500">Design workspace</p>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => router.push('/strava/activities')}
                  className="text-sm text-neutral-500 transition hover:text-neutral-900"
                >
                  ← Back to activities
                </button>
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-[1440px] gap-8 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
              <div className="lg:sticky lg:top-8 flex min-h-[720px] self-start flex-col items-center justify-center rounded-[20px] border border-neutral-200 bg-[#F2F2F7] p-6 lg:p-10">
                {routeState.status === 'ready' && (
                  <p className="mb-4 text-xs text-neutral-500 select-none">
                    Scroll to zoom · Drag to move
                  </p>
                )}
                {routeState.status === 'ready' ? (
                  <div id="poster-card" className="relative">
                    <PosterCard
                      coordinates={posterCoordinates}
                      title={editor.title}
                      date={editor.date}
                      location={editor.location}
                      distance={previewDistance}
                      duration={editor.time}
                      shirtColor={editor.shirtColor}
                      routeColor={editor.routeColor}
                      showMap={editor.showMap}
                      showRoutePoints={editor.showRoutePoints}
                      showContours={editor.showContours}
                      instagramEnabled={editor.instagramEnabled}
                      instagramId={editor.myInstagramId}
                      selectedUsers={editor.selectedUsers}
                      onRemoveUser={handleRemoveUser}
                      onMapViewStateChange={setFixedMapViewState}
                      onMapCanvas={(canvas) => {
                        mapSnapshotRef.current = canvas.toDataURL('image/png');
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex w-[450px] max-w-full items-center justify-center rounded-[16px] bg-white p-10 text-sm text-neutral-500 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
                    표시할 경로 데이터가 없습니다.
                  </div>
                )}
              </div>

              <DesignSettingsPanel
                value={editor}
                onChange={handleEditorChange}
                onOpenFriendPicker={handleOpenFriendPicker}
                onRemoveFriend={handleRemoveUser}
                onLoadMyInstagram={handleLoadMyInstagram}
                myInstagramFetchStatus={instagram.state.fetchState.status}
                myInstagramErrorMessage={
                  instagram.state.fetchState.status === 'error' ||
                  instagram.state.fetchState.status === 'not_found'
                    ? instagram.state.fetchState.errorMessage
                    : undefined
                }
                isAddingFriend={isAddingFriend}
                isGeneratingSnapshot={isGeneratingSnapshot}
                onConfirm={handleConfirm}
                activityType={activityType}
              />
            </div>
          </div>
        )}

      {editor && (
        <FriendPickerModal
          isOpen={isFriendPickerOpen}
          selectedUsers={editor.selectedUsers}
          onClose={handleCloseFriendPicker}
          onManualAdd={handleManualAdd}
        />
      )}
    </Layout>
  );
}