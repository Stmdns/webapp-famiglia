import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { recurringExpenses, groups, groupMembers, expenseCategories } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";

function isExpenseActiveForMonth(
  expense: { isActive: boolean; startMonth: number | null; startYear: number | null; endMonth: number | null; endYear: number | null },
  month: number,
  year: number
): boolean {
  if (!expense.isActive) return false;
  
  const start = expense.startYear !== null && expense.startMonth !== null 
    ? new Date(expense.startYear, expense.startMonth - 1)
    : new Date(2000, 0);
    
  const end = expense.endYear !== null && expense.endMonth !== null 
    ? new Date(expense.endYear, expense.endMonth - 1)
    : new Date(2100, 11);
    
  const current = new Date(year, month - 1);
  
  return current >= start && current <= end;
}

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
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const [group] = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, session.user.id)))
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const allExpenses = await db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.groupId, id));

    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.groupId, id));

    const expenses = allExpenses.filter(e => isExpenseActiveForMonth(e, month, year));

    const result = expenses.map((expense) => ({
      ...expense,
      category: categories.find((c) => c.id === expense.categoryId),
      isActiveForMonth: true,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching expenses:", error);
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
    const { name, amount, categoryId, frequencyType, frequencyValue, dayOfMonth, startMonth, startYear, endMonth, endYear } = body;

    if (!name || !amount || !frequencyType) {
      return NextResponse.json({ error: "Name, amount and frequency required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expenseId = uuid();
    const now = new Date();

    await db.insert(recurringExpenses).values({
      id: expenseId,
      groupId: id,
      categoryId: categoryId || null,
      name,
      amount: parseFloat(amount),
      frequencyType,
      frequencyValue: frequencyValue || 1,
      dayOfMonth: dayOfMonth || null,
      isActive: true,
      startMonth: startMonth ? parseInt(startMonth) : null,
      startYear: startYear ? parseInt(startYear) : null,
      endMonth: endMonth ? parseInt(endMonth) : null,
      endYear: endYear ? parseInt(endYear) : null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: expenseId, name, amount, frequencyType });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
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
    const { expenseId, name, amount, categoryId, frequencyType, frequencyValue, dayOfMonth, isActive, startMonth, startYear, endMonth, endYear } = body;

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(recurringExpenses)
      .set({
        name,
        amount: parseFloat(amount),
        categoryId: categoryId || null,
        frequencyType,
        frequencyValue: frequencyValue || 1,
        dayOfMonth: dayOfMonth || null,
        isActive,
        startMonth: startMonth ? parseInt(startMonth) : null,
        startYear: startYear ? parseInt(startYear) : null,
        endMonth: endMonth ? parseInt(endMonth) : null,
        endYear: endYear ? parseInt(endYear) : null,
        updatedAt: new Date(),
      })
      .where(eq(recurringExpenses.id, expenseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating expense:", error);
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
    const expenseId = searchParams.get("expenseId");

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .delete(recurringExpenses)
      .where(eq(recurringExpenses.id, expenseId!));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
