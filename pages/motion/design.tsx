import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import DesignSettingsPanel, { type DesignEditorState } from '../../components/DesignSettingsPanel';
import FriendPickerModal from '../../components/FriendPickerModal';
import ProfileGroup from '../../components/ProfileGroup';
import { addManualProfileUser } from '../../lib/design/friends';
import { useInstagramProfile } from '../../hooks/useInstagramProfile';
import { createProfileUser, dedupeProfileUsers } from '../../lib/profileUsers';
import { useDesignConfig } from '../../context/DesignConfigContext';
import { buildDesignConfig } from '../../lib/poster/buildDesignConfig';
import { capturePosterCard } from '../../lib/poster/capturePosterCard';
import type { ProfileUser } from '../../types/profile';

// ─── Motion Poster Card ───────────────────────────────────────────────────────

type MotionPosterCardProps = {
  compositeImage: string | null;
  title: string;
  date: string;
  location: string;
  distance: string;
  elevation: string;
  duration: string;
  shirtColor: 'white' | 'black';
  instagramEnabled: boolean;
  instagramId: string;
  selectedUsers: ProfileUser[];
  onRemoveUser?: (userId: string) => void;
};

function MotionPosterCard({
  compositeImage,
  title,
  date,
  location,
  distance,
  elevation,
  duration,
  shirtColor,
  instagramEnabled,
  instagramId,
  selectedUsers,
}: MotionPosterCardProps) {
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
      return dedupeProfileUsers([createProfileUser('manual', instagramId, '', true)]);
    }
    return [];
  }, [instagramEnabled, instagramId, selectedUsers]);

  const cardClass = isDark ? 'bg-[#090b10] text-white' : 'bg-white text-neutral-900';
  const primaryTextClass = isDark ? 'text-[#EDE8DC]' : 'text-[#1A1A1A]';
  const secondaryTextClass = isDark ? 'text-[#EDE8DC] font-medium' : 'text-[#1A1A1A] font-semibold';

  const hasDistance = Boolean(distanceValue && distanceValue !== '-');
  const hasElevation = Boolean(elevation && elevation !== '-');
  const hasDuration = Boolean(duration && duration !== '-');
  const stats = [
    hasDistance && { key: 'distance', value: formatWithCommas(distanceValue), label: 'KM' },
    hasElevation && { key: 'elevation', value: `${formatWithCommas(elevation)}m`, label: 'ELEV GAIN' },
    hasDuration && { key: 'duration', value: duration, label: 'TIME' },
  ].filter(Boolean) as { key: string; value: string; label: string }[];
  const justifyClass = stats.length === 1 ? 'justify-center' : stats.length === 2 ? 'justify-around' : 'justify-between';

  return (
    <div
      className={`w-[428px] max-w-full mx-auto rounded-[32px] overflow-hidden px-6 pt-6 pb-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] ${cardClass}`}
    >
      {/* Instagram profiles */}
      <div
        style={{
          height: 52,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          marginBottom: instagramEnabled ? 20 : 0,
        }}
      >
        {instagramEnabled && (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <ProfileGroup users={instagramUsers} compact={false} isDark={isDark} />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mt-3 flex min-h-[30px] flex-col items-center text-center">
        <h1
          className={`font-serif text-[2.35rem] font-bold leading-[1.02] tracking-[-0.02em] uppercase text-center ${primaryTextClass}`}
          style={{ whiteSpace: 'normal' }}
        >
          {(title || '').split('\n').map((line, i) => (
            <span key={i} style={{ display: 'block' }}>{line}</span>
          ))}
        </h1>

        {(hasLocation || hasDate) && (
          hasLocation ? (
            <div className="mt-7 mx-auto w-full max-w-[380px]">
              <div className="flex items-center justify-between gap-6">
                <span className={`text-[13px] tracking-[0.18em] text-left ${secondaryTextClass}`}>{location}</span>
                {hasDate && <span className={`text-[13px] tracking-[0.16em] uppercase text-right ${secondaryTextClass}`}>{date}</span>}
              </div>
            </div>
          ) : (
            <div className="mt-7">
              {hasDate && <span className={`text-[13px] tracking-[0.16em] uppercase ${secondaryTextClass}`}>{date}</span>}
            </div>
          )
        )}
      </div>

      {/* Composite image */}
      <div className="mt-5 flex justify-center">
        <div className="w-full max-w-[380px]">
          {compositeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={compositeImage}
              alt="Motion composite"
              className="w-full rounded-[18px]"
              style={{ display: 'block' }}
            />
          ) : (
            <div
              className={`flex aspect-square items-center justify-center rounded-[18px] border ${
                isDark ? 'border-neutral-700 bg-black text-neutral-500' : 'border-neutral-200 bg-white text-neutral-400'
              }`}
            >
              <span className="text-xs">No composite image</span>
            </div>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="mt-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={isDark ? '/resources/white_logo.png' : '/resources/black_logo.png'}
          alt="MOVIATA"
          style={{ height: 23, width: 'auto' }}
        />
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="mt-3">
          <div className="mx-auto w-full max-w-[380px]">
            <div className={`flex items-center ${justifyClass}`}>
              {stats.map((stat) => (
                <div key={stat.key} className="min-w-0 flex-1 text-center">
                  <p className={`mt-1.5 text-[1.45rem] font-bold leading-none tracking-[-0.03em] ${primaryTextClass}`}>
                    {stat.value}
                  </p>
                  <p className={`mt-1 text-[10px] font-medium uppercase tracking-[0.24em] ${secondaryTextClass}`}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_EDITOR: DesignEditorState = {
  instagramEnabled: false,
  shirtColor: 'white',
  routeColor: 'red',
  showMap: false,
  showRoutePoints: false,
  showContours: false,
  title: '',
  date: '',
  location: '',
  distance: '',
  elevation: '',
  time: '',
  myInstagramId: '',
  selectedUsers: [],
};

export default function MotionDesignPage() {
  const router = useRouter();
  const instagram = useInstagramProfile();
  const { saveDraft, consumeEditorSnapshot } = useDesignConfig();
  const t = useTranslations('design');

  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [processedComposite, setProcessedComposite] = useState<string | null>(null);
  const [editor, setEditor] = useState<DesignEditorState>(DEFAULT_EDITOR);
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = sessionStorage.getItem('motionCompositeImage');
    if (!img) {
      void router.replace('/motion/composite');
      return;
    }
    setCompositeImage(img);
    // Restore editor state when returning from confirm (same as route design)
    const snapshot = consumeEditorSnapshot();
    if (snapshot?.editor) {
      setEditor({ ...DEFAULT_EDITOR, ...(snapshot.editor as DesignEditorState) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile zoom-out to fit viewport
  useEffect(() => {
    const el = pageRef.current;
    if (!el || !compositeImage) return;
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
  }, [compositeImage]);

  // Process composite image: transparent background + black circles for dark shirt
  useEffect(() => {
    if (!compositeImage) { setProcessedComposite(null); return; }
    let cancelled = false;
    const img = document.createElement('img');
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setProcessedComposite(compositeImage); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const isDark = editor.shirtColor === 'black';
      for (let i = 0; i < d.length; i += 4) {
        if ((d[i] ?? 0) < 30 && (d[i + 1] ?? 0) < 30 && (d[i + 2] ?? 0) < 30) {
          d[i + 3] = 0;
        } else {
          const r = d[i] ?? 0;
          const g = d[i + 1] ?? 0;
          const b = d[i + 2] ?? 0;
          const isOrange = r > 150 && r > g * 1.5 && r > b * 2;
          if (!isOrange) {
            if (isDark) {
              d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
            } else {
              d[i] = 0; d[i + 1] = 0; d[i + 2] = 0;
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      if (!cancelled) setProcessedComposite(canvas.toDataURL('image/png'));
    };
    img.src = compositeImage;
    return () => { cancelled = true; };
  }, [compositeImage, editor.shirtColor]);

  // Auto-insert \n in title at the render wrap point
  useEffect(() => {
    if (!editor.title || editor.title.includes('\n')) return;
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
    setEditor((prev) => ({
      ...prev,
      title: words.slice(0, breakIndex).join(' ') + '\n' + words.slice(breakIndex).join(' '),
    }));
  }, [editor.title]);

  // Instagram profile sync
  useEffect(() => {
    if (!editor.instagramEnabled) return;
    const fetchState = instagram.state.fetchState;
    if (fetchState.status !== 'success') return;
    setEditor((prev) => {
      if (!prev.instagramEnabled) return prev;
      const primaryUser = createProfileUser(
        'fetched_profile',
        fetchState.profile.normalizedHandle,
        fetchState.profile.avatarUrl,
        true,
      );
      const nonPrimary = prev.selectedUsers.filter((u) => !u.isPrimary);
      const next = dedupeProfileUsers([primaryUser, ...nonPrimary]);
      const nextId = fetchState.profile.normalizedHandle;
      if (
        prev.myInstagramId === nextId &&
        prev.selectedUsers.length === next.length &&
        prev.selectedUsers.every((u, i) => next[i] && u.id === next[i]!.id)
      ) return prev;
      return { ...prev, myInstagramId: nextId, selectedUsers: next };
    });
  }, [editor.instagramEnabled, instagram.state.fetchState]);

  const handleEditorChange = useCallback(
    (next: DesignEditorState) => {
      if (!next.instagramEnabled) {
        instagram.removeInstagramProfile();
        setEditor({ ...next, myInstagramId: '', selectedUsers: next.selectedUsers.filter((u) => !u.isPrimary) });
      } else {
        setEditor({ ...next, selectedUsers: dedupeProfileUsers(next.selectedUsers) });
      }
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
        if (editor.selectedUsers.filter((u) => !u.isPrimary).length >= 1) return;
        const next = await addManualProfileUser(editor.selectedUsers, username);
        setEditor((prev) => ({ ...prev, selectedUsers: next }));
      } finally {
        setIsAddingFriend(false);
      }
    },
    [editor.selectedUsers],
  );

  const handleRemoveUser = useCallback((userId: string) => {
    setEditor((prev) => ({ ...prev, selectedUsers: prev.selectedUsers.filter((u) => u.id !== userId) }));
  }, []);

  const handleLoadMyInstagram = useCallback(async () => {
    await instagram.fetchProfile(editor.myInstagramId);
  }, [editor.myInstagramId, instagram]);

  const handleConfirm = async () => {
    if (isGeneratingSnapshot) return;
    try {
      setIsGeneratingSnapshot(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      const config = buildDesignConfig('motion', editor, [], null);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      let snapshot: string | null = null;
      const posterCard = document.getElementById('poster-card');
      if (posterCard) {
        snapshot = await capturePosterCard(posterCard, null);
      }
      sessionStorage.setItem('motionDesignEditor', JSON.stringify(editor));
      saveDraft({ config, posterSnapshot: snapshot, editorSnapshot: editor });
      await router.push('/confirm');
    } catch (e) {
      console.error('[motion design confirm] failed:', e);
      alert(e instanceof Error ? `${t('failedToGenerate')} ${e.message}` : t('failedToGenerate'));
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  return (
    <Layout title={t('workspace')}>
      {compositeImage && (
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
                onClick={() => void router.push('/motion/composite')}
                className="text-sm text-neutral-500 transition hover:text-neutral-900"
              >
                {t('back')}
              </button>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[1440px] gap-4 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="lg:sticky lg:top-8 flex min-h-[50dvh] lg:min-h-[720px] self-start flex-col items-center justify-center lg:rounded-[20px] lg:border lg:border-neutral-200 bg-[#F2F2F7] py-6 lg:p-10">
              <div id="poster-card" className="relative w-[420px] max-w-full mx-auto">
                <MotionPosterCard
                  compositeImage={processedComposite}
                  title={editor.title}
                  date={editor.date}
                  location={editor.location}
                  distance={editor.distance}
                  elevation={editor.elevation}
                  duration={editor.time}
                  shirtColor={editor.shirtColor}
                  instagramEnabled={editor.instagramEnabled}
                  instagramId={editor.myInstagramId}
                  selectedUsers={editor.selectedUsers}
                  onRemoveUser={handleRemoveUser}
                />
              </div>
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
              isMapReady={true}
              isGeneratingSnapshot={isGeneratingSnapshot}
              onConfirm={handleConfirm}
              activityType="motion"
            />
          </div>
        </div>
      )}

      <FriendPickerModal
        isOpen={isFriendPickerOpen}
        selectedUsers={editor.selectedUsers}
        onClose={handleCloseFriendPicker}
        onManualAdd={handleManualAdd}
      />
    </Layout>
  );
}