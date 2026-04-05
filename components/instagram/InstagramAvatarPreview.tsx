import { useEffect, useState } from 'react';
import type { AvatarSource } from '../../types/instagram';

export type PreviewUser = {
  avatarUrl?: string;
  displayHandle: string;
};

type InstagramAvatarPreviewProps = {
  primary: PreviewUser;
  friend?: PreviewUser;
  avatarSource: AvatarSource;
};

function getInitials(handle?: string) {
  return handle?.replace(/^@/, '').slice(0, 2).toUpperCase() || 'IG';
}

export function InstagramAvatarPreview({
  primary,
  friend,
  avatarSource,
}: InstagramAvatarPreviewProps) {
  const [primaryImageFailed, setPrimaryImageFailed] = useState(false);
  const [friendImageFailed, setFriendImageFailed] = useState(false);

  useEffect(() => {
    setPrimaryImageFailed(false);
  }, [primary.avatarUrl]);

  useEffect(() => {
    setFriendImageFailed(false);
  }, [friend?.avatarUrl]);

  const shouldShowPrimary =
    avatarSource !== 'none' && !!primary.avatarUrl && !primaryImageFailed;

  const shouldShowFriend = !!friend?.avatarUrl && !friendImageFailed;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-neutral-100">
            {shouldShowPrimary ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primary.avatarUrl}
                alt={primary.displayHandle || 'Instagram profile'}
                className="h-full w-full object-cover"
                onError={() => setPrimaryImageFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">
                {getInitials(primary.displayHandle)}
              </div>
            )}
          </div>

          {friend && (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-100 shadow-sm">
              {shouldShowFriend ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={friend.avatarUrl}
                  alt={friend.displayHandle || 'Tagged friend'}
                  className="h-full w-full object-cover"
                  onError={() => setFriendImageFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[8px] font-medium text-neutral-500">
                  {getInitials(friend.displayHandle)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-neutral-900">
            {primary.displayHandle || '@username'}
          </div>

          {friend ? (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="text-sm leading-none">↻</span>
              <span className="truncate">{friend.displayHandle}</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-neutral-500">
              {avatarSource === 'auto'
                ? 'Auto'
                : avatarSource === 'upload'
                  ? 'Uploaded'
                  : avatarSource === 'default'
                    ? 'Default'
                    : 'ID only'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}