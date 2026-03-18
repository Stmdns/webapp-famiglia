import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, recurringExpenses, payments, expenseCategories, expenseMonthOverrides } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function isExpenseInDateRange(
  expense: { startMonth: number | null; startYear: number | null; endMonth: number | null; endYear: number | null },
  month: number,
  year: number
): boolean {
  if (expense.startMonth !== null && expense.startYear !== null) {
    if (year < expense.startYear || (year === expense.startYear && month < expense.startMonth)) {
      return false;
    }
  }
  if (expense.endMonth !== null && expense.endYear !== null) {
    if (year > expense.endYear || (year === expense.endYear && month > expense.endMonth)) {
      return false;
    }
  }
  return true;
}

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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const group = await db.query.groups.findFirst({
      where: eq(groups.viewToken, token),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));

    const allExpenses = await db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.groupId, group.id));

    const overrides = await db
      .select()
      .from(expenseMonthOverrides)
      .where(and(
        eq(expenseMonthOverrides.month, month),
        eq(expenseMonthOverrides.year, year)
      ));

    const overrideMap = new Map(overrides.map(o => [o.expenseId, o.isActive]));

    const expenses = allExpenses.filter(e => {
      if (!isExpenseInDateRange(e, month, year)) return false;
      
      if (overrideMap.has(e.id)) {
        return overrideMap.get(e.id);
      }
      
      return e.isActive;
    });

    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.groupId, group.id));

    const expensePayments = await db
      .select()
      .from(payments)
      .where(and(eq(payments.groupId, group.id), eq(payments.month, month), eq(payments.year, year)));

    const totalMonthly = expenses.reduce((sum, e) => sum + calculateMonthlyAmount(e), 0);

    const memberQuotas = members.map((member) => {
      const calculated = (totalMonthly * member.quotaPercent) / 100;
      const paid = expensePayments
        .filter((p) => p.memberId === member.id)
        .reduce((sum, p) => sum + p.amountPaid, 0);

      return {
        member: {
          ...member,
          createdAt: member.createdAt?.toISOString ? member.createdAt.toISOString() : member.createdAt,
        },
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
      group: {
        ...group,
        createdAt: group.createdAt?.toISOString ? group.createdAt.toISOString() : group.createdAt,
        updatedAt: group.updatedAt?.toISOString ? group.updatedAt.toISOString() : group.updatedAt,
      },
      totalMonthly,
      memberQuotas,
      expensesByCategory,
      expenses: expenses.map((e) => {
        const category = categories.find((c) => c.id === e.categoryId);
        return {
          ...e,
          createdAt: e.createdAt?.toISOString ? e.createdAt.toISOString() : e.createdAt,
          updatedAt: e.updatedAt?.toISOString ? e.updatedAt.toISOString() : e.updatedAt,
          monthlyAmount: calculateMonthlyAmount(e),
          category: category ? {
            ...category,
            createdAt: category.createdAt?.toISOString ? category.createdAt.toISOString() : category.createdAt,
          } : null,
        };
      }),
      payments: expensePayments.map(p => ({
        ...p,
        confirmedAt: p.confirmedAt?.toISOString ? p.confirmedAt.toISOString() : p.confirmedAt,
      })),
    });
  } catch (error) {
    console.error("Error calculating:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
