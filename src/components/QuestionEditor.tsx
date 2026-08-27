"use client";

import { QUESTION_TYPES, needsOptions, type QuestionType } from "@/lib/questionTypes";

export type EditableQuestion = {
  id?: string;
  text: string;
  type: QuestionType;
  options: string[] | null;
  active: boolean;
};

export const EMPTY_QUESTION: EditableQuestion = {
  text: "",
  type: "text",
  options: null,
  active: true,
};

export function QuestionEditorRow({
  q,
  expanded,
  onToggleExpand,
  onChange,
  onRemove,
}: {
  q: EditableQuestion;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (q: EditableQuestion) => void;
  onRemove: () => void;
}) {
  const typeMeta = QUESTION_TYPES.find((t) => t.id === q.type);

  return (
    <li className="card">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onToggleExpand} className="flex flex-1 items-center gap-3 text-left">
          <span className={`text-sm ${q.active ? "text-ink" : "text-ink/40 line-through"}`}>
            {q.text || <span className="text-ink/40">Untitled question</span>}
          </span>
        </button>
        <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-medium text-brand">
          {typeMeta?.label}
        </span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...q, active: !q.active })}
            className="btn-secondary py-1.5 text-xs"
          >
            {q.active ? "Disable" : "Enable"}
          </button>
          <button type="button" onClick={onRemove} className="btn-secondary py-1.5 text-xs text-red-600">
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4 border-t border-ink/10 pt-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">Question text</label>
            <input
              className="input"
              value={q.text}
              onChange={(e) => onChange({ ...q, text: e.target.value })}
              placeholder="e.g. What did you order today?"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">Answer type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...q,
                      type: t.id,
                      options: needsOptions(t.id) ? q.options ?? ["Option 1", "Option 2"] : null,
                    })
                  }
                  className={`rounded-xl border px-2.5 py-2 text-xs font-medium ${
                    q.type === t.id ? "border-brand bg-brand-light text-brand" : "border-ink/15 text-ink/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {needsOptions(q.type) && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/70">
                Options customers can pick from
              </label>
              <div className="flex flex-col gap-2">
                {(q.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input py-1.5"
                      value={opt}
                      onChange={(e) => {
                        const next = [...(q.options ?? [])];
                        next[i] = e.target.value;
                        onChange({ ...q, options: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ ...q, options: (q.options ?? []).filter((_, idx) => idx !== i) })
                      }
                      className="text-xs text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...q,
                      options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`],
                    })
                  }
                  className="w-fit text-xs font-medium text-brand"
                >
                  + Add option
                </button>
              </div>
            </div>
          )}

          {q.type === "rating" && (
            <p className="text-xs text-ink/50">Customers answer with a 1–5 star tap. No extra setup needed.</p>
          )}
        </div>
      )}
    </li>
  );
}
