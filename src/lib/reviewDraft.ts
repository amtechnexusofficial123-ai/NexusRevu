type QA = { question: string; answer: string };

type DraftResult = {
  draftText: string;
  sentiment: "positive" | "neutral" | "negative";
};

/**
 * Turns the customer's answers into a short review draft without any AI API.
 * Also estimates sentiment from star ratings when present.
 */
export function draftReview(businessName: string, qas: QA[]): DraftResult {
  const sentences = qas
    .map((qa) => formatQaSentence(qa))
    .filter(Boolean);

  const draftText = [
    `I visited ${businessName}.`,
    ...sentences,
  ].join(" ");

  return { draftText, sentiment: estimateSentiment(qas) };
}

function formatQaSentence(qa: QA): string {
  const answer = qa.answer.trim();
  if (!answer) return "";

  // Rating answers look like "4 out of 5 stars"
  const ratingMatch = answer.match(/^(\d)\s+out of 5 stars$/i);
  if (ratingMatch) {
    return `I'd rate ${qa.question.replace(/\?$/, "").toLowerCase()} ${ratingMatch[1]}/5.`;
  }

  // Short choice / text answers — weave question + answer lightly
  const q = qa.question.replace(/\?$/, "").trim();
  return `Regarding ${q.toLowerCase()}: ${answer}.`;
}

function estimateSentiment(qas: QA[]): DraftResult["sentiment"] {
  const ratings = qas
    .map((qa) => {
      const m = qa.answer.match(/^(\d)\s+out of 5 stars$/i);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null);

  if (ratings.length === 0) return "neutral";

  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  if (avg >= 4) return "positive";
  if (avg <= 2) return "negative";
  return "neutral";
}

/** Picks 3 random questions out of the business's active question pool. */
export function pickRandomQuestions<T>(pool: T[], count = 3): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
