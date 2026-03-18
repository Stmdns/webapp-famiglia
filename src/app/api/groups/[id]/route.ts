import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";

export async function GET(
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
      .innerJoin(groupMembers, and(
        eq(groups.id, groupMembers.groupId),
        eq(groupMembers.userId, session.user.id)
      ))
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const groupData = group.groups;
    return NextResponse.json({
      id: groupData.id,
      name: groupData.name,
      ownerId: groupData.ownerId,
      viewToken: groupData.viewToken,
      createdAt: groupData.createdAt?.toISOString ? groupData.createdAt.toISOString() : groupData.createdAt,
      updatedAt: groupData.updatedAt?.toISOString ? groupData.updatedAt.toISOString() : groupData.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
