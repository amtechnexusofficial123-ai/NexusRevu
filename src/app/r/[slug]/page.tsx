"use client";

import { useEffect, useState, use } from "react";
import type { QuestionType } from "@/lib/questionTypes";

type Question = { id: string; text: string; type: QuestionType; options: string[] | null };
type BusinessInfo = { name: string; logoUrl: string | null; slug: string };

export default function CustomerReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [step, setStep] = useState<"loading" | "answering" | "drafting" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [draft, setDraft] = useState("");
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/review/questions?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setBusiness(data.business);
        setQuestions(data.questions);
        setStep("answering");
      })
      .catch((e) => {
        setErrorMsg(e.message ?? "Something went wrong");
        setStep("error");
      });
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("drafting");
    const res = await fetch("/api/review/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        answers: questions.map((q) => ({
          questionId: q.id,
          question: q.text,
          type: q.type,
          answer: answers[q.id] ?? "",
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error ?? "Something went wrong");
      setStep("error");
      return;
    }
    setDraft(data.draftText);
    setGoogleUrl(data.googleUrl);
    setStep("done");
  }

  async function handlePost() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      // clipboard can fail on non-https/local — the text is still shown for manual copy
    }
    if (googleUrl) window.open(googleUrl, "_blank");
  }

  if (step === "loading") return <Centered>Loading…</Centered>;
  if (step === "error") return <Centered>{errorMsg}</Centered>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 flex flex-col items-center text-center">
        {business?.logoUrl && (
          <img src={business.logoUrl} alt={business.name} className="mb-3 h-14 w-14 rounded-full object-cover" />
        )}
        <h1 className="font-display text-2xl text-ink">{business?.name}</h1>
        <p className="mt-1 text-sm text-ink/60">Thank you for reviewing — this helps us grow.</p>
      </div>

      {(step === "answering" || step === "drafting") && (
        <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
          {questions.map((q, i) => (
            <div key={q.id}>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                {i + 1}. {q.text}
              </label>
              <QuestionInput
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            </div>
          ))}
          <button className="btn-primary" disabled={step === "drafting"}>
            {step === "drafting" ? "Writing your review…" : "Continue"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="card flex flex-col gap-4">
          <p className="text-sm font-medium text-ink/80">Here's your review:</p>
          <p className="rounded-card bg-brand-light p-4 text-sm text-ink">{draft}</p>
          {googleUrl ? (
            <button onClick={handlePost} className="btn-primary">
              {copied ? "Opening Google…" : "Post"}
            </button>
          ) : (
            <p className="text-center text-xs text-ink/50">
              This business hasn't connected their Google listing yet. Feel free to copy
              your review above.
            </p>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-ink/30">
        Powered by{" "}
        <a
          href="https://www.amtechnexus.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink/45 underline-offset-2 hover:text-ink/60 hover:underline"
        >
          AM TechNexus Labs
        </a>
      </p>
    </main>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
}) {
  if (question.type === "rating") {
    const rating = Number(value) || 0;
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill={n <= rating ? "#E8B23D" : "none"}
              stroke={n <= rating ? "#E8B23D" : "currentColor"}
              className="text-ink/30"
              strokeWidth="1.5"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="flex flex-col gap-2">
        {(question.options ?? []).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${
              value === opt ? "border-brand bg-brand-light text-brand" : "border-ink/15 text-ink"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                value === opt ? "border-brand" : "border-ink/40"
              }`}
            >
              {value === opt && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
            </span>
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Choose one…
        </option>
        {(question.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <textarea
      className="input min-h-[80px]"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center text-ink/70">
      {children}
    </main>
  );
}
