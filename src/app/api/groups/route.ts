import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userGroups = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, session.user.id));

    return NextResponse.json(userGroups.map((g) => g.groups));
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const groupId = uuid();
    const now = new Date();

    await db.insert(groups).values({
      id: groupId,
      name,
      ownerId: session.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(groupMembers).values({
      id: uuid(),
      groupId,
      userId: session.user.id,
      name: session.user.name || "Me",
      quotaPercent: 100,
      createdAt: now,
    });

    return NextResponse.json({ id: groupId, name, ownerId: session.user.id });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
