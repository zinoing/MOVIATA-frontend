type InstagramVisibilityToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function InstagramVisibilityToggle({
  checked,
  onChange,
}: InstagramVisibilityToggleProps) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3">
      <span className="text-sm font-medium text-neutral-900">Show on design</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
