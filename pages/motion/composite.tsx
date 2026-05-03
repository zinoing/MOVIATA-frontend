import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import {
  processComposite,
  getJobStatus,
  getLayerImageUrl,
  getFrameImageUrl,
  type LayerMeta,
} from '../../lib/motionApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type LayerTransform = { dx: number; dy: number; scale: number; rotation: number };

type DragState =
  | { type: 'move'; idx: number; mx0: number; my0: number; dx0: number; dy0: number }
  | { type: 'rotate'; idx: number; cx: number; cy: number; startAngle: number; rotation0: number }
  | { type: 'resize'; idx: number; cx: number; cy: number; startDist: number; scale0: number };

type ProcessState =
  | { status: 'idle' }
  | { status: 'processing'; step: string; progress: number }
  | { status: 'success'; jobId: string; layers: LayerMeta[] }
  | { status: 'error'; message: string };

type FrameMeta = { index: number; timestamp_sec: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TRANSFORM: LayerTransform = { dx: 0, dy: 0, scale: 1, rotation: 0 };

const RESIZE_HANDLES: { pos: React.CSSProperties; cursor: string }[] = [
  { pos: { top: -5, left: -5 },                                          cursor: 'nw-resize' },
  { pos: { top: -5, left: '50%', transform: 'translateX(-50%)' },        cursor: 'n-resize'  },
  { pos: { top: -5, right: -5 },                                         cursor: 'ne-resize' },
  { pos: { top: '50%', right: -5, transform: 'translateY(-50%)' },       cursor: 'e-resize'  },
  { pos: { bottom: -5, right: -5 },                                      cursor: 'se-resize' },
  { pos: { bottom: -5, left: '50%', transform: 'translateX(-50%)' },     cursor: 's-resize'  },
  { pos: { bottom: -5, left: -5 },                                       cursor: 'sw-resize' },
  { pos: { top: '50%', left: -5, transform: 'translateY(-50%)' },        cursor: 'w-resize'  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MotionCompositePage() {
  const router = useRouter();
  const t = useTranslations('motionComposite');
  const tCommon = useTranslations('common');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastTaskIdRef = useRef<string | null>(null);
  const layerRefs = useRef<(HTMLImageElement | null)[]>([]);

  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<number[]>([]);
  const [selectedFramePaths, setSelectedFramePaths] = useState<string[]>([]);
  const [framesMeta, setFramesMeta] = useState<FrameMeta[]>([]);
  const [pointCoords, setPointCoords] = useState<{ frame_index: number; points: { x: number; y: number }[] }[]>([]);
  const [processState, setProcessState] = useState<ProcessState>({ status: 'idle' });

  const [transforms, setTransforms] = useState<LayerTransform[]>([]);
  const [activeLayer, setActiveLayer] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // blob URL caches
  const [frameSrcs, setFrameSrcs] = useState<Record<number, string>>({});
  const [loadedFrames, setLoadedFrames] = useState<Record<number, boolean>>({});
  const [layerSrcs, setLayerSrcs] = useState<Record<number, string>>({});
  const frameSrcsRef = useRef<Record<number, string>>({});
  const layerSrcsRef = useRef<Record<number, string>>({});
  const fetchingFrames = useRef<Set<number>>(new Set());
  const fetchingLayers = useRef<Set<number>>(new Set());

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(frameSrcsRef.current).forEach((url) => URL.revokeObjectURL(url));
      Object.values(layerSrcsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function ensureFrameSrc(jid: string, frameIndex: number) {
    if (frameSrcsRef.current[frameIndex] !== undefined) return;
    if (fetchingFrames.current.has(frameIndex)) return;
    fetchingFrames.current.add(frameIndex);
    getFrameImageUrl(jid, frameIndex)
      .then((url) => {
        frameSrcsRef.current[frameIndex] = url;
        setFrameSrcs((prev) => ({ ...prev, [frameIndex]: url }));
      })
      .catch(() => {})
      .finally(() => { fetchingFrames.current.delete(frameIndex); });
  }

  function ensureLayerSrc(jid: string, index: number) {
    if (layerSrcsRef.current[index] !== undefined) return;
    if (fetchingLayers.current.has(index)) return;
    fetchingLayers.current.add(index);
    getLayerImageUrl(jid, index)
      .then((url) => {
        layerSrcsRef.current[index] = url;
        setLayerSrcs((prev) => ({ ...prev, [index]: url }));
      })
      .catch(() => {})
      .finally(() => { fetchingLayers.current.delete(index); });
  }

  // Window-level mouse handlers for drag
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setTransforms(prev => {
        const next = [...prev];
        if (drag.type === 'move') {
          next[drag.idx] = { ...next[drag.idx]!, dx: drag.dx0 + e.clientX - drag.mx0, dy: drag.dy0 + e.clientY - drag.my0 };
        } else if (drag.type === 'rotate') {
          const angle = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
          next[drag.idx] = { ...next[drag.idx]!, rotation: drag.rotation0 + (angle - drag.startAngle) * (180 / Math.PI) };
        } else if (drag.type === 'resize') {
          const dist = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy);
          next[drag.idx] = { ...next[drag.idx]!, scale: Math.max(0.05, drag.scale0 * (dist / drag.startDist)) };
        }
        return next;
      });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Restore state from sessionStorage
  useEffect(() => {
    const id = sessionStorage.getItem('motionJobId');
    if (!id) { void router.replace('/motion/upload'); return; }
    setJobId(id);
    try { const r = sessionStorage.getItem('motionSelectedFrames'); if (r) setSelectedFrames(JSON.parse(r) as number[]); } catch { /**/ }
    try { const r = sessionStorage.getItem('motionSelectedFramePaths'); if (r) setSelectedFramePaths(JSON.parse(r) as string[]); } catch { /**/ }
    try { const r = sessionStorage.getItem('motionFramesMeta'); if (r) setFramesMeta(JSON.parse(r) as FrameMeta[]); } catch { /**/ }
    try { const r = sessionStorage.getItem('motionPointCoords'); if (r) setPointCoords(JSON.parse(r) as { frame_index: number; points: { x: number; y: number }[] }[]); } catch { /**/ }
    try {
      const r = sessionStorage.getItem('motionProcessResult');
      if (r) {
        const result = JSON.parse(r) as { jobId: string; layers: LayerMeta[] };
        setProcessState({ status: 'success', jobId: result.jobId, layers: result.layers });
      }
    } catch { /**/ }
    try {
      const r = sessionStorage.getItem('motionLayerTransforms');
      if (r) setTransforms(JSON.parse(r) as LayerTransform[]);
    } catch { /**/ }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [router]);

  // Fetch frame thumbnail blob URLs
  useEffect(() => {
    if (!jobId || selectedFrames.length === 0) return;
    selectedFrames.forEach((fi) => ensureFrameSrc(jobId, fi));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, selectedFrames.join(',')]);

  // Fetch layer blob URLs when processing succeeds
  useEffect(() => {
    if (processState.status !== 'success') return;
    const { jobId: jid, layers } = processState;
    // Reset previous layer cache
    Object.values(layerSrcsRef.current).forEach((url) => URL.revokeObjectURL(url));
    layerSrcsRef.current = {};
    fetchingLayers.current.clear();
    setLayerSrcs({});
    layers.forEach((_, i) => ensureLayerSrc(jid, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processState.status === 'success' && (processState as { jobId?: string }).jobId]);

  function startPolling(taskId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    const startedAt = Date.now();
    let consecutivePollErrors = 0;
    let inFlight = false;

    const intervalId = setInterval(async () => {
      if (inFlight) return;
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        clearInterval(intervalId);
        setProcessState({ status: 'error', message: t('errors.timeout') });
        return;
      }
      inFlight = true;
      try {
        const data = await getJobStatus(taskId);
        consecutivePollErrors = 0;

        if (data.status === 'SUCCESS' && data.result) {
          clearInterval(intervalId);
          lastTaskIdRef.current = null;
          const layers = data.result.layers ?? [];
          setTransforms(layers.map(() => ({ ...DEFAULT_TRANSFORM })));
          setProcessState({ status: 'success', jobId: data.result.job_id, layers });
        } else if (data.status === 'FAILURE') {
          clearInterval(intervalId);
          lastTaskIdRef.current = null;
          setProcessState({ status: 'error', message: data.error ?? t('errors.processFailed') });
        } else if (data.status === 'PROGRESS' && data.progress) {
          setProcessState({ status: 'processing', step: data.progress.step, progress: data.progress.progress });
        } else if (data.status === 'PENDING') {
          setProcessState({ status: 'processing', step: 'masking', progress: 0 });
        }
      } catch {
        consecutivePollErrors += 1;
        if (consecutivePollErrors >= 3) {
          clearInterval(intervalId);
          setProcessState({ status: 'error', message: t('errors.pollFailed') });
        }
      } finally {
        inFlight = false;
      }
    }, 2000);
    pollRef.current = intervalId;
  }

  async function handleProcess() {
    if (!jobId || processState.status === 'processing') return;

    setProcessState({ status: 'processing', step: 'masking', progress: 0 });
    setTransforms([]);
    setActiveLayer(null);
    sessionStorage.removeItem('motionProcessResult');
    sessionStorage.removeItem('motionLayerTransforms');

    if (lastTaskIdRef.current) {
      try {
        const data = await getJobStatus(lastTaskIdRef.current);
        if (data.status === 'SUCCESS' && data.result) {
          lastTaskIdRef.current = null;
          const layers = data.result.layers ?? [];
          setTransforms(layers.map(() => ({ ...DEFAULT_TRANSFORM })));
          setProcessState({ status: 'success', jobId: data.result.job_id, layers });
          return;
        }
        if (data.status === 'PENDING' || data.status === 'PROGRESS') {
          startPolling(lastTaskIdRef.current);
          return;
        }
      } catch { /* ignore */ }
      lastTaskIdRef.current = null;
    }

    let taskId: string;
    try {
      const result = await processComposite({
        jobId,
        framePaths: selectedFramePaths,
        personColor: '#ffffff',
        backgroundColor: '#000000',
        outlineThickness: 3,
        mode: 'ghost',
        pointCoords: pointCoords.length > 0 ? pointCoords : undefined,
      });
      taskId = result.celery_task_id;
      lastTaskIdRef.current = taskId;
    } catch (e) {
      setProcessState({ status: 'error', message: e instanceof Error ? e.message : t('errors.startFailed') });
      return;
    }

    startPolling(taskId);
  }

  function handleLayerMouseDown(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    setActiveLayer(idx);
    const tr = transforms[idx] ?? DEFAULT_TRANSFORM;
    dragRef.current = { type: 'move', idx, mx0: e.clientX, my0: e.clientY, dx0: tr.dx, dy0: tr.dy };
  }

  function handleRotateMouseDown(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    const el = layerRefs.current[idx];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    dragRef.current = {
      type: 'rotate', idx, cx, cy,
      startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
      rotation0: transforms[idx]?.rotation ?? 0,
    };
  }

  function handleResizeMouseDown(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    const el = layerRefs.current[idx];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startDist = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (startDist < 1) return;
    dragRef.current = { type: 'resize', idx, cx, cy, startDist, scale0: transforms[idx]?.scale ?? 1 };
  }

  async function handleSubmit() {
    if (processState.status !== 'success' || !containerRef.current) return;
    const { jobId: jid, layers } = processState;
    if (!layers.length) return;
    setIsDownloading(true);
    try {
      const containerW = containerRef.current.clientWidth;
      const frameW = layers[0]!.frame_w;
      const frameH = layers[0]!.frame_h;
      const longer = Math.max(frameW, frameH);
      const frameOffsetX = (longer - frameW) / 2;
      const frameOffsetY = (longer - frameH) / 2;
      const displayScale = containerW / longer;

      const cvs = document.createElement('canvas');
      cvs.width = longer;
      cvs.height = longer;
      const ctx = cvs.getContext('2d')!;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, longer, longer);

      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i]!;
        const tr = transforms[i] ?? DEFAULT_TRANSFORM;

        // Use cached blob URL; fall back to fresh fetch if not ready
        const src = layerSrcsRef.current[i] ?? await getLayerImageUrl(jid, i);
        const img = new Image();
        await new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        });

        const cx = frameOffsetX + layer.x + layer.w / 2 + tr.dx / displayScale;
        const cy = frameOffsetY + layer.y + layer.h / 2 + tr.dy / displayScale;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tr.rotation * Math.PI / 180);
        ctx.scale(tr.scale, tr.scale);
        ctx.drawImage(img, -layer.w / 2, -layer.h / 2, layer.w, layer.h);
        ctx.restore();
      }

      const dataUrl = cvs.toDataURL('image/png');
      sessionStorage.setItem('motionCompositeImage', dataUrl);
      sessionStorage.setItem('motionProcessResult', JSON.stringify({ jobId: jid, layers }));
      sessionStorage.setItem('motionLayerTransforms', JSON.stringify(transforms));
      sessionStorage.removeItem('motionDesignEditor');
      void router.push('/motion/design');
    } finally {
      setIsDownloading(false);
    }
  }

  const isProcessing = processState.status === 'processing';
  const isSuccess = processState.status === 'success';

  const displayFrames: FrameMeta[] =
    framesMeta.length > 0
      ? framesMeta.filter((f) => selectedFrames.includes(f.index))
      : selectedFrames.map((idx) => ({ index: idx, timestamp_sec: 0 }));

  if (!jobId) return null;

  return (
    <Layout title="Motion Composite — MOVIATA">
      <div className="min-h-screen bg-white px-4 py-16">
        <div className="mx-auto w-full max-w-5xl">

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5A1F] mb-3">{t('label')}</p>
            <h1 className="text-4xl font-black tracking-[-0.02em] text-neutral-950 sm:text-5xl">{t('title')}</h1>
            <p className="mt-4 text-sm leading-7 text-neutral-500">{t('subtitle')}</p>
          </div>

          <div className="flex flex-col gap-6">

            {/* Frame thumbnails */}
            <div className="flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{t('frames.title')}</p>
                <span className="text-xs text-neutral-400">{t('frames.count', { count: selectedFrames.length })}</span>
              </div>
              {displayFrames.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                  {displayFrames.map((frame) => (
                    <div key={frame.index} className="flex shrink-0 flex-col items-center gap-1.5">
                      <div className="relative h-20 w-28 overflow-hidden rounded-[10px] bg-neutral-100">
                        {(!frameSrcs[frame.index] || !loadedFrames[frame.index]) && (
                          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frameSrcs[frame.index] ?? ''}
                          alt={`Frame ${frame.index}`}
                          className={`h-full w-full object-cover transition-opacity duration-300 ${loadedFrames[frame.index] ? 'opacity-100' : 'opacity-0'}`}
                          loading="lazy"
                          onLoad={() => setLoadedFrames((prev) => ({ ...prev, [frame.index]: true }))}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                        {frame.timestamp_sec > 0 ? `${frame.timestamp_sec.toFixed(2)}s` : `#${frame.index}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center py-12">
                  <p className="text-sm text-neutral-300">{t('frames.empty')}</p>
                </div>
              )}
            </div>

            {/* Status / Canvas */}
            <div className="flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">

              {/* Idle */}
              {processState.status === 'idle' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{t('idle.title')}</p>
                    <p className="mt-1 text-xs text-neutral-400">{t('idle.subtitle')}</p>
                  </div>
                </div>
              )}

              {/* Processing */}
              {isProcessing && (
                <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{t('processing.title')}</p>
                  <div className="relative h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100">
                    <div className="absolute h-full w-1/4 rounded-full bg-neutral-900 animate-indeterminate" />
                  </div>
                </div>
              )}

              {/* Success: transform canvas */}
              {isSuccess && processState.status === 'success' && (
                <div className="flex flex-1 flex-col gap-3">
                  <p className="text-[11px] text-neutral-400">{t('success.dragHint')}</p>

                  <div className="flex justify-center">
                    <div style={{ position: 'relative', width: '100%', maxWidth: 600 }}>

                      {/* Canvas */}
                      <div
                        ref={containerRef}
                        className="relative w-full select-none overflow-hidden rounded-[18px] bg-black"
                        style={{ aspectRatio: '1 / 1' }}
                        onMouseDown={() => setActiveLayer(null)}
                      >
                        {processState.layers.map((layer, i) => {
                          const tr = transforms[i] ?? DEFAULT_TRANSFORM;
                          const longer = Math.max(layer.frame_w, layer.frame_h);
                          const pxToPct = 100 / longer;
                          const frameOffsetX = (longer - layer.frame_w) / 2;
                          const frameOffsetY = (longer - layer.frame_h) / 2;
                          const leftPct   = (frameOffsetX + layer.x) * pxToPct;
                          const topPct    = (frameOffsetY + layer.y) * pxToPct;
                          const widthPct  = layer.w * pxToPct;
                          const heightPct = layer.h * pxToPct;

                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              ref={el => { layerRefs.current[i] = el; }}
                              src={layerSrcs[i] ?? ''}
                              alt={`Layer ${i + 1}`}
                              draggable={false}
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
                                objectFit: 'fill',
                                cursor: 'move',
                                zIndex: activeLayer === i ? 10 : i + 1,
                                transform: `translate(${tr.dx}px, ${tr.dy}px) rotate(${tr.rotation}deg) scale(${tr.scale})`,
                                transformOrigin: 'center center',
                              }}
                              onMouseDown={(e) => handleLayerMouseDown(e, i)}
                            />
                          );
                        })}
                      </div>

                      {/* Handles overlay */}
                      {activeLayer !== null && (() => {
                        const layer = processState.layers[activeLayer];
                        if (!layer) return null;
                        const tr = transforms[activeLayer] ?? DEFAULT_TRANSFORM;
                        const longer = Math.max(layer.frame_w, layer.frame_h);
                        const pxToPct = 100 / longer;
                        const frameOffsetX = (longer - layer.frame_w) / 2;
                        const frameOffsetY = (longer - layer.frame_h) / 2;
                        const leftPct   = (frameOffsetX + layer.x) * pxToPct;
                        const topPct    = (frameOffsetY + layer.y) * pxToPct;
                        const widthPct  = layer.w * pxToPct;
                        const heightPct = layer.h * pxToPct;
                        return (
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
                            <div
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
                                transform: `translate(${tr.dx}px, ${tr.dy}px) rotate(${tr.rotation}deg) scale(${tr.scale})`,
                                transformOrigin: 'center center',
                                pointerEvents: 'none',
                              }}
                            >
                              <div style={{ position: 'absolute', inset: 0, border: '1.5px solid rgba(255,90,31,0.9)', pointerEvents: 'none' }} />
                              <div style={{ position: 'absolute', top: -20, left: '50%', width: 1, height: 20, background: 'rgba(255,90,31,0.75)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                              <div
                                onMouseDown={(e) => handleRotateMouseDown(e, activeLayer)}
                                style={{ position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'white', border: '1.5px solid rgba(255,90,31,0.9)', cursor: 'grab', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                  <path d="M4 12a8 8 0 1 0 8-8" stroke="#FF5A1F" strokeWidth="2.5" strokeLinecap="round" />
                                  <path d="M4 8v4h4" stroke="#FF5A1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                              {RESIZE_HANDLES.map(({ pos, cursor }, hi) => (
                                <div
                                  key={hi}
                                  onMouseDown={(e) => handleResizeMouseDown(e, activeLayer)}
                                  style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: 'white', border: '1.5px solid rgba(255,90,31,0.9)', cursor, pointerEvents: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', ...pos }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isDownloading}
                    className="w-full rounded-[14px] bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:opacity-50"
                  >
                    {isDownloading ? t('success.submitting') : t('success.submit')}
                  </button>
                </div>
              )}

              {/* Error */}
              {processState.status === 'error' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-400">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-500">{processState.message}</p>
                  <button
                    type="button"
                    onClick={() => void handleProcess()}
                    className="rounded-[14px] bg-neutral-100 px-5 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-200"
                  >
                    {t('errors.retry')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('motionProcessResult');
                sessionStorage.removeItem('motionLayerTransforms');
                void router.push('/motion/point-select');
              }}
              className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
            >
              {tCommon('back')}
            </button>
            {!isProcessing && !isSuccess && (
              <button
                type="button"
                onClick={() => void handleProcess()}
                disabled={selectedFrames.length === 0}
                className="rounded-[14px] bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('actions.generate')}
              </button>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}

