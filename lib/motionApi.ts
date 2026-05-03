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
 *
 * Upload flow:
 *   1. Browser captures frames via canvas → base64 JPEG stored in sessionStorage
 *   2. processComposite() → sends frame_data (base64 array) to RunPod/FastAPI
 */

const MOTION_API_BASE_URL = process.env.NEXT_PUBLIC_MOTION_API_BASE_URL ?? '';
const RUNPOD_API_KEY      = process.env.NEXT_PUBLIC_RUNPOD_API_KEY ?? '';
export const IS_RUNPOD    = MOTION_API_BASE_URL.includes('runpod.ai');

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface RunPodInput {
  endpoint: string;
  method?: 'GET' | 'POST';
  body?: Record<string, string | number | string[]>;
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

  const formData = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (Array.isArray(v)) v.forEach((i) => formData.append(k, i));
    else formData.append(k, String(v));
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
): Promise<T> {
  if (IS_RUNPOD) return callRunPod<T>({ endpoint, method, body });
  return callDirectApi<T>(endpoint, method, body);
}

// ── Image helper ──────────────────────────────────────────────────────────────

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

// ── API calls ─────────────────────────────────────────────────────────────────

/** POST /api/video/process
 *  frameData: raw base64 JPEG strings (no data: prefix), one per framePath */
export function processComposite(params: {
  jobId: string;
  framePaths: string[];
  frameData: string[];
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
  if (params.frameData.length > 0) body['frame_data'] = JSON.stringify(params.frameData);
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
