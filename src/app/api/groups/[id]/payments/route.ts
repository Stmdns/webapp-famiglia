import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { payments, recurringExpenses, groupMembers, groups, expenseCategories } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, id));

    const expenses = await db
      .select()
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.groupId, id), eq(recurringExpenses.isActive, true)));

    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.groupId, id));

    const expensePayments = await db
      .select()
      .from(payments)
      .where(and(eq(payments.groupId, id), eq(payments.month, month), eq(payments.year, year)));

    const totalMonthly = expenses.reduce((sum, e) => sum + calculateMonthlyAmount(e), 0);

    const memberQuotas = members.map((member) => {
      const calculated = (totalMonthly * member.quotaPercent) / 100;
      const paid = expensePayments
        .filter((p) => p.memberId === member.id)
        .reduce((sum, p) => sum + p.amountPaid, 0);

      return {
        member,
        calculated,
        paid,
        confirmed: paid >= calculated,
      };
    });

    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = categories.find((c) => c.id === expense.categoryId);
      const catName = category?.name || "Altro";
      const monthlyAmount = calculateMonthlyAmount(expense);
      if (!acc[catName]) {
        acc[catName] = { total: 0, color: category?.color || "#6b7280" };
      }
      acc[catName].total += monthlyAmount;
      return acc;
    }, {} as Record<string, { total: number; color: string }>);

    return NextResponse.json({
      totalMonthly,
      memberQuotas,
      expensesByCategory,
      expenses: expenses.map((e) => ({
        ...e,
        monthlyAmount: calculateMonthlyAmount(e),
        category: categories.find((c) => c.id === e.categoryId),
      })),
      payments: expensePayments,
    });
  } catch (error) {
    console.error("Error calculating:", error);
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
    const { memberId, month, year, amountPaid, isConfirmed } = body;

    if (!memberId || !month || !year || amountPaid === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const paymentId = uuid();
    await db.insert(payments).values({
      id: paymentId,
      groupId: id,
      memberId,
      expenseId: null,
      month: parseInt(month as string),
      year: parseInt(year as string),
      amountPaid: parseFloat(amountPaid as string),
      isConfirmed: isConfirmed || false,
      confirmedAt: isConfirmed ? new Date() : null,
      createdAt: new Date(),
    });

    return NextResponse.json({ id: paymentId });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { paymentId, isConfirmed } = body;

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .update(payments)
      .set({
        isConfirmed,
        confirmedAt: isConfirmed ? new Date() : null,
      })
      .where(eq(payments.id, paymentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming payment:", error);
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

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .delete(payments)
      .where(eq(payments.id, paymentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
