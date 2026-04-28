/**
 * Motion Composite Service client — supports two modes:
 *
 *  direct  (local dev)  NEXT_PUBLIC_MOTION_API_BASE_URL=http://localhost:8000
 *                       Calls FastAPI endpoints directly via fetch/FormData.
 *                       Image URLs are returned as plain HTTP strings.
 *
 *  runpod  (production) NEXT_PUBLIC_MOTION_API_BASE_URL=https://api.runpod.ai/v2/.../runsync
 *                       Every call is wrapped in RunPod's job format.
 *                       Image responses (base64) are decoded to blob URLs.
 *
 * Mode is auto-detected from the URL — no extra env var needed.
 */

const MOTION_API_BASE_URL = process.env.NEXT_PUBLIC_MOTION_API_BASE_URL ?? '';
const RUNPOD_API_KEY      = process.env.NEXT_PUBLIC_RUNPOD_API_KEY ?? '';
export const IS_RUNPOD    = MOTION_API_BASE_URL.includes('runpod.ai');

// ── Types ─────────────────────────────────────────────────────────────────────

export type FrameInfo = { index: number; timestamp_sec: number; path: string };

export interface ExtractFramesResponse {
  job_id: string;
  frame_interval: number;
  fps: number;
  total_video_frames: number;
  duration_sec: number;
  frames_extracted: number;
  output_dir: string;
  frames: FrameInfo[];
}

export interface ProcessResponse {
  job_id: string;
  celery_task_id: string;
  status: string;
}

export interface LayerMeta {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  frame_w: number;
  frame_h: number;
}

export interface StatusResponse {
  task_id: string;
  status: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress?: { step: string; progress: number };
  result?: { job_id: string; layers: LayerMeta[] };
  error?: string;
}

interface RunPodFilePayload {
  filename: string;
  content_type: string;
  data: string; // base64
}

interface RunPodInput {
  endpoint: string;
  method?: 'GET' | 'POST';
  body?: Record<string, string | number | string[]>;
  files?: Record<string, RunPodFilePayload>;
}

interface ImagePayload {
  content_type: string;
  encoding: 'base64';
  data: string;
}

// ── RunPod caller ─────────────────────────────────────────────────────────────

async function callRunPod<T>(input: RunPodInput): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (RUNPOD_API_KEY) headers['Authorization'] = `Bearer ${RUNPOD_API_KEY}`;

  const resp = await fetch(MOTION_API_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ input }),
  });

  if (!resp.ok) throw new Error(`RunPod HTTP ${resp.status}: ${resp.statusText}`);

  const json = (await resp.json()) as { output: T };
  const out = json.output;
  if (out && typeof out === 'object' && 'error' in out)
    throw new Error(String((out as { error: unknown }).error));
  return out;
}

// ── Direct (FastAPI) caller ───────────────────────────────────────────────────

async function callDirectApi<T>(
  endpoint: string,
  method: 'GET' | 'POST',
  body: Record<string, string | number | string[]> = {},
  files: Record<string, RunPodFilePayload> = {},
): Promise<T> {
  const url = `${MOTION_API_BASE_URL}${endpoint}`;

  if (method === 'GET') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (Array.isArray(v)) v.forEach((i) => params.append(k, i));
      else params.append(k, String(v));
    }
    const qs = params.toString();
    const resp = await fetch(qs ? `${url}?${qs}` : url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json() as Promise<T>;
  }

  // POST — build FormData
  const formData = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (Array.isArray(v)) v.forEach((i) => formData.append(k, i));
    else formData.append(k, String(v));
  }
  for (const [field, meta] of Object.entries(files)) {
    const binary = atob(meta.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: meta.content_type });
    formData.append(field, blob, meta.filename);
  }

  const resp = await fetch(url, { method: 'POST', body: formData });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// ── Unified dispatcher ────────────────────────────────────────────────────────

function callApi<T>(
  endpoint: string,
  method: 'GET' | 'POST',
  body: Record<string, string | number | string[]> = {},
  files: Record<string, RunPodFilePayload> = {},
): Promise<T> {
  if (IS_RUNPOD) {
    return callRunPod<T>({ endpoint, method, body, files: Object.keys(files).length ? files : undefined });
  }
  return callDirectApi<T>(endpoint, method, body, files);
}

// ── Image helper ──────────────────────────────────────────────────────────────

/**
 * Fetch a motion-service image endpoint and return a URL.
 *
 * RunPod mode  → decodes base64 response and returns a blob URL.
 *               Caller must revoke via URL.revokeObjectURL() when done.
 *
 * Direct mode  → returns a plain HTTP URL; no fetch is performed.
 *               URL.revokeObjectURL() on it is a safe no-op.
 */
export async function fetchMotionImageUrl(endpoint: string): Promise<string> {
  if (!IS_RUNPOD) {
    return `${MOTION_API_BASE_URL}${endpoint}`;
  }
  const payload = await callRunPod<ImagePayload>({ endpoint, method: 'GET' });
  const binary = atob(payload.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: payload.content_type });
  return URL.createObjectURL(blob);
}

// ── File helper ───────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** POST /api/video/extract-frames (pre-encoded base64 variant for progress tracking) */
export function extractFramesBase64(
  filename: string,
  contentType: string,
  base64: string,
  n: number,
): Promise<ExtractFramesResponse> {
  return callApi<ExtractFramesResponse>(
    '/api/video/extract-frames',
    'POST',
    { n },
    { file: { filename, content_type: contentType || 'application/octet-stream', data: base64 } },
  );
}

/** POST /api/video/extract-frames */
export async function extractFrames(file: File, n: number): Promise<ExtractFramesResponse> {
  const data = await fileToBase64(file);
  return extractFramesBase64(file.name, file.type, data, n);
}

/** GET /api/video/frame/:jobId/:frameIndex → URL (blob or direct) */
export function getFrameImageUrl(jobId: string, frameIndex: number): Promise<string> {
  return fetchMotionImageUrl(`/api/video/frame/${jobId}/${frameIndex}`);
}

/** POST /api/video/process */
export function processComposite(params: {
  jobId: string;
  framePaths: string[];
  personColor: string;
  backgroundColor: string;
  outlineThickness: number;
  mode: string;
  pointCoords?: unknown;
}): Promise<ProcessResponse> {
  const body: Record<string, string | number | string[]> = {
    job_id:            params.jobId,
    frame_paths:       params.framePaths,
    person_color:      params.personColor,
    background_color:  params.backgroundColor,
    outline_thickness: params.outlineThickness,
    mode:              params.mode,
  };
  if (params.pointCoords) body['point_coords'] = JSON.stringify(params.pointCoords);
  return callApi<ProcessResponse>('/api/video/process', 'POST', body);
}

/** GET /api/video/status/:taskId */
export function getJobStatus(taskId: string): Promise<StatusResponse> {
  return callApi<StatusResponse>(`/api/video/status/${taskId}`, 'GET');
}

/** GET /api/video/layer/:jobId/:index → URL (blob or direct) */
export function getLayerImageUrl(jobId: string, index: number): Promise<string> {
  return fetchMotionImageUrl(`/api/video/layer/${jobId}/${index}`);
}
