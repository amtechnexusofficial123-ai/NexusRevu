import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { getSessionAdminId } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/qr";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getSessionAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, id), eq(businesses.adminId, adminId)));

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const reviewUrl = `${origin}/r/${business.slug}`;
  const qrDataUrl = await generateQrDataUrl(reviewUrl);

  return NextResponse.json({ qrDataUrl, reviewUrl });
}
