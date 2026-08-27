"use client";

import { useEffect, useState, use } from "react";
import {
  QuestionEditorRow,
  EMPTY_QUESTION,
  type EditableQuestion,
} from "@/components/QuestionEditor";
import { needsOptions } from "@/lib/questionTypes";
import { MAX_QUESTIONS } from "@/lib/questions";

export default function ManageQuestionsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [step, setStep] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/manage/${encodeURIComponent(token)}/questions`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Not found");
        setBusinessName(data.business.name);
        setLogoUrl(data.business.logoUrl);
        setQuestions(data.questions ?? []);
        if ((data.questions ?? []).length === 0) {
          setQuestions([{ ...EMPTY_QUESTION }]);
          setExpandedIndex(0);
        }
        setStep("ready");
      })
      .catch((e) => {
        setErrorMsg(e.message ?? "Something went wrong");
        setStep("error");
      });
  }, [token]);

  function updateQuestion(index: number, updated: EditableQuestion) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? updated : q)));
  }
  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }
  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) return;
    setQuestions((qs) => [...qs, { ...EMPTY_QUESTION }]);
    setExpandedIndex(questions.length);
  }

  async function handleSave() {
    setSaveError(null);
    setMessage(null);

    const cleaned = questions.filter((q) => q.text.trim());
    for (const q of cleaned) {
      if (needsOptions(q.type) && (q.options ?? []).filter((o) => o.trim()).length < 2) {
        setSaveError(`"${q.text}" needs at least 2 options before saving.`);
        return;
      }
    }

    setSaving(true);
    const res = await fetch(`/api/manage/${encodeURIComponent(token)}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: cleaned }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSaveError(data.error ?? "Something went wrong");
      return;
    }
    setQuestions(data.questions);
    setMessage(cleaned.length === 0 ? "All questions removed." : "Questions saved.");
  }

  if (step === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-ink/70">Loading…</main>
    );
  }
  if (step === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center text-ink/70">
        {errorMsg}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        {logoUrl && (
          <img src={logoUrl} alt={businessName} className="mb-3 h-14 w-14 rounded-full object-cover" />
        )}
        <h1 className="font-display text-2xl text-ink">{businessName}</h1>
        <p className="mt-1 text-sm text-ink/60">Update the questions customers will answer.</p>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {questions.filter((q) => q.text.trim()).length} / {MAX_QUESTIONS} questions
        </p>
        <button
          type="button"
          onClick={addQuestion}
          disabled={questions.length >= MAX_QUESTIONS}
          className="btn-secondary py-2 text-xs"
        >
          + Add question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="card mb-4 text-center text-sm text-ink/60">
          No questions yet. Tap “Add question” to create your first one.
        </div>
      ) : (
        <ul className="mb-4 flex flex-col gap-2.5">
          {questions.map((q, i) => (
            <QuestionEditorRow
              key={i}
              q={q}
              expanded={expandedIndex === i}
              onToggleExpand={() => setExpandedIndex(expandedIndex === i ? null : i)}
              onChange={(updated) => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)}
            />
          ))}
        </ul>
      )}

      {saveError && <p className="mb-3 text-sm text-red-600">{saveError}</p>}
      {message && <p className="mb-3 text-sm text-brand">{message}</p>}

      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save questions"}
      </button>

      <p className="mt-8 text-center text-[11px] text-ink/30">NexusRevu, by AM Technexus Labs</p>
    </main>
  );
}
