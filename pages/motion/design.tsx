import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import DesignSettingsPanel, { type DesignEditorState } from '../../components/DesignSettingsPanel';
import FriendPickerModal from '../../components/FriendPickerModal';
import PosterCard from '../../components/PosterCard';
import { addManualProfileUser } from '../../lib/design/friends';
import { useInstagramProfile } from '../../hooks/useInstagramProfile';
import { createProfileUser, dedupeProfileUsers } from '../../lib/profileUsers';
import { useDesignConfig } from '../../context/DesignConfigContext';
import { buildDesignConfig } from '../../lib/poster/buildDesignConfig';
import { capturePosterCard } from '../../lib/poster/capturePosterCard';
import { POSTER_W, POSTER_H } from '../../lib/poster/dimensions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth === 0) {
        reject(new Error('Image loaded in broken state'));
      } else {
        resolve(img);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Captures the motion poster card by hiding the composite <img> (which is a
 * large data URL that html-to-image cannot reliably render inside SVG
 * foreignObject), capturing the card UI separately, then drawing the composite
 * image onto the output canvas manually — mirroring how capturePosterCard
 * handles the map layer in the path design flow.
 */
async function captureMotionCard(el: HTMLElement, compositeDataUrl: string | null): Promise<string> {
  const PIXEL_RATIO = 3;

  // capturePosterCard uses el.firstElementChild for sizing measurements
  const captureTarget = (el.firstElementChild as HTMLElement | null) ?? el;
  const cardRect = captureTarget.getBoundingClientRect();
  const cardW = POSTER_W;
  const cardH = POSTER_H;

  const compositeImg = el.querySelector<HTMLImageElement>('img[alt="Motion composite"]');

  if (!compositeDataUrl || !compositeImg) {
    return capturePosterCard(el, null);
  }

  // Measure before any DOM mutation
  const imgRect = compositeImg.getBoundingClientRect();
  const relX = imgRect.left - cardRect.left;
  const relY = imgRect.top - cardRect.top;

  // Hide the composite image so capturePosterCard only renders the card UI
  const savedVisibility = compositeImg.style.visibility;
  compositeImg.style.visibility = 'hidden';
  try {
    const cardPng = await capturePosterCard(el, null);
    const [cardImg, compImg] = await Promise.all([loadImage(cardPng), loadImage(compositeDataUrl)]);

    const canvas = document.createElement('canvas');
    canvas.width = cardW * PIXEL_RATIO;
    canvas.height = cardH * PIXEL_RATIO;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(cardImg, 0, 0);
    ctx.drawImage(
      compImg,
      Math.round(relX * PIXEL_RATIO),
      Math.round(relY * PIXEL_RATIO),
      Math.round(imgRect.width * PIXEL_RATIO),
      Math.round(imgRect.height * PIXEL_RATIO),
    );
    return canvas.toDataURL('image/png');
  } finally {
    compositeImg.style.visibility = savedVisibility;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_EDITOR: DesignEditorState = {
  instagramEnabled: false,
  shirtColor: 'white',
  routeColor: 'orange',
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
    img.onerror = () => {
      if (!cancelled) setProcessedComposite(compositeImage);
    };
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth === 0) { setProcessedComposite(compositeImage); return; }
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
        if ((d[i + 3] ?? 0) === 0) continue;
        const r = d[i] ?? 0;
        const g = d[i + 1] ?? 0;
        const b = d[i + 2] ?? 0;
        // White/near-white pixels are the background — make transparent
        if (r > 225 && g > 225 && b > 225) {
          d[i + 3] = 0;
        } else {
          // Dark pixels are halftone dots — convert color based on shirt
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
        snapshot = await captureMotionCard(posterCard, processedComposite);
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
                <PosterCard
                  coordinates={[]}
                  title={editor.title}
                  date={editor.date}
                  location={editor.location}
                  distance={editor.distance}
                  elevation={editor.elevation}
                  duration={editor.time}
                  shirtColor={editor.shirtColor}
                  routeColor="orange"
                  showMap={false}
                  showRoutePoints={false}
                  showContours={false}
                  instagramEnabled={editor.instagramEnabled}
                  instagramId={editor.myInstagramId}
                  selectedUsers={editor.selectedUsers}
                  onRemoveUser={handleRemoveUser}
                  titleFallback=""
                  mapSlot={
                    processedComposite ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={processedComposite}
                        alt="Motion composite"
                        className="w-full rounded-[18px]"
                        style={{ display: 'block' }}
                      />
                    ) : (
                      <div className={`flex aspect-square items-center justify-center rounded-[18px] border ${
                        editor.shirtColor === 'black'
                          ? 'border-neutral-700 bg-black text-neutral-500'
                          : 'border-neutral-200 bg-white text-neutral-400'
                      }`}>
                        <span className="text-xs">No composite image</span>
                      </div>
                    )
                  }
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