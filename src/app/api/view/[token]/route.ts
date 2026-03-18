import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, recurringExpenses, oneTimeExpenses, payments } from "@/db/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

function isRecurringActiveInMonth(
  expense: { startMonth: number | null; startYear: number | null; endMonth: number | null; endYear: number | null; isActive: boolean },
  month: number,
  year: number
): boolean {
  if (!expense.isActive) return false;
  
  const startDate = expense.startMonth && expense.startYear
    ? expense.startYear * 100 + expense.startMonth
    : 0;
  const endDate = expense.endMonth && expense.endYear
    ? expense.endYear * 100 + expense.endMonth
    : 999999;
  const currentDate = year * 100 + month;
  
  return currentDate >= startDate && currentDate <= endDate;
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);
    
    const now = new Date();
    const currentMonth = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
    const currentYear = parseInt(searchParams.get("year") || String(now.getFullYear()));

    const group = await db.query.groups.findFirst({
      where: eq(groups.viewToken, token),
    });

    if (!group) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, group.id),
      orderBy: [groupMembers.createdAt],
    });

    const allRecurring = await db.query.recurringExpenses.findMany({
      where: eq(recurringExpenses.groupId, group.id),
    });

    const recurringForMonth = allRecurring.filter(expense => 
      isRecurringActiveInMonth(expense, currentMonth, currentYear)
    );

    const oneTimeForMonth = await db.query.oneTimeExpenses.findMany({
      where: and(
        eq(oneTimeExpenses.groupId, group.id),
        eq(oneTimeExpenses.month, currentMonth),
        eq(oneTimeExpenses.year, currentYear)
      ),
      orderBy: [desc(oneTimeExpenses.date)],
    });

    const paymentsForMonth = await db.query.payments.findMany({
      where: and(
        eq(payments.groupId, group.id),
        eq(payments.month, currentMonth),
        eq(payments.year, currentYear)
      ),
    });

    const totalRecurring = recurringForMonth.reduce((sum, e) => sum + e.amount, 0);
    const totalOneTime = oneTimeForMonth.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalRecurring + totalOneTime;
    const totalPaid = paymentsForMonth.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDue = totalExpenses - totalPaid;
    const progressPercent = totalExpenses > 0 ? Math.round((totalPaid / totalExpenses) * 100) : 0;

    const memberData = members.map(member => {
      const memberPayments = paymentsForMonth.filter(p => p.memberId === member.id);
      const paid = memberPayments.reduce((sum, p) => sum + p.amountPaid, 0);
      const quotaAmount = totalExpenses * (member.quotaPercent / 100);
      const due = quotaAmount - paid;
      const balance = paid - quotaAmount;
      
      let status: "paid" | "must_pay" | "excess" | "inactive" = "inactive";
      if (Math.abs(balance) < 0.01) {
        status = "paid";
      } else if (balance < 0) {
        status = "must_pay";
      } else {
        status = "excess";
      }

      return {
        id: member.id,
        name: member.name,
        quotaPercent: member.quotaPercent,
        quotaAmount,
        paid,
        due: Math.max(0, due),
        balance,
        status,
      };
    });

    const serializedGroup = {
      ...group,
      createdAt: group.createdAt?.toISOString ? group.createdAt.toISOString() : group.createdAt,
      updatedAt: group.updatedAt?.toISOString ? group.updatedAt.toISOString() : group.updatedAt,
    };

    const serializedRecurring = recurringForMonth.map(expense => ({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      frequencyType: expense.frequencyType,
      frequencyValue: expense.frequencyValue,
      dayOfMonth: expense.dayOfMonth,
      isActive: expense.isActive,
      startMonth: expense.startMonth,
      startYear: expense.startYear,
      endMonth: expense.endMonth,
      endYear: expense.endYear,
    }));

    const serializedOneTime = oneTimeForMonth.map(expense => ({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      date: expense.date?.toISOString ? expense.date.toISOString() : expense.date,
      month: expense.month,
      year: expense.year,
      isPaid: expense.isPaid,
      receiptText: expense.receiptText,
    }));

    const paymentsWithMemberInfo = paymentsForMonth.map(payment => {
      const member = members.find(m => m.id === payment.memberId);
      return {
        id: payment.id,
        memberId: payment.memberId,
        memberName: member?.name || "Sconosciuto",
        amountPaid: payment.amountPaid,
        isConfirmed: payment.isConfirmed,
        createdAt: payment.createdAt?.toISOString ? payment.createdAt.toISOString() : payment.createdAt,
      };
    });

    return NextResponse.json({
      month: currentMonth,
      year: currentYear,
      monthName: MONTH_NAMES[currentMonth - 1],
      summary: {
        totalExpenses,
        totalPaid,
        totalDue,
        progressPercent,
        recurringCount: recurringForMonth.length,
        oneTimeCount: oneTimeForMonth.length,
      },
      group: serializedGroup,
      members: memberData,
      recurringExpenses: serializedRecurring,
      oneTimeExpenses: serializedOneTime,
      payments: paymentsWithMemberInfo,
    });
  } catch (error) {
    console.error("Error fetching group data:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
