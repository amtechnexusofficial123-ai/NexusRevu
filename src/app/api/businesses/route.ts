import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { getSessionAdminId } from "@/lib/auth";
import { normalizeLogoUrl } from "@/lib/logoValidation";
import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "business"
  );
}

export async function GET() {
  const adminId = await getSessionAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(businesses)
    .where(eq(businesses.adminId, adminId))
    .orderBy(desc(businesses.createdAt));

  return NextResponse.json({ businesses: rows });
}

export async function POST(req: NextRequest) {
  const adminId = await getSessionAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, address, logoUrl, googlePlaceId } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  const logo = normalizeLogoUrl(logoUrl ?? null);
  if (logo && typeof logo === "object" && "error" in logo) {
    return NextResponse.json({ error: logo.error }, { status: 400 });
  }

  const slug = `${slugify(name)}-${nanoid(5)}`;
  const manageToken = nanoid(24);

  const [business] = await db
    .insert(businesses)
    .values({
      adminId,
      name: name.trim(),
      address: address?.trim() || null,
      logoUrl: logo,
      googlePlaceId: googlePlaceId?.trim() || null,
      slug,
      manageToken,
    })
    .returning();

  return NextResponse.json({ business });
}
