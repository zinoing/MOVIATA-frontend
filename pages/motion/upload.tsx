import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';
import { IS_RUNPOD, getPresignedUploadUrl, extractFramesFromR2, getFrameImageUrl, type FrameInfo, type ExtractFramesResponse } from '../../lib/motionApi';

const ACCEPTED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi'];
const ACCEPTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png'];
const ACCEPTED_FORMATS = [...ACCEPTED_VIDEO_FORMATS, ...ACCEPTED_IMAGE_FORMATS];
const MAX_SIZE_MB = 500;
const MAX_VIDEO_DURATION_SEC = 60;
const MAX_FRAME_SELECT = 4;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'processing' }
  | {
      status: 'success';
      fileType: 'video' | 'image';
      jobId: string;
      framesExtracted: number;
      durationSec: number;
      fps: number;
      frames: FrameInfo[];
    }
  | { status: 'error'; message: string };

// ─── Icons ────────────────────────────────────────────────────────────────────

function PinAddIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="3.5" />
      <line x1="10" y1="10.5" x2="10" y2="17" />
      <line x1="8" y1="7" x2="12" y2="7" />
      <line x1="10" y1="5" x2="10" y2="9" />
    </svg>
  );
}

// ─── Timeline selector ────────────────────────────────────────────────────────

function TimelineSelector({
  jobId,
  frames,
  seekIndex,
  onSeek,
  selectedFrameIndices,
  onPinAdd,
  onRemoveSlot,
  onContinue,
  onReset,
  frameSrcs,
}: {
  jobId: string;
  frames: FrameInfo[];
  seekIndex: number;
  onSeek: (i: number) => void;
  selectedFrameIndices: number[];
  onPinAdd: () => void;
  onRemoveSlot: (idx: number) => void;
  onContinue: () => void;
  onReset: () => void;
  frameSrcs: Record<number, string>;
}) {
  const t = useTranslations('motionUpload');

  const currentFrame = frames[seekIndex] ?? null;
  const isFull = selectedFrameIndices.length >= MAX_FRAME_SELECT;
  const isCurrentPinned = currentFrame !== null && selectedFrameIndices.includes(currentFrame.index);
  const maxSeek = Math.max(frames.length - 1, 1);

  void jobId; // used by parent to fetch frameSrcs

  return (
    <div className="flex flex-col gap-3">

      {/* ── Main card ── */}
      <div className="rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">

        {/* Preview */}
        <div className="relative m-3 overflow-hidden rounded-[16px] bg-[#F5F5F5] min-h-[140px]">
          {currentFrame ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={frameSrcs[currentFrame.index] ?? ''}
              alt={`Frame ${currentFrame.index}`}
              className="block h-auto w-full"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
            </div>
          )}

          {/* Timestamp badge */}
          {currentFrame && (
            <div className="absolute bottom-3 left-3 rounded-[6px] bg-black/40 px-2 py-0.5">
              <span className="font-mono text-[11px] tabular-nums text-white">
                {currentFrame.timestamp_sec.toFixed(2)}s
              </span>
            </div>
          )}

          {/* Pin buttons */}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={onPinAdd}
              disabled={isFull || isCurrentPinned}
              title={t('frameSelect.pinAdd')}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/85 text-neutral-700 shadow-sm backdrop-blur-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <PinAddIcon />
            </button>
          </div>
        </div>

        {/* Timeline scrubber */}
        <div className="relative px-5 py-3">
          <div className="pointer-events-none absolute inset-x-[25px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#E0E0E0]">
            <div
              className="h-full rounded-full bg-[#FF5A1F] transition-none"
              style={{ width: `${maxSeek > 0 ? (seekIndex / maxSeek) * 100 : 0}%` }}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-[25px] top-1/2 h-0">
            {selectedFrameIndices.map((frameIdx) => {
              const pos = frames.findIndex((f) => f.index === frameIdx);
              if (pos < 0) return null;
              const pct = frames.length > 1 ? (pos / (frames.length - 1)) * 100 : 0;
              return (
                <div
                  key={frameIdx}
                  className="absolute top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5A1F]"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={maxSeek}
            step={1}
            value={seekIndex}
            onChange={(e) => onSeek(Number(e.target.value))}
            className={[
              'relative z-10 w-full cursor-pointer appearance-none bg-transparent',
              '[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-[3.5px] [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_5px_rgba(0,0,0,0.22)]',
              '[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent',
              '[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_5px_rgba(0,0,0,0.22)]',
            ].join(' ')}
          />
        </div>

        {/* Slot row */}
        <div className="px-3 pb-3">
          <div className="rounded-[14px] bg-[#F0F0F0] px-4 py-3">
            <div className="flex items-center gap-2.5">

              {/* 4 slots */}
              <div className="flex flex-1 gap-2">
                {Array.from({ length: MAX_FRAME_SELECT }).map((_, i) => {
                  const frameIdx = selectedFrameIndices[i];
                  const filled = frameIdx !== undefined;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => filled && onRemoveSlot(frameIdx)}
                      disabled={!filled}
                      className="relative flex-1 overflow-hidden rounded-[10px] bg-[#E0E0E0] transition disabled:cursor-default"
                      style={{ aspectRatio: '1 / 1' }}
                    >
                      {filled && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={frameSrcs[frameIdx] ?? ''}
                            alt={`Selected frame ${frameIdx}`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          <div className="pointer-events-none absolute inset-0 z-10 rounded-[10px] shadow-[inset_0_0_0_2.5px_#FF5A1F]" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Counter */}
              <span className={[
                'shrink-0 text-sm font-semibold tabular-nums',
                isFull ? 'text-neutral-900' : 'text-neutral-400',
              ].join(' ')}>
                {selectedFrameIndices.length}/4
              </span>

            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <button
        type="button"
        onClick={onContinue}
        disabled={selectedFrameIndices.length === 0}
        className="w-full rounded-[14px] bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('actions.continue')}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-[14px] bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-200"
      >
        {t('actions.uploadAnother')}
      </button>

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MotionUploadPage() {
  const router = useRouter();
  const t = useTranslations('motionUpload');
  const tCommon = useTranslations('common');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);
  const [seekIndex, setSeekIndex] = useState(0);

  // blob URL cache: frameIndex → object URL
  const [frameSrcs, setFrameSrcs] = useState<Record<number, string>>({});
  const fetchingFrames = useRef<Set<number>>(new Set());
  const frameSrcsRef = useRef<Record<number, string>>({});

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(frameSrcsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function ensureFrameSrc(jobId: string, frameIndex: number) {
    if (frameSrcsRef.current[frameIndex] !== undefined) return;
    if (fetchingFrames.current.has(frameIndex)) return;
    fetchingFrames.current.add(frameIndex);
    getFrameImageUrl(jobId, frameIndex)
      .then((url) => {
        frameSrcsRef.current[frameIndex] = url;
        setFrameSrcs((prev) => ({ ...prev, [frameIndex]: url }));
      })
      .catch(() => { /* show empty img on error */ })
      .finally(() => { fetchingFrames.current.delete(frameIndex); });
  }

  // Fetch current seek frame
  useEffect(() => {
    if (uploadState.status !== 'success') return;
    const frame = uploadState.frames[seekIndex];
    if (frame) ensureFrameSrc(uploadState.jobId, frame.index);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekIndex, uploadState.status === 'success' && (uploadState as { jobId?: string }).jobId]);

  // Fetch selected slot frames
  useEffect(() => {
    if (uploadState.status !== 'success') return;
    selectedFrameIndices.forEach((idx) => ensureFrameSrc((uploadState as { jobId: string }).jobId, idx));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrameIndices.join(','), uploadState.status === 'success' && (uploadState as { jobId?: string }).jobId]);

  // Restore state from sessionStorage
  useEffect(() => {
    const savedJobId = sessionStorage.getItem('motionJobId');
    const savedFramesMeta = sessionStorage.getItem('motionFramesMeta');
    const savedSelectedFrames = sessionStorage.getItem('motionSelectedFrames');
    const savedFileType = sessionStorage.getItem('motionFileType');
    if (!savedJobId || !savedFramesMeta || savedFileType === 'image') return;
    try {
      const frames = JSON.parse(savedFramesMeta) as FrameInfo[];
      const selectedIndices = savedSelectedFrames ? (JSON.parse(savedSelectedFrames) as number[]) : [];
      setSelectedFrameIndices(selectedIndices);
      setUploadState({ status: 'success', fileType: 'video', jobId: savedJobId, framesExtracted: frames.length, durationSec: 0, fps: 0, frames });
    } catch { /* start fresh */ }
  }, []);

  function validateFile(file: File): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(ext)) return t('errors.invalidFormat');
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return t('errors.tooLarge', { max: MAX_SIZE_MB });
    return null;
  }

  function checkVideoDuration(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration > MAX_VIDEO_DURATION_SEC ? t('errors.tooLong', { max: MAX_VIDEO_DURATION_SEC }) : null);
      };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      video.src = url;
    });
  }

  async function handleFileChange(file: File) {
    const error = validateFile(file);
    if (error) { setUploadState({ status: 'error', message: error }); return; }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (ACCEPTED_VIDEO_FORMATS.includes(ext)) {
      const durationError = await checkVideoDuration(file);
      if (durationError) { setUploadState({ status: 'error', message: durationError }); return; }
    }
    setSelectedFile(file);
    setUploadState({ status: 'idle' });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  async function handleUpload() {
    if (!selectedFile || uploadState.status === 'uploading') return;
    cancelledRef.current = false;

    const ext = '.' + (selectedFile.name.split('.').pop()?.toLowerCase() ?? '');
    const isImage = ACCEPTED_IMAGE_FORMATS.includes(ext);
    const contentType = selectedFile.type || 'application/octet-stream';

    // ── Step 1: get presigned R2 upload URL from backend
    setUploadState({ status: 'uploading', progress: 0 });
    let presignedUrl: string;
    let objectKey: string;
    try {
      const result = await getPresignedUploadUrl(selectedFile.name, contentType);
      presignedUrl = result.presigned_url;
      objectKey = result.object_key;
    } catch (err) {
      setUploadState({ status: 'error', message: err instanceof Error ? err.message : t('errors.uploadFailed') });
      return;
    }

    if (cancelledRef.current) return;

    // ── Step 2: PUT file directly to R2 (bypasses RunPod payload limit)
    const uploadOk = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable)
          setUploadState({ status: 'uploading', progress: Math.round((e.loaded / e.total) * 100) });
      });
      xhr.upload.addEventListener('load', () => setUploadState({ status: 'processing' }));
      xhr.addEventListener('load', () => resolve(xhr.status >= 200 && xhr.status < 300));
      xhr.addEventListener('error', () => resolve(false));
      xhr.addEventListener('abort', () => resolve(false));
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(selectedFile);
    });

    if (cancelledRef.current) return;

    if (!uploadOk) {
      setUploadState({ status: 'error', message: t('errors.uploadFailed') });
      return;
    }

    // ── Step 3: trigger frame extraction via R2 key
    setUploadState({ status: 'processing' });
    try {
      const data = await extractFramesFromR2(objectKey, isImage ? 1 : 15);
      if (cancelledRef.current) return;
      applyExtractResult(data, isImage);
    } catch (err) {
      if (cancelledRef.current) return;
      setUploadState({ status: 'error', message: err instanceof Error ? err.message : t('errors.uploadFailed') });
    }
  }

  function applyExtractResult(data: ExtractFramesResponse, isImage: boolean) {
    const frames: FrameInfo[] = (data.frames ?? []).map((f) => ({
      index: f.index,
      timestamp_sec: f.timestamp_sec,
      path: f.path,
      data: f.data,
    }));

    sessionStorage.setItem('motionJobId', data.job_id);
    sessionStorage.setItem('motionFramesMeta', JSON.stringify(frames));

    if (isImage) {
      sessionStorage.setItem('motionFileType', 'image');
      const indices = frames.length > 0 ? [frames[0].index] : [];
      sessionStorage.setItem('motionSelectedFrames', JSON.stringify(indices));
      sessionStorage.setItem('motionSelectedFramePaths', JSON.stringify(
        frames.length > 0 ? [frames[0].path] : []
      ));
      if (IS_RUNPOD && frames.length > 0 && frames[0].data) {
        sessionStorage.setItem('motionSelectedFrameData', JSON.stringify([frames[0].data]));
      }
      void router.push('/motion/point-select');
      return;
    }

    sessionStorage.setItem('motionFileType', 'video');
    setSeekIndex(0);
    setSelectedFrameIndices([]);
    sessionStorage.setItem('motionSelectedFrames', JSON.stringify([]));
    sessionStorage.setItem('motionSelectedFramePaths', JSON.stringify([]));
    if (IS_RUNPOD) sessionStorage.setItem('motionSelectedFrameData', JSON.stringify([]));
    setUploadState({
      status: 'success',
      fileType: 'video',
      jobId: data.job_id,
      framesExtracted: data.frames_extracted,
      durationSec: data.duration_sec,
      fps: data.fps,
      frames,
    });
  }

  function handleCancel() {
    xhrRef.current?.abort();
    cancelledRef.current = true;
    setUploadState({ status: 'idle' });
  }

  function handleReset() {
    setSelectedFile(null);
    setSelectedFrameIndices([]);
    setSeekIndex(0);
    setUploadState({ status: 'idle' });
  }

  function syncSelection(indices: number[], frames: FrameInfo[]) {
    sessionStorage.setItem('motionSelectedFrames', JSON.stringify(indices));
    const paths = indices.map((idx) => frames.find((f) => f.index === idx)?.path ?? '').filter(Boolean);
    sessionStorage.setItem('motionSelectedFramePaths', JSON.stringify(paths));
    if (IS_RUNPOD) {
      const data = indices.map((idx) => frames.find((f) => f.index === idx)?.data ?? '').filter(Boolean);
      sessionStorage.setItem('motionSelectedFrameData', JSON.stringify(data));
    }
  }

  function handlePinAdd() {
    if (uploadState.status !== 'success') return;
    const current = uploadState.frames[seekIndex];
    if (!current) return;
    if (selectedFrameIndices.includes(current.index) || selectedFrameIndices.length >= MAX_FRAME_SELECT) return;
    const next = [...selectedFrameIndices, current.index];
    setSelectedFrameIndices(next);
    syncSelection(next, uploadState.frames);
  }

  function handleRemoveSlot(frameIndex: number) {
    if (uploadState.status !== 'success') return;
    const next = selectedFrameIndices.filter((i) => i !== frameIndex);
    setSelectedFrameIndices(next);
    syncSelection(next, uploadState.frames);
  }

  function handleContinue() {
    if (uploadState.status === 'success') syncSelection(selectedFrameIndices, uploadState.frames);
    void router.push('/motion/point-select');
  }

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing';
  const isSuccess = uploadState.status === 'success';
  const isImageFile = selectedFile
    ? ACCEPTED_IMAGE_FORMATS.includes('.' + (selectedFile.name.split('.').pop()?.toLowerCase() ?? ''))
    : false;

  return (
    <Layout title="Upload Video — MOVIATA">
      <div className="min-h-screen bg-white px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5A1F] mb-3">
              {t('label')}
            </p>
            <h1 className="text-4xl font-black tracking-[-0.02em] text-neutral-950 sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 text-sm leading-7 text-neutral-500">
              {t('subtitle')}
            </p>
          </div>

          {/* ── Upload state ── */}
          {!isSuccess && (
            <div className="rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden bg-white">

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={[
                  'flex flex-col items-center justify-center gap-3 px-8 py-12 cursor-pointer transition-colors border-b border-neutral-100',
                  isDragging ? 'bg-neutral-50' : isUploading ? 'bg-white cursor-default' : 'hover:bg-neutral-50',
                ].join(' ')}
              >
                <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS.join(',')} className="hidden" onChange={handleInputChange} />

                <div className={['flex h-14 w-14 items-center justify-center rounded-full transition-colors', selectedFile ? 'bg-neutral-900' : 'bg-neutral-100'].join(' ')}>
                  {selectedFile ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {selectedFile ? (
                  <>
                    <p className="text-sm font-semibold text-neutral-950 text-center break-all">{selectedFile.name}</p>
                    <p className="text-xs text-neutral-400">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                    {!isUploading && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleReset(); }} className="mt-1 text-xs text-neutral-400 underline underline-offset-2 transition-colors hover:text-neutral-600">
                        {t('changeFile')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-neutral-950">{t('dropzone.title')}</p>
                    <p className="text-xs text-neutral-400 text-center">{t('dropzone.subtitle', { formats: ACCEPTED_FORMATS.join(', '), max: MAX_SIZE_MB })}</p>
                  </>
                )}
              </div>

              {/* Upload progress (FileReader phase) */}
              {uploadState.status === 'uploading' && (
                <div className="px-8 py-5 border-b border-neutral-100">
                  <div className="flex justify-between text-xs text-neutral-500 mb-2">
                    <span>{isImageFile ? t('uploadingImage') : t('uploadingFile')}</span>
                    <span>{uploadState.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full bg-neutral-900 transition-all duration-200" style={{ width: `${uploadState.progress}%` }} />
                  </div>
                </div>
              )}

              {/* Processing (RunPod call phase) */}
              {uploadState.status === 'processing' && (
                <div className="px-8 py-5 border-b border-neutral-100">
                  <div className="flex justify-between text-xs text-neutral-500 mb-2">
                    <span>{t('uploading')}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-neutral-900" style={{ animation: 'indeterminate 1.2s ease-in-out infinite' }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-6 py-6 flex flex-col gap-4">
                {uploadState.status === 'error' && <p className="text-sm text-red-500">{uploadState.message}</p>}
                {isUploading ? (
                  <button type="button" onClick={handleCancel} className="w-full rounded-[14px] bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-200">
                    {tCommon('back')}
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => void handleUpload()} disabled={!selectedFile} className="w-full rounded-[14px] bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-40">
                      {isImageFile ? t('actions.uploadImage') : t('actions.upload')}
                    </button>
                    <button type="button" onClick={() => void router.back()} className="text-center text-xs text-neutral-400 transition-colors hover:text-neutral-600">
                      {tCommon('back')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Timeline state ── */}
          {isSuccess && uploadState.status === 'success' && (
            <TimelineSelector
              jobId={uploadState.jobId}
              frames={uploadState.frames}
              seekIndex={seekIndex}
              onSeek={setSeekIndex}
              selectedFrameIndices={selectedFrameIndices}
              onPinAdd={handlePinAdd}
              onRemoveSlot={handleRemoveSlot}
              onContinue={handleContinue}
              onReset={handleReset}
              frameSrcs={frameSrcs}
            />
          )}

        </div>
      </div>
    </Layout>
  );
}
