import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { expenseCategories, groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";

const DEFAULT_CATEGORIES = [
  { name: "Alimentari", icon: "ShoppingCart", color: "#22c55e" },
  { name: "Mutuo", icon: "Home", color: "#3b82f6" },
  { name: "Utenze", icon: "Zap", color: "#f59e0b" },
  { name: "Trasporti", icon: "Car", color: "#8b5cf6" },
  { name: "Assicurazioni", icon: "Shield", color: "#ef4444" },
  { name: "Tasse", icon: "FileText", color: "#dc2626" },
  { name: "Svago", icon: "Gamepad2", color: "#ec4899" },
  { name: "Altro", icon: "MoreHorizontal", color: "#6b7280" },
];

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
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, session.user.id)))
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.groupId, id));

    if (categories.length === 0) {
      const now = new Date();
      const insertedCategories = [];
      for (const cat of DEFAULT_CATEGORIES) {
        const catId = uuid();
        await db.insert(expenseCategories).values({
          id: catId,
          groupId: id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          createdAt: now,
        });
        insertedCategories.push({
          id: catId,
          groupId: id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
        });
      }
      return NextResponse.json(insertedCategories);
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

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
    const body = await req.json();
    const { name, icon, color } = body;

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categoryId = uuid();
    await db.insert(expenseCategories).values({
      id: categoryId,
      groupId: id,
      name,
      icon: icon || "Tag",
      color: color || "#6b7280",
      createdAt: new Date(),
    });

    return NextResponse.json({ id: categoryId, name, icon, color });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .delete(expenseCategories)
      .where(eq(expenseCategories.id, categoryId!));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
