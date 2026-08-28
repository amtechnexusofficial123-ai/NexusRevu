import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, reviewSessions } from "@/db/schema";
import { draftReviewWithGemini, isGeminiConfigured } from "@/lib/gemini";
import { draftReview } from "@/lib/reviewDraft";
import { googleWriteReviewUrl } from "@/lib/qr";
import { formatAnswerForDisplay, type QuestionType } from "@/lib/questionTypes";
import { desc, eq } from "drizzle-orm";

type Body = {
  slug: string;
  answers: { questionId: string; question: string; type: QuestionType; answer: string | number }[];
};

export async function POST(req: NextRequest) {
  const { slug, answers }: Body = await req.json();

  if (!slug || !Array.isArray(answers)) {
    return NextResponse.json({ error: "slug and answers are required" }, { status: 400 });
  }

  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug));
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const formatted = answers
    .map((a) => ({
      question: a.question,
      answer: formatAnswerForDisplay(a.type ?? "text", a.answer),
    }))
    .filter((qa) => qa.answer.trim());

  let draftText: string;
  let sentiment: string;

  if (isGeminiConfigured()) {
    const recentRows = await db
      .select({ draftText: reviewSessions.draftText })
      .from(reviewSessions)
      .where(eq(reviewSessions.businessId, business.id))
      .orderBy(desc(reviewSessions.createdAt))
      .limit(10);

    const recentDrafts = recentRows
      .map((r) => r.draftText)
      .filter((t): t is string => Boolean(t?.trim()));

    const result = await draftReviewWithGemini(
      {
        name: business.name,
        category: business.category,
        description: business.description,
        reviewThemes: business.reviewThemes,
      },
      formatted,
      recentDrafts
    );
    draftText = result.draftText;
    sentiment = result.sentiment;
  } else {
    const result = draftReview(business.name, formatted, {
      category: business.category,
      description: business.description,
      reviewThemes: business.reviewThemes,
    });
    draftText = result.draftText;
    sentiment = result.sentiment;
  }

  await db.insert(reviewSessions).values({
    businessId: business.id,
    questionIds: answers.map((a) => a.questionId),
    answers: Object.fromEntries(
      answers
        .map((a, i) => {
          const display = formatAnswerForDisplay(a.type ?? "text", a.answer);
          return display.trim() ? [a.questionId, display] : null;
        })
        .filter((e): e is [string, string] => e !== null)
    ),
    draftText,
    sentiment,
  });

  const googleUrl = business.googlePlaceId
    ? googleWriteReviewUrl(business.googlePlaceId)
    : null;

  return NextResponse.json({ draftText, sentiment, googleUrl });
}
