import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, questions } from "@/db/schema";
import { getSessionAdminId } from "@/lib/auth";
import { needsOptions, type QuestionType } from "@/lib/questionTypes";
import { eq, and } from "drizzle-orm";

const MAX_QUESTIONS = 10;
const VALID_TYPES: QuestionType[] = ["text", "rating", "multiple_choice", "dropdown"];

async function assertOwnership(businessId: string, adminId: string) {
  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.adminId, adminId)));
  return business ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getSessionAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const business = await assertOwnership(id, adminId);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.businessId, id))
    .orderBy(questions.position);

  return NextResponse.json({ questions: rows });
}

type IncomingQuestion = {
  text: string;
  type: QuestionType;
  options?: string[] | null;
  active?: boolean;
};

/**
 * Overwrites the business's entire question set with whatever is sent.
 * This is a full replace (delete-then-insert) rather than a patch, so the
 * dashboard can just save its local editor state as-is.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getSessionAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const business = await assertOwnership(id, adminId);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { questions: incoming }: { questions: IncomingQuestion[] } = await req.json();

  if (!Array.isArray(incoming)) {
    return NextResponse.json({ error: "questions must be an array" }, { status: 400 });
  }
  if (incoming.length > MAX_QUESTIONS) {
    return NextResponse.json({ error: `You can only have up to ${MAX_QUESTIONS} questions` }, { status: 400 });
  }
  for (const q of incoming) {
    if (!q.text?.trim()) {
      return NextResponse.json({ error: "Every question needs text" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(q.type)) {
      return NextResponse.json({ error: `Invalid question type: ${q.type}` }, { status: 400 });
    }
    if (needsOptions(q.type) && (!q.options || q.options.filter((o) => o?.trim()).length < 2)) {
      return NextResponse.json(
        { error: `"${q.text}" needs at least 2 options` },
        { status: 400 }
      );
    }
  }

  // Full replace: simplest way to guarantee the DB always matches exactly
  // what the business last saved, including deletions and reordering.
  await db.delete(questions).where(eq(questions.businessId, id));

  if (incoming.length > 0) {
    await db.insert(questions).values(
      incoming.map((q, i) => ({
        businessId: id,
        text: q.text.trim(),
        type: q.type,
        options: needsOptions(q.type) ? q.options!.map((o) => o.trim()).filter(Boolean) : null,
        position: i,
        active: q.active ?? true,
      }))
    );
  }

  const saved = await db
    .select()
    .from(questions)
    .where(eq(questions.businessId, id))
    .orderBy(questions.position);

  return NextResponse.json({ questions: saved });
}
