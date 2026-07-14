/**
 * NotificationToggle — small iOS-style switch component for the
 * Notifications section of the Settings page.
 *
 * Self-contained: no domain imports, no global state. The parent owns the
 * `value` and `onChange` so this component is trivially testable.
 */
interface NotificationToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testId?: string;
}

export default function NotificationToggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
  testId,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-800">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition " +
          (checked ? "bg-leaf-600" : "bg-stone-300") +
          (disabled ? " opacity-50" : "")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition " +
            (checked ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}