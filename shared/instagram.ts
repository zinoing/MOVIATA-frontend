export type InstagramFetchStatus = 'idle' | 'loading' | 'success' | 'failed';

export type AvatarSource = 'auto' | 'upload' | 'default' | 'none';

export type InstagramFetchErrorCode =
  | 'INVALID_HANDLE'
  | 'PROFILE_NOT_FOUND'
  | 'PRIVATE_OR_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_BLOCKED'
  | 'UNKNOWN_FETCH_ERROR';

export type InstagramProfileState = {
  isInstagramVisible: boolean;
  handleInput: string;
  normalizedHandle: string;
  displayHandle: string;
  fetchStatus: InstagramFetchStatus;
  avatarSource: AvatarSource;
  avatarUrl?: string;
  previewUrl?: string;
  errorCode?: InstagramFetchErrorCode | '';
  errorMessage?: string;
  provider?: string;
  lastFetchedAt?: string;
};

export type FetchInstagramProfileRequest = {
  handle: string;
};

export type FetchInstagramProfileSuccessResponse = {
  success: true;
  data: {
    normalizedHandle: string;
    displayHandle: string;
    avatarUrl: string;
    avatarSource: 'auto';
    provider: string;
    cached: boolean;
    fetchedAt: string;
  };
};

export type FetchInstagramProfileErrorResponse = {
  success: false;
  error: {
    code: InstagramFetchErrorCode;
    message: string;
  };
};

export type FetchInstagramProfileResponse =
  | FetchInstagramProfileSuccessResponse
  | FetchInstagramProfileErrorResponse;

export type UploadProfileImageResponse = {
  success: true;
  data: {
    assetUrl: string;
  };
};

export type SavedDesignInstagramMeta = {
  isVisible: boolean;
  handle: string;
  displayHandle: string;
  avatarSource: AvatarSource;
  avatarUrl?: string;
  fetchStatus: Exclude<InstagramFetchStatus, 'loading'>;
  fetchErrorCode?: InstagramFetchErrorCode;
  provider?: string;
};
