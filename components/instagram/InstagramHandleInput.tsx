type InstagramHandleInputProps = {
  value: string;
  disabled?: boolean;
  canFetch: boolean;
  isLoading: boolean;
  onChange: (value: string) => void;
  onFetch: () => void;
};

export function InstagramHandleInput({
  value,
  disabled,
  canFetch,
  isLoading,
  onChange,
  onFetch,
}: InstagramHandleInputProps) {
  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-900">Instagram ID</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="@wearthemovement"
          maxLength={31}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100"
        />
        <button
          type="button"
          onClick={onFetch}
          disabled={isDisabled || !canFetch}
          className="rounded-xl border border-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-900 transition disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
        >
          {isLoading ? 'Checking...' : 'Load'}
        </button>
      </div>
    </div>
  );
}
