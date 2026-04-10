import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import PosterCard from '../../components/PosterCard';
import DesignSettingsPanel, {
  type DesignEditorState,
} from '../../components/DesignSettingsPanel';
import FriendPickerModal from '../../components/FriendPickerModal';
import { formatDistanceKm, formatMinutes } from '../../lib/activity';
import { addManualProfileUser } from '../../lib/design/friends';
import { useInstagramProfile } from '../../hooks/useInstagramProfile';
import { createProfileUser, dedupeProfileUsers } from '../../lib/profileUsers';
import { useDesignConfig } from '../../context/DesignConfigContext';
import { buildDesignConfig } from '../../lib/poster/buildDesignConfig';
import { capturePosterCard } from '../../lib/poster/capturePosterCard';
import type { FixedMapViewState } from '../../lib/poster/types';
import type { GpxData } from '../../types/gpx';

type LoadState = 'loading' | 'ready' | 'error' | 'not_found';

function buildEditorFromGpx(gpx: GpxData): DesignEditorState {
  return {
    instagramEnabled: false,
    shirtColor: 'white',
    routeColor: 'red',
    showMap: true,
    showRoutePoints: false,
    showContours: false,
    title: gpx.name || 'Untitled Route',
    date: gpx.date,
    location: '',
    distance: formatDistanceKm(gpx.distanceMeters),
    elevation: '',
    time: formatMinutes(gpx.movingTimeSeconds),
    myInstagramId: '',
    selectedUsers: [],
  };
}

export default function GpxDesignPage() {
  const router = useRouter();
  const instagram = useInstagramProfile();
  const { saveDraft } = useDesignConfig();
  const t = useTranslations('design');

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [gpxData, setGpxData] = useState<GpxData | null>(null);
  const [editor, setEditor] = useState<DesignEditorState | null>(null);
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fixedMapViewState, setFixedMapViewState] =
    useState<FixedMapViewState | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapSnapshotRef = useRef<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Read GPX data from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('gpxData');
    if (!raw) {
      void router.replace('/start');
      return;
    }
    try {
      const data = JSON.parse(raw) as GpxData;
      if (!data.coordinates || data.coordinates.length < 2) {
        setLoadState('not_found');
        return;
      }
      setGpxData(data);
      setEditor(buildEditorFromGpx(data));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [router]);

  // Mobile zoom-out to fit viewport
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;

    function applyZoom() {
      if (!el) return;
      if (window.innerWidth >= 1024) { el.style.zoom = ''; return; }
      el.style.zoom = '';
      const contentWidth = document.documentElement.scrollWidth;
      const vw = window.innerWidth;
      if (contentWidth > vw) el.style.zoom = String(vw / contentWidth);
    }

    const timer = setTimeout(applyZoom, 50);
    window.addEventListener('resize', applyZoom);
    return () => { clearTimeout(timer); window.removeEventListener('resize', applyZoom); };
  }, [loadState, editor]);

  // Auto-insert \n in title at the render wrap point
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
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    const firstTop = range.getBoundingClientRect().top;
    let breakIndex = -1;
    for (let i = 1; i < words.length; i++) {
      const wordStart = words.slice(0, i).join(' ').length + 1;
      if (wordStart >= textNode.textContent.length) break;
      range.setStart(textNode, wordStart);
      range.setEnd(textNode, wordStart + 1);
      if (range.getBoundingClientRect().top > firstTop + 5) { breakIndex = i; break; }
    }
    if (breakIndex < 1) return;
    setEditor((prev) =>
      prev
        ? { ...prev, title: words.slice(0, breakIndex).join(' ') + '\n' + words.slice(breakIndex).join(' ') }
        : prev,
    );
  }, [editor?.title]);

  // Instagram profile sync
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
      const nonPrimary = prev.selectedUsers.filter((u) => !u.isPrimary);
      const next = dedupeProfileUsers([primaryUser, ...nonPrimary]);
      const nextId = fetchState.profile.normalizedHandle;
      if (prev.myInstagramId === nextId && prev.selectedUsers.length === next.length &&
        prev.selectedUsers.every((u, i) => next[i] && u.id === next[i]!.id)) return prev;
      return { ...prev, myInstagramId: nextId, selectedUsers: next };
    });
  }, [editor?.instagramEnabled, instagram.state.fetchState]);

  const coordinates = useMemo(
    () => (gpxData ? gpxData.coordinates : []) as [number, number][],
    [gpxData],
  );

  const handleEditorChange = useCallback(
    (next: DesignEditorState) => {
      setEditor((prev) => {
        if (!prev) return next;
        let updated = next;
        if (!updated.instagramEnabled) {
          instagram.removeInstagramProfile();
          return { ...updated, myInstagramId: '', selectedUsers: updated.selectedUsers.filter((u) => !u.isPrimary) };
        }
        return { ...updated, selectedUsers: dedupeProfileUsers(updated.selectedUsers) };
      });
    },
    [instagram],
  );

  const handleOpenFriendPicker = useCallback(() => {
    if (!isAddingFriend) setIsFriendPickerOpen(true);
  }, [isAddingFriend]);

  const handleCloseFriendPicker = useCallback(() => setIsFriendPickerOpen(false), []);

  const handleManualAdd = useCallback(
    async (username: string) => {
      try {
        setIsAddingFriend(true);
        if (!editor) return;
        if (editor.selectedUsers.filter((u) => !u.isPrimary).length >= 1) return;
        const next = await addManualProfileUser(editor.selectedUsers, username);
        setEditor((prev) => prev ? { ...prev, selectedUsers: next } : prev);
      } finally {
        setIsAddingFriend(false);
      }
    },
    [editor],
  );

  const handleRemoveUser = useCallback((userId: string) => {
    setEditor((prev) =>
      prev ? { ...prev, selectedUsers: prev.selectedUsers.filter((u) => u.id !== userId) } : prev,
    );
  }, []);

  const handleLoadMyInstagram = useCallback(async () => {
    if (!editor) return;
    await instagram.fetchProfile(editor.myInstagramId);
  }, [editor, instagram]);

  const handleMapCanvas = useCallback((canvas: HTMLCanvasElement) => {
    mapSnapshotRef.current = canvas.toDataURL('image/png');
    setIsMapReady(true);
  }, []);

  const handleDownload = async () => {
    if (isDownloading || isGeneratingSnapshot || !editor) return;
    if (!isMapReady && !mapSnapshotRef.current) return;

    try {
      setIsDownloading(true);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const posterCard = document.getElementById('poster-card');
      if (!posterCard) return;

      const zoomScale = parseFloat(pageRef.current?.style.zoom || '1') || 1;
      const snapshot = await capturePosterCard(posterCard, mapSnapshotRef.current, zoomScale);

      const a = document.createElement('a');
      a.href = snapshot;
      a.download = `moviata-${editor.title.replace(/\s+/g, '-').toLowerCase() || 'poster'}.png`;
      a.click();
    } catch (e) {
      console.error('[download] failed:', e);
      alert(e instanceof Error ? `Failed to save PNG: ${e.message}` : 'Failed to save PNG.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirm = async () => {
    if (isGeneratingSnapshot || !editor || !gpxData) return;
    try {
      setIsGeneratingSnapshot(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      const config = buildDesignConfig('gpx', editor, coordinates, fixedMapViewState);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      let snapshot: string | null = null;
      const posterCard = document.getElementById('poster-card');
      if (posterCard) {
        const zoomScale = parseFloat(pageRef.current?.style.zoom || '1') || 1;
        snapshot = await capturePosterCard(posterCard, mapSnapshotRef.current, zoomScale);
      }
      saveDraft({ config, posterSnapshot: snapshot });
      await router.push('/confirm');
    } catch (e) {
      console.error('[confirm] failed:', e);
      alert(e instanceof Error ? `${t('failedToGenerate')} ${e.message}` : t('failedToGenerate'));
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  return (
    <Layout title={t('workspace')}>
      {loadState === 'loading' && (
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-neutral-600">{t('loadingGpx')}</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-red-600">{t('failedToLoad')}</p>
        </div>
      )}

      {(loadState === 'ready' || loadState === 'not_found') && editor && (
        <div ref={pageRef} className="min-h-[100dvh] bg-white lg:py-8 lg:px-8">
          {isGeneratingSnapshot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="rounded-2xl bg-white px-6 py-4 shadow-lg">
                {t('generatingPoster')}
              </div>
            </div>
          )}

          <div className="mx-auto w-full max-w-[1440px] px-4 py-4 lg:pb-6 lg:pt-0">
            <p className="text-sm text-neutral-500">{t('workspace')}</p>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => router.push('/start')}
                className="text-sm text-neutral-500 transition hover:text-neutral-900"
              >
                {t('back')}
              </button>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[1440px] gap-4 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="lg:sticky lg:top-8 flex min-h-[50dvh] lg:min-h-[720px] self-start flex-col items-center justify-center lg:rounded-[20px] lg:border lg:border-neutral-200 bg-[#F2F2F7] py-6 lg:p-10">
              {loadState === 'ready' && (
                <p className="mb-4 text-xs text-neutral-500 select-none">
                  {t('scrollHint')}
                </p>
              )}
              {loadState === 'ready' ? (
                <div id="poster-card" className="relative w-[420px] max-w-full mx-auto">
                  <PosterCard
                    coordinates={coordinates}
                    title={editor.title}
                    date={editor.date}
                    location={editor.location}
                    distance={editor.distance}
                    elevation={editor.elevation}
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
                    onMapCanvas={handleMapCanvas}
                  />
                </div>
              ) : (
                <div className="flex w-[450px] max-w-full items-center justify-center rounded-[16px] bg-white p-10 text-sm text-neutral-500 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
                  {t('noRouteData')}
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
              isMapReady={isMapReady}
              isGeneratingSnapshot={isGeneratingSnapshot}
              isDownloading={isDownloading}
              onConfirm={handleConfirm}
              onDownload={handleDownload}
              activityType={null}
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
