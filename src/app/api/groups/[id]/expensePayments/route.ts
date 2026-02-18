import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { expensePayments, groups, groupMembers, recurringExpenses, oneTimeExpenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";

function calculateMonthlyAmount(expense: { amount: number; frequencyType: string; frequencyValue: number }) {
  switch (expense.frequencyType) {
    case "weekly":
      return expense.amount * 4.33;
    case "monthly":
      return expense.amount;
    case "yearly":
      return expense.amount / 12;
    case "days":
      return expense.amount * (30 / expense.frequencyValue);
    case "months":
      return expense.amount / expense.frequencyValue;
    default:
      return expense.amount;
  }
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

    const payments = await db
      .select()
      .from(expensePayments)
      .where(and(eq(expensePayments.groupId, id), eq(expensePayments.month, month), eq(expensePayments.year, year)));

    const expenses = await db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.groupId, id));

    const result = payments.map((payment) => ({
      ...payment,
      expense: expenses.find((e) => e.id === payment.expenseId),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching expense payments:", error);
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
    const { expenseId, month, year, amount } = body;

    if (!expenseId || !month || !year || amount === undefined) {
      return NextResponse.json({ error: "expenseId, month, year and amount required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(expensePayments)
      .where(and(
        eq(expensePayments.expenseId, expenseId),
        eq(expensePayments.month, parseInt(month)),
        eq(expensePayments.year, parseInt(year))
      ))
      .limit(1);

    const [expense] = await db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.id, expenseId))
      .limit(1);

    if (existing) {
      await db
        .update(expensePayments)
        .set({ amount: parseFloat(amount), paidAt: new Date() })
        .where(eq(expensePayments.id, existing.id));
      
      if (expense) {
        await db
          .update(oneTimeExpenses)
          .set({ amount: parseFloat(amount), isPaid: true })
          .where(and(
            eq(oneTimeExpenses.expenseId, expenseId),
            eq(oneTimeExpenses.month, parseInt(month)),
            eq(oneTimeExpenses.year, parseInt(year))
          ));
      }
      
      return NextResponse.json({ id: existing.id, updated: true });
    }

    const paymentId = uuid();
    await db.insert(expensePayments).values({
      id: paymentId,
      groupId: id,
      expenseId,
      month: parseInt(month),
      year: parseInt(year),
      amount: parseFloat(amount),
    });

    if (expense) {
      const oneTimeId = uuid();
      await db.insert(oneTimeExpenses).values({
        id: oneTimeId,
        groupId: id,
        expenseId,
        categoryId: expense.categoryId,
        name: expense.name,
        amount: parseFloat(amount),
        date: new Date(),
        month: parseInt(month),
        year: parseInt(year),
        isPaid: true,
      });
    }

    return NextResponse.json({ id: paymentId, oneTimeExpenseId: expense ? uuid() : null });
  } catch (error) {
    console.error("Error creating expense payment:", error);
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
    const paymentId = searchParams.get("paymentId");

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .delete(expensePayments)
      .where(eq(expensePayments.id, paymentId!));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense payment:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
