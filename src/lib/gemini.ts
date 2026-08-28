import { humanizeReview } from "@/lib/reviewHumanize";
import { recentOpenings, truncateDraft } from "@/lib/reviewSimilarity";
import {
  pickVariation,
  pickNoAnswerVariation,
  type QA,
  type VariationBundle,
} from "@/lib/reviewVariation";

export type GeminiDraftResult = {
  draftText: string;
  sentiment: "positive" | "neutral" | "negative";
};

/** Fast default; set GEMINI_MODEL=gemini-3.6-flash for higher quality (slower). */
const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 15000;

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = GEMINI_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getApiKey());
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function isGemini3Model(model: string): boolean {
  return /gemini-3/i.test(model);
}

type GenerateOptions = {
  model?: string;
  json?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
};

/**
 * Low-level Gemini generateContent call with kiosk-review settings.
 */
export async function generateGeminiText(
  prompt: string,
  options?: GenerateOptions
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const model = options?.model ?? getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const generationConfig: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.85,
    maxOutputTokens: options?.maxOutputTokens ?? 256,
  };
  if (options?.json) {
    generationConfig.responseMimeType = "application/json";
  }
  // Thinking adds latency; only enable on explicit Gemini 3.x models.
  if (isGemini3Model(model)) {
    generationConfig.thinkingConfig = { thinkingLevel: "low" };
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Gemini API error: ${res.status}${errBody ? ` — ${errBody.slice(0, 200)}` : ""}`
    );
  }

  const data = await res.json();
  const text = (data.candidates ?? [])
    .flatMap((c: { content?: { parts?: { text?: string }[] } }) => c.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export type BusinessContext = {
  name: string;
  category?: string | null;
  description?: string | null;
  reviewThemes?: string[] | null;
};

const WRITE_RULES =
  "First person, conversational, contractions. Plain words, no marketing clichés. No em dashes. Match star ratings. Only facts from context and answers. JSON only.";

function clip(text: string, max = 220): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function formatBusinessContext(business: BusinessContext, highlightTheme?: string): string {
  const category = business.category?.trim() || "not specified";
  const description = clip(business.description?.trim() || "not specified");
  const themes = (business.reviewThemes ?? []).filter((t) => t.trim());

  let block = `Business: ${business.name}\nCategory: ${category}\nContext: ${description}`;
  if (highlightTheme) {
    block += `\nFocus this review on: ${highlightTheme}`;
  } else if (themes.length > 0) {
    block += `\nThemes (pick one angle): ${themes.slice(0, 4).join("; ")}`;
  }
  return block;
}

function formatVariationBlock(variation: VariationBundle, noAnswers: boolean): string {
  const lines = [
    `~${variation.targetWords} words`,
    variation.structureSeed,
    variation.voiceSeed,
  ];
  if (!noAnswers) {
    lines.push(`Open with: ${variation.leadQa.question} → ${variation.leadQa.answer}`);
  }
  if (variation.contentFocusSeed) lines.push(variation.contentFocusSeed);
  return lines.join(" | ");
}

function formatRecentOpeningsBan(recentDrafts: string[]): string {
  const openings = recentOpenings(recentDrafts).slice(0, 3);
  if (openings.length === 0) return "";
  return `\nAvoid opening like: ${openings.map((o) => `"${truncateDraft(o, 72)}"`).join("; ")}`;
}

function buildNoAnswersPrompt(
  business: BusinessContext,
  variation: VariationBundle,
  recentDrafts: string[]
): string {
  return `Draft a short positive Google review. Customer skipped questions — use business context only.

${formatBusinessContext(business, variation.highlightTheme)}

Style: ${formatVariationBlock(variation, true)}${formatRecentOpeningsBan(recentDrafts)}

${WRITE_RULES}
{"draftText":"...","sentiment":"positive|neutral|negative"}`;
}

function buildReviewPrompt(
  business: BusinessContext,
  qas: QA[],
  variation: VariationBundle,
  recentDrafts: string[]
): string {
  const answers = qas.map((qa, i) => `${i + 1}. ${qa.question} → ${qa.answer}`).join("\n");

  return `Draft a short Google review from these answers.

${formatBusinessContext(business)}

Answers:
${answers}

Style: ${formatVariationBlock(variation, false)}${formatRecentOpeningsBan(recentDrafts)}

${WRITE_RULES}
{"draftText":"...","sentiment":"positive|neutral|negative"}`;
}

function parseDraftJson(text: string): GeminiDraftResult {
  const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    const sentiment = parsed.sentiment as GeminiDraftResult["sentiment"];
    const draftText = humanizeReview(String(parsed.draftText ?? ""));
    if (!["positive", "neutral", "negative"].includes(sentiment)) {
      return { draftText, sentiment: "neutral" };
    }
    return { draftText, sentiment };
  } catch {
    return { draftText: humanizeReview(cleaned), sentiment: "neutral" };
  }
}

async function generateOnce(
  business: BusinessContext,
  qas: QA[],
  variation: VariationBundle,
  recentDrafts: string[]
): Promise<GeminiDraftResult> {
  const hasAnswers = qas.some((qa) => qa.answer.trim());
  const prompt = hasAnswers
    ? buildReviewPrompt(business, qas, variation, recentDrafts)
    : buildNoAnswersPrompt(business, variation, recentDrafts);
  const text = await generateGeminiText(prompt, {
    json: true,
    maxOutputTokens: 256,
    temperature: 0.85,
  });
  return parseDraftJson(text);
}

/**
 * Gemini kiosk-style review draft with random variation.
 * Single API call for speed (no similarity retry).
 */
export async function draftReviewWithGemini(
  business: BusinessContext,
  qas: QA[],
  recentDrafts: string[] = []
): Promise<GeminiDraftResult> {
  const hasAnswers = qas.some((qa) => qa.answer.trim());
  const themes = (business.reviewThemes ?? []).filter((t) => t.trim());

  const variation = hasAnswers ? pickVariation(qas) : pickNoAnswerVariation(themes);
  return generateOnce(business, qas, variation, recentDrafts);
}
