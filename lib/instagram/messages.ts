import type { InstagramFetchStatus, InstagramProfileUiState } from '../../types/instagram';

export function getFetchStatusMessage(fetchState: InstagramProfileUiState): string {
  switch (fetchState.status) {
    case 'loading':
      return 'Checking profile...';
    case 'success':
      return 'Profile loaded successfully';
    case 'not_found':
      return fetchState.errorMessage;
    case 'error':
      return fetchState.errorMessage;
    case 'idle':
    default:
      return '';
  }
}

export function getFetchStatusKind(status: InstagramFetchStatus): 'success' | 'error' | 'neutral' {
  if (status === 'success') return 'success';
  if (status === 'error' || status === 'not_found') return 'error';
  return 'neutral';
}
