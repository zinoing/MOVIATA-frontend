export type InstagramFetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'not_found';

export type AvatarSource = 'auto' | 'upload' | 'default' | 'none';

export type InstagramFetchErrorCode =
  | 'INVALID_HANDLE'
  | 'PROFILE_NOT_FOUND'
  | 'PRIVATE_OR_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_BLOCKED'
  | 'UNKNOWN_FETCH_ERROR';

export type InstagramProfileResult = {
  normalizedHandle: string;
  displayHandle: string;
  avatarUrl: string;
  avatarSource: 'auto';
  provider: string;
  fetchedAt: string;
};

export type InstagramProfileUiState =
  | {
      status: 'idle';
    }
  | {
      status: 'loading';
      requestHandle: string;
    }
  | {
      status: 'success';
      profile: InstagramProfileResult;
    }
  | {
      status: 'error';
      errorCode: Exclude<InstagramFetchErrorCode, 'PROFILE_NOT_FOUND'>;
      errorMessage: string;
    }
  | {
      status: 'not_found';
      errorCode: 'PROFILE_NOT_FOUND';
      errorMessage: string;
    };

export type InstagramProfileState = {
  isInstagramVisible: boolean;
  handleInput: string;
  normalizedHandle: string;
  displayHandle: string;
  fetchState: InstagramProfileUiState;
  avatarSource: AvatarSource;
  avatarUrl?: string;
  previewUrl?: string;
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
