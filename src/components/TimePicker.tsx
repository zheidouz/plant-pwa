/**
 * TimePicker — hour + minute `<select>` pair used by the Settings page.
 *
 * 24-hour format. Validates `hour`/`minute` against their ranges so the
 * component is safe to feed untrusted input.
 */
interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (next: { hour: number; minute: number }) => void;
  disabled?: boolean;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}

export default function TimePicker({
  hour,
  minute,
  onChange,
  disabled,
}: TimePickerProps) {
  const safeHour = clamp(hour, 0, 23);
  const safeMinute = clamp(minute, 0, 59);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-stone-500">Hour</label>
      <select
        value={safeHour}
        disabled={disabled}
        onChange={(e) => onChange({ hour: Number(e.target.value), minute: safeMinute })}
        className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-800 disabled:opacity-50"
        data-testid="time-hour"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-stone-400">:</span>
      <label className="text-xs text-stone-500">Min</label>
      <select
        value={safeMinute}
        disabled={disabled}
        onChange={(e) => onChange({ hour: safeHour, minute: Number(e.target.value) })}
        className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-800 disabled:opacity-50"
        data-testid="time-minute"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}