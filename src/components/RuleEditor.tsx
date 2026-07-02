/**
 * RuleEditor — one-tap cadence editor for a single ScheduleRule. Renders
 * an inline number stepper (1-60) and an enabled toggle. Persists via
 * `onSave` (the parent calls `updatePlant`).
 */
import { useState } from "react";
import type { CareType, ScheduleRule } from "../domain";

interface RuleEditorProps {
  rule: ScheduleRule;
  onSave: (next: ScheduleRule) => void;
}

const CARE_TYPE_META: Record<CareType, { emoji: string; label: string }> = {
  water: { emoji: "💧", label: "Water" },
  fertilize: { emoji: "🌱", label: "Fertilize" },
  mist: { emoji: "💨", label: "Mist" },
};

export default function RuleEditor({ rule, onSave }: RuleEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draftDays, setDraftDays] = useState(rule.cadenceDays);
  const [draftEnabled, setDraftEnabled] = useState(rule.enabled);

  const meta = CARE_TYPE_META[rule.careType];

  function startEdit() {
    setDraftDays(rule.cadenceDays);
    setDraftEnabled(rule.enabled);
    setEditing(true);
  }

  function commit() {
    const clamped = Math.max(1, Math.min(60, Math.round(draftDays) || 1));
    onSave({
      careType: rule.careType,
      cadenceDays: clamped,
      enabled: draftEnabled,
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden>{meta.emoji}</span>
          <span className="font-medium text-stone-800">{meta.label}</span>
          <span className="text-stone-500">
            every {rule.cadenceDays}d
            {!rule.enabled ? " (off)" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
          data-testid={`edit-rule-${rule.careType}`}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-leaf-300 bg-leaf-50 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden>{meta.emoji}</span>
        <span className="font-medium text-stone-800">{meta.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-stone-600">
          every
          <input
            type="number"
            min={1}
            max={60}
            value={draftDays}
            onChange={(e) => setDraftDays(Number(e.target.value))}
            className="w-16 rounded border border-stone-300 px-2 py-1 text-sm"
            data-testid={`rule-days-${rule.careType}`}
          />
          days
        </label>
        <label className="flex items-center gap-1 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={draftEnabled}
            onChange={(e) => setDraftEnabled(e.target.checked)}
            data-testid={`rule-enabled-${rule.careType}`}
          />
          enabled
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={commit}
          className="rounded-md bg-leaf-600 px-3 py-1 text-xs font-medium text-white"
          data-testid={`save-rule-${rule.careType}`}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-stone-300 px-3 py-1 text-xs text-stone-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
