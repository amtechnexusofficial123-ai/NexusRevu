type QA = { question: string; answer: string };

type DraftResult = {
  draftText: string;
  sentiment: "positive" | "neutral" | "negative";
};

/**
 * Turns the customer's 3 Q&A answers into a natural-sounding review draft.
 * Also flags sentiment so the business can see if a session was negative
 * (useful if you later want to route unhappy customers to private feedback
 * instead of Google).
 */
export async function draftReview(
  businessName: string,
  qas: QA[]
): Promise<DraftResult> {
  const prompt = `You are helping a customer turn quick answers into a short, genuine-sounding Google review for the business "${businessName}".

Here are the customer's answers to 3 questions:
${qas.map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`).join("\n")}

Write a review in the customer's voice, 2-4 sentences, natural and specific to what they said (don't invent details they didn't mention). Do not use generic marketing language.

Then classify the overall sentiment as one word: positive, neutral, or negative.

Respond ONLY with JSON in this exact shape, no markdown fences, no preamble:
{"draftText": "...", "sentiment": "positive"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n")
    .trim()
    .replace(/^```json\s*|```$/g, "");

  try {
    const parsed = JSON.parse(text);
    return {
      draftText: parsed.draftText,
      sentiment: parsed.sentiment,
    };
  } catch {
    // Fall back gracefully if the model didn't return clean JSON.
    return { draftText: text, sentiment: "neutral" };
  }
}

/**
 * Picks 3 random questions out of the business's active question pool.
 */
export function pickRandomQuestions<T>(pool: T[], count = 3): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
