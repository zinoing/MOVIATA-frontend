import type { AvatarSource, InstagramFetchStatus } from '../../types/instagram';

type InstagramActionButtonsProps = {
  fetchStatus: InstagramFetchStatus;
  avatarSource: AvatarSource;
  onUpload?: (file: File) => Promise<void> | void;
  onUseHandleOnly: () => void;
  onRemove: () => void;
  onRetry: () => void | Promise<void>;
};

export function InstagramActionButtons({
  fetchStatus,
  avatarSource,
  onUpload,
  onUseHandleOnly,
  onRemove,
  onRetry,
}: InstagramActionButtonsProps) {
  const uploadLabel =
    avatarSource === 'upload' || avatarSource === 'auto'
      ? 'Replace photo'
      : 'Upload photo';

  return (
    <div className="flex flex-wrap gap-2">
      {onUpload && (
        <label className="cursor-pointer rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-900">
          {uploadLabel}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void onUpload(file);
              e.currentTarget.value = '';
            }}
          />
        </label>
      )}

      <button
        type="button"
        onClick={onUseHandleOnly}
        className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-900"
      >
        Use ID only
      </button>

      {(fetchStatus === 'error' || fetchStatus === 'not_found') && (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-900"
        >
          Try again
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600"
      >
        Remove
      </button>
    </div>
  );
}