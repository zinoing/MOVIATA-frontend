import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import { MOTION_API_BASE_URL } from '../../lib/api';

const MAX_POINTS = 3;
const DOT_COLORS = ['#FF5A1F', '#3B82F6', '#3B82F6'] as const;

type XY = { x: number; y: number };

export default function MotionPointSelectPage() {
  const router = useRouter();
  const t = useTranslations('motionPointSelect');
  const tCommon = useTranslations('common');

  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  // Map<frameIndex, XY[]> — 0~MAX_POINTS 개
  const [points, setPoints] = useState<Map<number, XY[]>>(new Map());
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const id = sessionStorage.getItem('motionJobId');
    if (!id) { void router.replace('/motion/upload'); return; }
    setJobId(id);

    try {
      const raw = sessionStorage.getItem('motionSelectedFrames');
      if (raw) setSelectedFrames(JSON.parse(raw) as number[]);
    } catch { /* ignore */ }

    // 이전에 저장된 포인트 복원
    try {
      const coordsRaw = sessionStorage.getItem('motionPointCoords');
      if (coordsRaw) {
        const saved = JSON.parse(coordsRaw) as { frame_index: number; points: XY[] }[];
        const map = new Map<number, XY[]>();
        for (const entry of saved) map.set(entry.frame_index, entry.points);
        setPoints(map);
      }
    } catch { /* ignore */ }
  }, [router]);

  if (!jobId || selectedFrames.length === 0) return null;

  const currentFrameIndex = selectedFrames[currentIdx];
  const totalFrames = selectedFrames.length;
  const currentPoints = points.get(currentFrameIndex) ?? [];
  const isFull = currentPoints.length >= MAX_POINTS;

  const allPointed = selectedFrames.every((fi) => (points.get(fi)?.length ?? 0) > 0);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isFull) return;
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPoints((prev) => {
      const existing = prev.get(currentFrameIndex) ?? [];
      return new Map(prev).set(currentFrameIndex, [...existing, { x, y }]);
    });
  }

  function handleDotClick(e: React.MouseEvent, dotIdx: number) {
    e.stopPropagation();
    setPoints((prev) => {
      const existing = prev.get(currentFrameIndex) ?? [];
      const next = existing.filter((_, i) => i !== dotIdx);
      return new Map(prev).set(currentFrameIndex, next);
    });
  }

  function handleContinue() {
    const coords = selectedFrames
      .map((fi) => {
        const pts = points.get(fi);
        if (!pts || pts.length === 0) return null;
        return {
          frame_index: fi,
          points: pts.map((p, i) => ({ ...p, type: i === 0 ? 'person' : 'object' })),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    sessionStorage.setItem('motionPointCoords', JSON.stringify(coords));
    void router.push('/motion/composite');
  }

  return (
    <Layout title="Select Point — MOVIATA">
      <div className="min-h-screen bg-white px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5A1F] mb-3">
              {t('label')}
            </p>
            <h1 className="text-4xl font-black tracking-[-0.02em] text-neutral-950 sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 text-sm leading-7 text-neutral-500">{t('subtitle')}</p>

          {/* Color legend */}
          <div className="mt-4 flex items-center justify-center gap-5 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#FF5A1F]" />
              {t('personPointLabel')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#3B82F6]" />
              {t('objectPointLabel')}
            </span>
          </div>
          </div>

          {/* Card */}
          <div className="rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* Frame counter */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                {t('frameCounter', { current: currentIdx + 1, total: totalFrames })}
              </span>
              <span className={['text-xs font-semibold', currentPoints.length > 0 ? 'text-[#FF5A1F]' : 'text-neutral-300'].join(' ')}>
                {currentPoints.length > 0 ? t('pointSet') : t('pointUnset')}
              </span>
            </div>

            {/* Image area */}
            <div
              className="relative mx-3 mb-3 overflow-hidden rounded-[14px] bg-[#F5F5F5] select-none"
              style={{ cursor: isFull ? 'default' : 'crosshair' }}
            >
              <div onClick={handleImageClick} className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={`${MOTION_API_BASE_URL}/api/video/frame/${jobId}/${currentFrameIndex}`}
                  alt={`Frame ${currentFrameIndex}`}
                  className="block w-full h-auto"
                  draggable={false}
                />
                {currentPoints.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => handleDotClick(e, i)}
                    title={t('dotRemoveHint')}
                    style={{
                      position: 'absolute',
                      left: `${p.x * 100}%`,
                      top: `${p.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: DOT_COLORS[i],
                      boxShadow: `0 0 0 2px white, 0 0 0 3.5px ${DOT_COLORS[i]}`,
                    }}
                    className="h-5 w-5 rounded-full transition hover:scale-110 focus:outline-none"
                  />
                ))}
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="px-3 pb-4">
              <div className="flex gap-2 justify-center">
                {selectedFrames.map((fi, i) => {
                  const count = points.get(fi)?.length ?? 0;
                  const isActive = i === currentIdx;
                  return (
                    <button
                      key={fi}
                      type="button"
                      onClick={() => setCurrentIdx(i)}
                      className={[
                        'relative flex-1 overflow-hidden rounded-[10px] transition',
                        isActive ? 'ring-2 ring-[#FF5A1F]' : 'ring-1 ring-neutral-200',
                      ].join(' ')}
                      style={{ aspectRatio: '1 / 1', maxWidth: 56 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${MOTION_API_BASE_URL}/api/video/frame/${jobId}/${fi}`}
                        alt={`Frame ${fi}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {count > 0 && (
                        <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-[#FF5A1F] shadow-[0_0_0_1.5px_white]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentIdx(currentIdx - 1)}
              disabled={currentIdx === 0}
              className="flex-1 rounded-[14px] bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('prev')}
            </button>
            {currentIdx < totalFrames - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(currentIdx + 1)}
                className="flex-1 rounded-[14px] bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F]"
              >
                {t('next')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={!allPointed}
                className="flex-1 rounded-[14px] bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('continue')}
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => void router.push('/motion/upload')}
              className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
            >
              {tCommon('back')}
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
}
