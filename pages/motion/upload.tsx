import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';

const VIDEO_FORMATS = ['.mp4', '.mov'];
const IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const ACCEPTED_FORMATS = [...VIDEO_FORMATS, ...IMAGE_FORMATS];
const MAX_SIZE_MB = 500;
const MAX_VIDEO_DURATION_SEC = 60;
const MAX_CAPTURES = 4;

type CaptureEntry = { timestamp: number; dataUrl: string };

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function MotionUploadPage() {
  const router = useRouter();
  const t = useTranslations('motionUpload');
  const tCommon = useTranslations('common');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [captures, setCaptures] = useState<CaptureEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [videoSrc, imageSrc]);

  // Auto-process image: capture single frame then navigate to point-select
  useEffect(() => {
    if (!imageSrc) return;
    setIsProcessingImage(true);
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) { setIsProcessingImage(false); return; }
      const targetW = Math.min(800, img.naturalWidth);
      const targetH = Math.round(img.naturalHeight * (targetW / img.naturalWidth));
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setIsProcessingImage(false); return; }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const jobId = crypto.randomUUID();
      const frameData = [dataUrl.slice(dataUrl.indexOf(',') + 1)];
      sessionStorage.setItem('motionJobId', jobId);
      sessionStorage.setItem('motionSelectedFrames', JSON.stringify([0]));
      sessionStorage.setItem('motionSelectedFramePaths', JSON.stringify([`uploads/${jobId}/frame_000000.png`]));
      sessionStorage.setItem('motionSelectedFrameData', JSON.stringify(frameData));
      sessionStorage.setItem('motionFramesMeta', JSON.stringify([{ index: 0, timestamp_sec: 0 }]));
      void router.push('/motion/point-select');
    };
    img.onerror = () => setIsProcessingImage(false);
    img.src = imageSrc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  function validateFile(file: File): string | null {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
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
    setError(null);
    const err = validateFile(file);
    if (err) { setError(err); return; }

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');

    if (IMAGE_FORMATS.includes(ext)) {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setVideoSrc(null);
      setCaptures([]);
      setImageSrc(URL.createObjectURL(file));
    } else {
      const durationErr = await checkVideoDuration(file);
      if (durationErr) { setError(durationErr); return; }
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      setVideoSrc(URL.createObjectURL(file));
      setCaptures([]);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFileChange(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFileChange(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || captures.length >= MAX_CAPTURES) return;
    const targetW = Math.min(800, video.videoWidth);
    const targetH = Math.round(video.videoHeight * (targetW / video.videoWidth));
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptures(prev => [...prev, { timestamp: video.currentTime, dataUrl }]);
  }

  function handleRemoveCapture(i: number) {
    setCaptures(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleReset() {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setVideoSrc(null);
    setImageSrc(null);
    setCaptures([]);
    setError(null);
  }

  function handleContinue() {
    if (captures.length === 0) return;
    const jobId = crypto.randomUUID();
    const frameData = captures.map(c => c.dataUrl.slice(c.dataUrl.indexOf(',') + 1));
    const framesMeta = captures.map((c, i) => ({ index: i, timestamp_sec: c.timestamp }));
    const framePaths = captures.map((_, i) => `uploads/${jobId}/frame_${String(i).padStart(6, '0')}.png`);
    sessionStorage.setItem('motionJobId', jobId);
    sessionStorage.setItem('motionSelectedFrames', JSON.stringify(captures.map((_, i) => i)));
    sessionStorage.setItem('motionSelectedFramePaths', JSON.stringify(framePaths));
    sessionStorage.setItem('motionSelectedFrameData', JSON.stringify(frameData));
    sessionStorage.setItem('motionFramesMeta', JSON.stringify(framesMeta));
    void router.push('/motion/point-select');
  }

  const isFull = captures.length >= MAX_CAPTURES;

  return (
    <Layout title="Upload — MOVIATA">
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

          {/* Hidden canvas used for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {!videoSrc && !imageSrc ? (
            /* ── Drop zone ── */
            <div className="rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden bg-white">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  'flex flex-col items-center justify-center gap-3 px-8 py-12 cursor-pointer transition-colors',
                  isDragging ? 'bg-neutral-50' : 'hover:bg-neutral-50',
                ].join(' ')}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FORMATS.join(',')}
                  className="hidden"
                  onChange={handleInputChange}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-neutral-950">{t('dropzone.title')}</p>
                <p className="text-xs text-neutral-400 text-center">
                  {t('dropzone.subtitle', { formats: ACCEPTED_FORMATS.join(', '), max: MAX_SIZE_MB })}
                </p>
              </div>
              {error && (
                <div className="border-t border-neutral-100 px-8 py-4">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
              <div className="border-t border-neutral-100 px-6 py-4 text-center">
                <button
                  type="button"
                  onClick={() => void router.back()}
                  className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {tCommon('back')}
                </button>
              </div>
            </div>
          ) : imageSrc ? (
            /* ── Image preview + auto-process ── */
            <div className="flex flex-col gap-3">
              <div className="rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="relative m-3 overflow-hidden rounded-[16px] bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt="Uploaded" className="w-full object-contain" />
                  {isProcessingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                    </div>
                  )}
                </div>
                <div className="px-4 pb-4 pt-1">
                  <p className="text-xs text-neutral-400 text-center">{t('uploadingImage')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-[14px] bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-200"
              >
                {t('actions.uploadAnother')}
              </button>
            </div>
          ) : (
            /* ── Video player + capture ── */
            <div className="flex flex-col gap-3">
              <div className="rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">

                {/* Video */}
                <div className="relative m-3 overflow-hidden rounded-[16px] bg-black">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    src={videoSrc ?? undefined}
                    controls
                    playsInline
                    className="w-full"
                  />
                  {/* Capture button */}
                  <div className="absolute bottom-14 right-3">
                    <button
                      type="button"
                      onClick={handleCapture}
                      disabled={isFull}
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5A1F] text-white shadow-sm transition hover:bg-[#FF5A1F]/85 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <CameraIcon />
                    </button>
                  </div>
                </div>

                {/* Slot row */}
                <div className="px-3 pb-3">
                  <div className="rounded-[14px] bg-[#F0F0F0] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-1 gap-2">
                        {Array.from({ length: MAX_CAPTURES }).map((_, i) => {
                          const entry = captures[i];
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => entry && handleRemoveCapture(i)}
                              disabled={!entry}
                              className="relative flex-1 overflow-hidden rounded-[10px] bg-[#E0E0E0] transition disabled:cursor-default"
                              style={{ aspectRatio: '1 / 1' }}
                            >
                              {entry && (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={entry.dataUrl}
                                    alt={`Capture ${i + 1}`}
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                  <div className="pointer-events-none absolute inset-0 z-10 rounded-[10px] shadow-[inset_0_0_0_2.5px_#FF5A1F]" />
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <span className={[
                        'shrink-0 text-sm font-semibold tabular-nums',
                        isFull ? 'text-neutral-900' : 'text-neutral-400',
                      ].join(' ')}>
                        {captures.length}/4
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={captures.length === 0}
                className="w-full rounded-[14px] bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('actions.continue')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-[14px] bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-200"
              >
                {t('actions.uploadAnother')}
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
