import { useEffect } from 'react';
import { InstagramActionButtons } from '../../components/instagram/InstagramActionButtons';
import {
  InstagramAvatarPreview,
  type PreviewUser,
} from '../../components/instagram/InstagramAvatarPreview';
import { InstagramFetchStatus } from '../../components/instagram/InstagramFetchStatus';
import { InstagramHandleInput } from '../../components/instagram/InstagramHandleInput';
import { InstagramHelpText } from '../../components/instagram/InstagramHelpText';
import { InstagramVisibilityToggle } from '../../components/instagram/InstagramVisibilityToggle';
import { useInstagramProfile } from '../../hooks/useInstagramProfile';

type TaggedFriendMeta = {
  avatarUrl?: string;
  displayHandle: string;
};

type InstagramProfileSectionProps = {
  taggedFriend?: TaggedFriendMeta;
  onChangeMeta?: (payload: {
    isInstagramVisible: boolean;
    normalizedHandle: string;
    displayHandle: string;
    avatarUrl?: string;
    avatarSource: 'auto' | 'upload' | 'default' | 'none';
    fetchStatus: 'idle' | 'loading' | 'success' | 'error' | 'not_found';
    errorCode?: string;
    errorMessage?: string;
  }) => void;
};

export function InstagramProfileSection({
  taggedFriend,
  onChangeMeta,
}: InstagramProfileSectionProps) {
  const {
    state,
    setHandleInput,
    fetchProfile,
    useHandleOnly,
    removeInstagramProfile,
    toggleVisibility,
  } = useInstagramProfile();

  useEffect(() => {
    onChangeMeta?.({
      isInstagramVisible: state.isInstagramVisible,
      normalizedHandle: state.normalizedHandle,
      displayHandle: state.displayHandle,
      avatarUrl: state.avatarUrl,
      avatarSource: state.avatarSource,
      fetchStatus: state.fetchState.status,
      errorCode:
        state.fetchState.status === 'error' ||
        state.fetchState.status === 'not_found'
          ? state.fetchState.errorCode
          : undefined,
      errorMessage:
        state.fetchState.status === 'error' ||
        state.fetchState.status === 'not_found'
          ? state.fetchState.errorMessage
          : undefined,
    });
  }, [state, onChangeMeta]);

  const canFetch =
    !!state.normalizedHandle && state.fetchState.status !== 'loading';

  const primaryUser: PreviewUser = {
    avatarUrl: state.avatarUrl,
    displayHandle: state.displayHandle || '@username',
  };

  const friendUser: PreviewUser | undefined = taggedFriend
    ? {
        avatarUrl: taggedFriend.avatarUrl,
        displayHandle: taggedFriend.displayHandle,
      }
    : undefined;

  return (
    <section className="space-y-4 rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Instagram Profile
          </h3>
          <p className="text-sm text-neutral-500">Optional</p>
        </div>
      </header>

      <InstagramVisibilityToggle
        checked={state.isInstagramVisible}
        onChange={(checked) => {
          toggleVisibility(checked);
        }}
      />

      {state.isInstagramVisible && (
        <>
          <InstagramHandleInput
            value={state.handleInput}
            canFetch={canFetch}
            isLoading={state.fetchState.status === 'loading'}
            onChange={(value) => {
              setHandleInput(value);
            }}
            onFetch={async () => {
              await fetchProfile();
            }}
          />

          <InstagramFetchStatus fetchState={state.fetchState} />

          <InstagramAvatarPreview
            primary={primaryUser}
            friend={friendUser}
            avatarSource={state.avatarSource}
          />

          <InstagramActionButtons
            fetchStatus={state.fetchState.status}
            avatarSource={state.avatarSource}
            onUseHandleOnly={() => {
              useHandleOnly();
            }}
            onRemove={() => {
              removeInstagramProfile();
            }}
            onRetry={async () => {
              await fetchProfile();
            }}
          />

          <InstagramHelpText />
        </>
      )}
    </section>
  );
}