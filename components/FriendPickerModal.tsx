import { useMemo, useState } from 'react';
import type { ProfileUser } from '../types/profile';
import { normalizeProfileUsername } from '../lib/profileUsers';

type FriendPickerModalProps = {
  isOpen: boolean;
  selectedUsers: ProfileUser[];
  onClose: () => void;
  onManualAdd: (username: string) => void;
};

export default function FriendPickerModal({
  isOpen,
  selectedUsers,
  onClose,
  onManualAdd,
}: FriendPickerModalProps) {
  const [usernameInput, setUsernameInput] = useState('');

  const selectedUsernames = useMemo(
    () => new Set(selectedUsers.map((user) => normalizeProfileUsername(user.normalizedUsername || user.username || user.id))),
    [selectedUsers]
  );

  const normalizedInput = normalizeProfileUsername(usernameInput);

  const canAdd = normalizedInput.length > 0 && !selectedUsernames.has(normalizedInput);

  const handleClose = () => {
    setUsernameInput('');
    onClose();
  };

  const handleSubmit = () => {
    if (!canAdd) return;
    onManualAdd(normalizedInput);
    setUsernameInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Add friend</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Enter an Instagram username manually.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Instagram username
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="@wearthemovement"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
            />
          </div>

          {!canAdd && normalizedInput.length > 0 && selectedUsernames.has(normalizedInput) && (
            <p className="text-xs text-red-500">
              This username has already been added.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canAdd}
            className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
              canAdd
                ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
            }`}
          >
            Add friend
          </button>
        </div>
      </div>
    </div>
  );
}
