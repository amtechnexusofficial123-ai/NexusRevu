import { humanizeReview } from "@/lib/reviewHumanize";
import {
  draftTooSimilar,
  recentOpenings,
  truncateDraft,
} from "@/lib/reviewSimilarity";
import {
  pickVariation,
  pickVariationRetry,
  type QA,
  type VariationBundle,
} from "@/lib/reviewVariation";

export type GeminiDraftResult = {
  draftText: string;
  sentiment: "positive" | "neutral" | "negative";
};

const DEFAULT_MODEL = "gemini-3.6-flash";

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

  const thinkingConfig = isGemini3Model(model)
    ? { thinkingLevel: "LOW" }
    : { thinkingBudget: 0 };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 1,
        maxOutputTokens: options?.maxOutputTokens ?? 2448,
        ...(options?.json ? { responseMimeType: "application/json" } : {}),
        thinkingConfig,
      },
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
};

function formatBusinessContext(business: BusinessContext): string {
  const category = business.category?.trim() || "not specified";
  const description = business.description?.trim() || "not specified";
  return `Business name: ${business.name}
Category: ${category}
About: ${description}`;
}

function buildNoAnswersPrompt(
  business: BusinessContext,
  variation: VariationBundle,
  recentDrafts: string[]
): string {
  const openings = recentOpenings(recentDrafts);
  const truncatedRecents = recentDrafts.map((d) => truncateDraft(d));

  const openingBan =
    openings.length > 0
      ? `\nHARD RULE — do NOT reuse or closely mimic these recent opening lines:\n${openings.map((o) => `- "${o}"`).join("\n")}`
      : "";

  const patternBan =
    truncatedRecents.length > 0
      ? `\nRecent reviews at this business (do not reuse sentence patterns or distinctive phrases from these):\n${truncatedRecents.map((d, i) => `${i + 1}. "${d}"`).join("\n")}`
      : "";

  return `You are drafting a Google review for this business. The customer did not answer any questions — write a short, genuine positive review grounded in the business context below.

${formatBusinessContext(business)}

VARIATION FOR THIS DRAFT (follow these):
- Target length: about ${variation.targetWords} words (not longer)
- Structure: ${variation.structureSeed}
- Voice: ${variation.voiceSeed}
${openingBan}
${patternBan}

WRITE LIKE A REAL PERSON, NOT MARKETING:
- First person, conversational
- Use contractions ("don't", "it's", "we'd")
- No em dashes or en dashes; no hyphenated compounds (write "well behaved" not "well-behaved")
- No semicolons or colons; simple punctuation only
- Plain words — avoid "delightful", "exceptional", "hidden gem", "highly recommend", "must try", "absolutely", "perfect", "amazing experience"
- Vary sentence length; short fragments are fine
- Do not start with stiff openers like "I recently visited" or "I had the pleasure"
- Keep it positive and believable — friendly staff, good experience, would return
- Stay true to the category and description — do not mention meals, dinner, or restaurant vibes unless that fits this business
- Do not invent specific menu items, staff names, or details beyond the context above
- No emojis or hashtags

Then classify overall sentiment as exactly one word: positive, neutral, or negative.

Respond ONLY with JSON in this exact shape, no markdown fences, no preamble:
{"draftText": "...", "sentiment": "positive"}`;
}

function buildReviewPrompt(
  business: BusinessContext,
  qas: QA[],
  variation: VariationBundle,
  recentDrafts: string[]
): string {
  const openings = recentOpenings(recentDrafts);
  const truncatedRecents = recentDrafts.map((d) => truncateDraft(d));

  const openingBan =
    openings.length > 0
      ? `\nHARD RULE — do NOT reuse or closely mimic these recent opening lines:\n${openings.map((o) => `- "${o}"`).join("\n")}`
      : "";

  const patternBan =
    truncatedRecents.length > 0
      ? `\nRecent reviews at this business (do not reuse sentence patterns or distinctive phrases from these):\n${truncatedRecents.map((d, i) => `${i + 1}. "${d}"`).join("\n")}`
      : "";

  return `You are drafting a Google review for this business from a real customer's quick answers.

${formatBusinessContext(business)}

CUSTOMER ANSWERS:
${qas.map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`).join("\n")}

VARIATION FOR THIS DRAFT (follow these — customer did not choose them):
- Target length: about ${variation.targetWords} words (not longer)
- Structure: ${variation.structureSeed}
- Voice: ${variation.voiceSeed}
- Lead with this answer as your opening focus: Q: ${variation.leadQa.question} / A: ${variation.leadQa.answer}
${openingBan}
${patternBan}

WRITE LIKE A REAL PERSON, NOT MARKETING:
- First person, conversational
- Use contractions ("don't", "it's", "we'd")
- No em dashes or en dashes; no hyphenated compounds (write "well behaved" not "well-behaved")
- No semicolons or colons; simple punctuation only
- Plain words — avoid "delightful", "exceptional", "hidden gem", "highly recommend", "must try", "absolutely", "perfect", "amazing experience"
- Vary sentence length; short fragments are fine
- Do not start with stiff openers like "I recently visited" or "I had the pleasure"
- Match tone honestly to star ratings in the answers
- Always stay true to the business category and description above — do not mention meals, dinner, or restaurant vibes unless that fits this business
- Only use facts from the answers and business context — do not invent menu items, staff names, or details
- No emojis or hashtags unless the customer's vibe clearly suggests it

Then classify overall sentiment as exactly one word: positive, neutral, or negative.

Respond ONLY with JSON in this exact shape, no markdown fences, no preamble:
{"draftText": "...", "sentiment": "positive"}`;
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
    maxOutputTokens: 2448,
    temperature: 1,
  });
  return parseDraftJson(text);
}

/**
 * Gemini kiosk-style review draft with random variation and anti-repetition retry.
 */
export async function draftReviewWithGemini(
  business: BusinessContext,
  qas: QA[],
  recentDrafts: string[] = []
): Promise<GeminiDraftResult> {
  const variation = pickVariation(qas);
  let result = await generateOnce(business, qas, variation, recentDrafts);

  if (recentDrafts.length > 0 && draftTooSimilar(result.draftText, recentDrafts)) {
    const retryVariation = pickVariationRetry(qas, variation);
    result = await generateOnce(business, qas, retryVariation, recentDrafts);
  }

  return result;
}
