import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';

const PERSON_COLOR = '#FF5A1F';
const OBJECT_COLOR = '#2F6BFF';

type PointType = 'person' | 'object';
type Pt = { x: number; y: number; type: PointType };

/** Sequential placement: 1st point = person, 2nd point = object.
 *  Returns the next type to place, or null when the frame is full. */
function nextType(pts: Pt[]): PointType | null {
  const hasPerson = pts.some((p) => p.type === 'person');
  const hasObject = pts.some((p) => p.type === 'object');
  if (!hasPerson) return 'person';
  if (!hasObject) return 'object';
  return null;
}

export default function MotionPointSelectPage() {
  const router = useRouter();
  const t = useTranslations('motionPointSelect');
  const tCommon = useTranslations('common');

  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<number[]>([]);
  const [capturedFrameData, setCapturedFrameData] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [points, setPoints] = useState<Map<number, Pt[]>>(new Map());
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const id = sessionStorage.getItem('motionJobId');
    if (!id) { void router.replace('/motion/upload'); return; }
    setJobId(id);

    try {
      const raw = sessionStorage.getItem('motionSelectedFrames');
      if (raw) setSelectedFrames(JSON.parse(raw) as number[]);
    } catch { /**/ }

    try {
      const raw = sessionStorage.getItem('motionSelectedFrameData');
      if (raw) setCapturedFrameData(JSON.parse(raw) as string[]);
    } catch { /**/ }

    try {
      const coordsRaw = sessionStorage.getItem('motionPointCoords');
      if (coordsRaw) {
        const saved = JSON.parse(coordsRaw) as { frame_index: number; points: Partial<Pt>[] }[];
        const map = new Map<number, Pt[]>();
        for (const entry of saved) {
          // Older saves may omit type → treat as person for backward compatibility.
          const pts = entry.points.map((p) => ({ x: p.x!, y: p.y!, type: (p.type ?? 'person') as PointType }));
          map.set(entry.frame_index, pts);
        }
        setPoints(map);
      }
    } catch { /**/ }
  }, [router]);

  if (!jobId || selectedFrames.length === 0) return null;

  const currentFrameIndex = selectedFrames[currentIdx]!;
  const totalFrames = selectedFrames.length;
  const currentPoints = points.get(currentFrameIndex) ?? [];
  const pending = nextType(currentPoints);
  const isFull = pending === null;
  const hasPerson = currentPoints.some((p) => p.type === 'person');
  const hasObject = currentPoints.some((p) => p.type === 'object');
  // Person point is required on every frame; the object point is optional.
  const allPointed = selectedFrames.every((fi) => points.get(fi)?.some((p) => p.type === 'person') ?? false);

  const promptColor = pending === 'object' ? OBJECT_COLOR : pending === 'person' ? PERSON_COLOR : '#9CA3AF';
  const promptText = pending === 'person' ? t('placePerson') : pending === 'object' ? t('placeObject') : t('allPointsSet');

  function frameSrc(slotIdx: number): string {
    const b64 = capturedFrameData[slotIdx];
    return b64 ? `data:image/jpeg;base64,${b64}` : '';
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    const nt = nextType(currentPoints);
    if (!nt) return;
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPoints((prev) => {
      const existing = prev.get(currentFrameIndex) ?? [];
      return new Map(prev).set(currentFrameIndex, [...existing, { x, y, type: nt }]);
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
          points: pts.map((p) => ({ x: p.x, y: p.y, type: p.type })),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    sessionStorage.setItem('motionPointCoords', JSON.stringify(coords));
    void router.push('/motion/composite');
  }

  const legend = [
    { type: 'person' as const, label: t('personPointLabel'), color: PERSON_COLOR, set: hasPerson },
    { type: 'object' as const, label: t('objectPointLabel'), color: OBJECT_COLOR, set: hasObject },
  ];

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

          </div>

          {/* Card */}
          <div className="rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* Frame counter + active prompt */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                {t('frameCounter', { current: currentIdx + 1, total: totalFrames })}
              </span>
              <span className="text-xs font-semibold" style={{ color: promptColor }}>
                {promptText}
              </span>
            </div>

            {/* Point-type legend */}
            <div className="flex items-center gap-2 px-5 pb-2">
              {legend.map((chip) => (
                <span
                  key={chip.type}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                    chip.set ? 'text-neutral-900' : 'text-neutral-400',
                  ].join(' ')}
                  style={pending === chip.type ? { boxShadow: `inset 0 0 0 1px ${chip.color}` } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chip.color, opacity: chip.set ? 1 : 0.35 }}
                  />
                  {chip.label}
                </span>
              ))}
            </div>

            {/* Image area */}
            <div
              className="relative mx-3 mb-3 overflow-hidden rounded-[14px] bg-[#F5F5F5] select-none min-h-[200px]"
              style={{ cursor: isFull ? 'default' : 'crosshair' }}
            >
              <div onClick={handleImageClick} className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={frameSrc(currentIdx)}
                  alt={`Frame ${currentFrameIndex}`}
                  className="block w-full h-auto"
                  draggable={false}
                />
                {currentPoints.map((p, i) => {
                  const color = p.type === 'object' ? OBJECT_COLOR : PERSON_COLOR;
                  return (
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
                        backgroundColor: color,
                        boxShadow: `0 0 0 2px white, 0 0 0 3.5px ${color}`,
                      }}
                      className="h-5 w-5 rounded-full transition hover:scale-110 focus:outline-none"
                    />
                  );
                })}
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="px-3 pb-4">
              <div className="flex gap-2 justify-center">
                {selectedFrames.map((fi, i) => {
                  const framePts = points.get(fi) ?? [];
                  const personSet = framePts.some((p) => p.type === 'person');
                  const objectSet = framePts.some((p) => p.type === 'object');
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
                        src={frameSrc(i)}
                        alt={`Frame ${fi}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 flex gap-0.5">
                        {personSet && (
                          <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_1.5px_white]" style={{ backgroundColor: PERSON_COLOR }} />
                        )}
                        {objectSet && (
                          <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_1.5px_white]" style={{ backgroundColor: OBJECT_COLOR }} />
                        )}
                      </div>
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
