"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { QUESTION_TYPES, needsOptions, type QuestionType } from "@/lib/questionTypes";

type Business = {
  id: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
  googlePlaceId: string | null;
  slug: string;
};

type Question = {
  id?: string;
  text: string;
  type: QuestionType;
  options: string[] | null;
  active: boolean;
};

const MAX_QUESTIONS = 10;
const EMPTY_QUESTION: Question = { text: "", type: "text", options: null, active: true };

export default function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [tab, setTab] = useState<"details" | "questions">("details");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(!isNew);

  // details form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [questionsMessage, setQuestionsMessage] = useState<string | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // qr state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/businesses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data.business);
        setName(data.business.name ?? "");
        setAddress(data.business.address ?? "");
        setLogoUrl(data.business.logoUrl ?? "");
        setGooglePlaceId(data.business.googlePlaceId ?? "");
        setLoading(false);
      });
    fetch(`/api/businesses/${id}/questions`)
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions ?? []));
    fetch(`/api/businesses/${id}/qr`)
      .then((r) => r.json())
      .then((data) => {
        setQrDataUrl(data.qrDataUrl);
        setReviewUrl(data.reviewUrl);
      });
  }, [id, isNew]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setDetailsError(null);
    setDetailsMessage(null);
    if (!name.trim()) {
      setDetailsError("Business name is required");
      return;
    }
    setSavingDetails(true);

    if (isNew) {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, logoUrl, googlePlaceId }),
      });
      const data = await res.json();
      setSavingDetails(false);
      if (!res.ok) {
        setDetailsError(data.error ?? "Something went wrong");
        return;
      }
      // Move straight into edit mode for the new business, and nudge them
      // toward setting up questions next.
      router.replace(`/dashboard/business/${data.business.id}`);
      setTab("questions");
      return;
    }

    const res = await fetch(`/api/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, logoUrl, googlePlaceId }),
    });
    const data = await res.json();
    setSavingDetails(false);
    if (!res.ok) {
      setDetailsError(data.error ?? "Something went wrong");
      return;
    }
    setBusiness(data.business);
    setDetailsMessage("Saved.");
  }

  function updateQuestion(index: number, updated: Question) {
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

  async function handleSaveQuestions() {
    setQuestionsError(null);
    setQuestionsMessage(null);

    const cleaned = questions.filter((q) => q.text.trim());
    for (const q of cleaned) {
      if (needsOptions(q.type) && (q.options ?? []).filter((o) => o.trim()).length < 2) {
        setQuestionsError(`"${q.text}" needs at least 2 options before saving.`);
        return;
      }
    }

    setSavingQuestions(true);
    const res = await fetch(`/api/businesses/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: cleaned }),
    });
    const data = await res.json();
    setSavingQuestions(false);
    if (!res.ok) {
      setQuestionsError(data.error ?? "Something went wrong");
      return;
    }
    setQuestions(data.questions);
    setQuestionsMessage("Saved — this replaces the question set customers will see.");
  }

  if (loading) return <p className="text-ink/60">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {isNew ? "Add a business" : business?.name}
          </h1>
          <p className="text-sm text-ink/60">
            {isNew ? "Fill in the details, then set up their review questions." : business?.address}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-brand-light p-1">
          {(["details", "questions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={t === "questions" && isNew}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                tab === t ? "bg-white text-ink shadow-sm" : "text-ink/60"
              }`}
            >
              {t === "details" ? "Details" : "Questions & QR"}
            </button>
          ))}
        </div>
      </div>

      {tab === "details" && (
        <form onSubmit={handleSaveDetails} className="card flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Business name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Address</label>
            <input
              className="input"
              placeholder="123 MG Road, Chennai"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Logo URL</label>
            <input
              className="input"
              placeholder="https://…/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Google Place ID</label>
            <input
              className="input"
              placeholder="ChIJ…"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink/50">
              Find yours with Google's{" "}
              <a
                className="text-brand underline"
                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                target="_blank"
                rel="noreferrer"
              >
                Place ID Finder
              </a>
              .
            </p>
          </div>
          {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
          {detailsMessage && <p className="text-sm text-brand">{detailsMessage}</p>}
          <button className="btn-primary self-start" disabled={savingDetails}>
            {savingDetails ? "Saving…" : isNew ? "Create business" : "Save changes"}
          </button>
        </form>
      )}

      {tab === "questions" && !isNew && (
        <div className="flex flex-col gap-6">
          <div className="card flex flex-col items-center gap-4 text-center">
            <h2 className="font-display text-lg text-ink">QR code</h2>
            <p className="max-w-sm text-sm text-ink/60">
              This is what customers scan. It opens with 3 random questions from the set below.
            </p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Review QR code" className="h-44 w-44 rounded-card border border-ink/10" />
            ) : (
              <p className="text-ink/50">Generating…</p>
            )}
            {reviewUrl && <p className="break-all text-xs text-ink/50">{reviewUrl}</p>}
            <div className="flex gap-3">
              {qrDataUrl && (
                <a href={qrDataUrl} download={`${business?.slug}-qr.png`} className="btn-secondary">
                  Download QR
                </a>
              )}
              {reviewUrl && (
                <a href={reviewUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                  Preview flow
                </a>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg text-ink">Questions</h2>
                <p className="text-sm text-ink/60">
                  Up to {MAX_QUESTIONS}. Customers see 3 at random. Saving replaces the full set in the database.
                </p>
              </div>
              <button onClick={addQuestion} disabled={questions.length >= MAX_QUESTIONS} className="btn-secondary">
                + Add question
              </button>
            </div>

            <ul className="flex flex-col gap-2.5">
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

            {questionsError && <p className="mt-3 text-sm text-red-600">{questionsError}</p>}
            {questionsMessage && <p className="mt-3 text-sm text-brand">{questionsMessage}</p>}

            <button onClick={handleSaveQuestions} disabled={savingQuestions} className="btn-primary mt-4">
              {savingQuestions ? "Saving…" : "Save questions"}
            </button>
            <p className="mt-2 text-xs text-ink/50">{questions.length} / {MAX_QUESTIONS} questions used</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionEditorRow({
  q,
  expanded,
  onToggleExpand,
  onChange,
  onRemove,
}: {
  q: Question;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (q: Question) => void;
  onRemove: () => void;
}) {
  const typeMeta = QUESTION_TYPES.find((t) => t.id === q.type);

  return (
    <li className="card">
      <div className="flex items-center justify-between gap-4">
        <button onClick={onToggleExpand} className="flex flex-1 items-center gap-3 text-left">
          <span className={`text-sm ${q.active ? "text-ink" : "text-ink/40 line-through"}`}>
            {q.text || <span className="text-ink/40">Untitled question</span>}
          </span>
        </button>
        <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-medium text-brand">
          {typeMeta?.label}
        </span>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => onChange({ ...q, active: !q.active })} className="btn-secondary py-1.5 text-xs">
            {q.active ? "Disable" : "Enable"}
          </button>
          <button onClick={onRemove} className="btn-secondary py-1.5 text-xs text-red-600">
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
                      onClick={() => onChange({ ...q, options: (q.options ?? []).filter((_, idx) => idx !== i) })}
                      className="text-xs text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    onChange({ ...q, options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] })
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
