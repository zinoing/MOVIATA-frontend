import { getFetchStatusKind, getFetchStatusMessage } from '../../lib/instagram/messages';
import type { InstagramProfileUiState } from '../../types/instagram';

type InstagramFetchStatusProps = {
  fetchState: InstagramProfileUiState;
};

export function InstagramFetchStatus({ fetchState }: InstagramFetchStatusProps) {
  const message = getFetchStatusMessage(fetchState);

  if (!message) return null;

  const kind = getFetchStatusKind(fetchState.status);
  const colorClass =
    kind === 'success'
      ? 'text-emerald-700'
      : kind === 'error'
        ? 'text-red-600'
        : 'text-neutral-500';

  return <p className={`text-sm ${colorClass}`}>{message}</p>;
}
