import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { oneTimeExpenses, groups, groupMembers, expenseCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
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
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const expenseIdParam = searchParams.get("expenseId");

    const [group] = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, session.user.id)))
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    let expenses;
    if (expenseIdParam) {
      const [expense] = await db
        .select()
        .from(oneTimeExpenses)
        .where(and(eq(oneTimeExpenses.id, expenseIdParam), eq(oneTimeExpenses.groupId, id)))
        .limit(1);
      expenses = expense ? [expense] : [];
    } else {
      expenses = await db
        .select()
        .from(oneTimeExpenses)
        .where(and(eq(oneTimeExpenses.groupId, id), eq(oneTimeExpenses.month, month), eq(oneTimeExpenses.year, year)));
    }

    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.groupId, id));

    const result = expenses.map((expense) => ({
      ...expense,
      category: categories.find((c) => c.id === expense.categoryId),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching one-time expenses:", error);
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
    const { name, amount, categoryId, date, month, year, expenseId } = body;

    if (!name || !amount || !date || !month || !year) {
      return NextResponse.json({ error: "Name, amount, date, month and year required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oneTimeExpenseId = uuid();
    const now = new Date();

    await db.insert(oneTimeExpenses).values({
      id: oneTimeExpenseId,
      groupId: id,
      expenseId: expenseId || null,
      categoryId: categoryId || null,
      name,
      amount: parseFloat(amount),
      date: new Date(date),
      month: parseInt(month),
      year: parseInt(year),
      isPaid: false,
      createdAt: now,
    });

    return NextResponse.json({ id: oneTimeExpenseId, name, amount, month, year });
  } catch (error) {
    console.error("Error creating one-time expense:", error);
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
    const { expenseId, name, amount, categoryId, date, month, year, isPaid, receiptText } = body;

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {
      name,
      amount: parseFloat(amount),
      categoryId: categoryId || null,
      date: new Date(date),
      month: parseInt(month),
      year: parseInt(year),
      isPaid: isPaid !== undefined ? isPaid : false,
    };

    if (receiptText !== undefined) {
      updateData.receiptText = receiptText;
    }

    await db
      .update(oneTimeExpenses)
      .set(updateData)
      .where(eq(oneTimeExpenses.id, expenseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating one-time expense:", error);
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
      .delete(oneTimeExpenses)
      .where(eq(oneTimeExpenses.id, expenseId!));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting one-time expense:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
