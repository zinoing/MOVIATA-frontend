import type {
  FetchInstagramProfileResponse,
  InstagramFetchErrorCode,
  InstagramProfileResult,
  InstagramProfileUiState,
} from '../../types/instagram';
import { isValidInstagramHandle, normalizeInstagramHandle, toDisplayHandle } from './handle';

const INSTAGRAM_PROFILE_ENDPOINT = 'http://localhost:4000/api/v1/instagram/profile/fetch';
const INSTAGRAM_AVATAR_PROXY_ENDPOINT = 'http://localhost:4000/api/v1/instagram/avatar';

export function createInstagramProfileIdleState(): InstagramProfileUiState {
  return { status: 'idle' };
}

export function createInstagramProfileLoadingState(requestHandle: string): InstagramProfileUiState {
  return {
    status: 'loading',
    requestHandle,
  };
}

export function createInstagramProfileSuccessState(profile: InstagramProfileResult): InstagramProfileUiState {
  return {
    status: 'success',
    profile,
  };
}

export function createInstagramProfileErrorState(
  errorCode: Exclude<InstagramFetchErrorCode, 'PROFILE_NOT_FOUND'>,
): InstagramProfileUiState {
  return {
    status: 'error',
    errorCode,
    errorMessage: getInstagramErrorMessage(errorCode),
  };
}

export function createInstagramProfileNotFoundState(): InstagramProfileUiState {
  return {
    status: 'not_found',
    errorCode: 'PROFILE_NOT_FOUND',
    errorMessage: getInstagramErrorMessage('PROFILE_NOT_FOUND'),
  };
}

export function getInstagramErrorMessage(errorCode: InstagramFetchErrorCode): string {
  switch (errorCode) {
    case 'INVALID_HANDLE':
      return 'Enter a valid Instagram ID';
    case 'PROFILE_NOT_FOUND':
      return 'We couldn’t find this profile';
    case 'PRIVATE_OR_UNAVAILABLE':
      return 'This profile is not publicly accessible';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again shortly';
    case 'UPSTREAM_TIMEOUT':
    case 'UPSTREAM_BLOCKED':
    case 'UNKNOWN_FETCH_ERROR':
    default:
      return 'Automatic loading is temporarily unavailable';
  }
}

export function buildInstagramAvatarProxyUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return `${INSTAGRAM_AVATAR_PROXY_ENDPOINT}?url=${encodeURIComponent(rawUrl)}`;
}

export function validateInstagramHandleInput(input: string):
  | {
      isValid: true;
      normalizedHandle: string;
      displayHandle: string;
    }
  | {
      isValid: false;
      normalizedHandle: string;
      displayHandle: string;
      errorCode: 'INVALID_HANDLE';
    } {
  const normalizedHandle = normalizeInstagramHandle(input);
  const displayHandle = normalizedHandle ? toDisplayHandle(normalizedHandle) : '';

  if (!normalizedHandle || !isValidInstagramHandle(normalizedHandle)) {
    return {
      isValid: false,
      normalizedHandle,
      displayHandle,
      errorCode: 'INVALID_HANDLE',
    };
  }

  return {
    isValid: true,
    normalizedHandle,
    displayHandle,
  };
}

export async function fetchInstagramProfile(
  normalizedHandle: string,
  options?: { signal?: AbortSignal },
): Promise<InstagramProfileResult> {
  const response = await fetch(INSTAGRAM_PROFILE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: normalizedHandle }),
    signal: options?.signal,
  });

  let payload: FetchInstagramProfileResponse | null = null;
  try {
    payload = (await response.json()) as FetchInstagramProfileResponse;
  } catch {
    throw new Error('UNKNOWN_FETCH_ERROR');
  }

  if (!response.ok || !payload?.success) {
    const errorCode = payload && !payload.success ? payload.error.code : 'UNKNOWN_FETCH_ERROR';
    throw new Error(errorCode);
  }

  return {
    normalizedHandle: payload.data.normalizedHandle || normalizedHandle,
    displayHandle: payload.data.displayHandle || toDisplayHandle(payload.data.normalizedHandle || normalizedHandle),
    avatarUrl: buildInstagramAvatarProxyUrl(payload.data.avatarUrl || ''),
    avatarSource: payload.data.avatarSource,
    provider: payload.data.provider,
    fetchedAt: payload.data.fetchedAt,
  };
}
