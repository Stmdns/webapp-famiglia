import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newToken = crypto.randomUUID();

    await db
      .update(groups)
      .set({ 
        viewToken: newToken,
        updatedAt: new Date()
      })
      .where(eq(groups.id, id));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://webapp-famiglia.vercel.app";
    const viewUrl = `${baseUrl}/view/${newToken}`;

    return NextResponse.json({
      viewToken: newToken,
      viewUrl
    });
  } catch (error) {
    console.error("Error regenerating token:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
