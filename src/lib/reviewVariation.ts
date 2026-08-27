export type QA = { question: string; answer: string };

export const TARGET_LENGTHS = [22, 28, 35, 42, 52, 65, 85] as const;

export const STRUCTURE_SEEDS = [
  "Open with a specific detail, then overall feel",
  "Start mid-thought: 'Went for…', 'Tried the…'",
  "One detail first, then wrap-up",
  "Lead with the best moment, end with a short takeaway",
  "Start with who you were with or why you came, then the food or service",
  "Two short beats: what stood out, then whether you'd come back",
  "Sound like you're texting a friend the highlights",
] as const;

export const VOICE_SEEDS = [
  "Blunt and matter-of-fact",
  "Warm but not salesy",
  "Casual and choppy, like a phone note",
  "Straight recommendation, no fluff",
  "Understated, a little dry humor ok",
  "Genuinely pleased but not over the top",
  "Quick and punchy, short sentences",
] as const;

export type VariationBundle = {
  targetWords: number;
  structureSeed: string;
  voiceSeed: string;
  leadQa: QA;
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickVariation(qas: QA[]): VariationBundle {
  const nonEmpty = qas.filter((qa) => qa.answer.trim());
  const leadQa = nonEmpty.length > 0 ? pickRandom(nonEmpty) : qas[0];

  return {
    targetWords: pickRandom(TARGET_LENGTHS),
    structureSeed: pickRandom(STRUCTURE_SEEDS),
    voiceSeed: pickRandom(VOICE_SEEDS),
    leadQa,
  };
}

export function pickVariationRetry(qas: QA[], previous: VariationBundle): VariationBundle {
  const prevKey = qaKey(previous.leadQa);
  let next = pickVariation(qas);
  let attempts = 0;
  while (
    attempts < 12 &&
    next.structureSeed === previous.structureSeed &&
    next.voiceSeed === previous.voiceSeed &&
    qaKey(next.leadQa) === prevKey
  ) {
    next = pickVariation(qas);
    attempts++;
  }
  return next;
}

function qaKey(qa: QA): string {
  return `${qa.question}|||${qa.answer}`;
}
