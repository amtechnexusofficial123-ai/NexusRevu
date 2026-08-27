import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, reviewSessions } from "@/db/schema";
import { draftReview } from "@/lib/reviewDraft";
import { googleWriteReviewUrl } from "@/lib/qr";
import { formatAnswerForDisplay, type QuestionType } from "@/lib/questionTypes";
import { eq } from "drizzle-orm";

type Body = {
  slug: string;
  answers: { questionId: string; question: string; type: QuestionType; answer: string | number }[];
};

export async function POST(req: NextRequest) {
  const { slug, answers }: Body = await req.json();

  if (!slug || !answers?.length) {
    return NextResponse.json({ error: "slug and answers are required" }, { status: 400 });
  }

  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug));
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const formatted = answers.map((a) => ({
    question: a.question,
    answer: formatAnswerForDisplay(a.type ?? "text", a.answer),
  }));

  const { draftText, sentiment } = await draftReview(business.name, formatted);

  await db.insert(reviewSessions).values({
    businessId: business.id,
    questionIds: answers.map((a) => a.questionId),
    answers: Object.fromEntries(answers.map((a, i) => [a.questionId, formatted[i].answer])),
    draftText,
    sentiment,
  });

  const googleUrl = business.googlePlaceId
    ? googleWriteReviewUrl(business.googlePlaceId)
    : null;

  return NextResponse.json({ draftText, sentiment, googleUrl });
}
