import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, recurringExpenses, oneTimeExpenses, payments } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Verifica se il token è valido
    const group = await db.query.groups.findFirst({
      where: eq(groups.viewToken, token),
    });

    if (!group) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Recupera i membri del gruppo
    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, group.id),
      orderBy: [groupMembers.createdAt],
    });

    // Recupera le spese ricorrenti
    const recurring = await db.query.recurringExpenses.findMany({
      where: eq(recurringExpenses.groupId, group.id),
      orderBy: [recurringExpenses.createdAt],
    });

    // Recupera le spese una tantum
    const oneTime = await db.query.oneTimeExpenses.findMany({
      where: eq(oneTimeExpenses.groupId, group.id),
      orderBy: [desc(oneTimeExpenses.date)],
    });

    // Recupera i pagamenti
    const paymentRecords = await db.query.payments.findMany({
      where: eq(payments.groupId, group.id),
    });

    // Calcola i bilanci per ciascun membro
    const memberBalances = members.map(member => {
      // Trova tutti i pagamenti effettuati dal membro
      const memberPayments = paymentRecords.filter(
        payment => payment.memberId === member.id
      );
      
      // Calcola il totale pagato dal membro
      const totalPaid = memberPayments.reduce(
        (sum, payment) => sum + payment.amountPaid,
        0
      );

      // Calcola la quota che il membro dovrebbe pagare
      const totalExpenses = [...recurring, ...oneTime].reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      
      const memberShare = totalExpenses * (member.quotaPercent / 100);
      
      // Calcola il bilancio (negativo = deve pagare, positivo = ha pagato in eccesso)
      const balance = totalPaid - memberShare;

      return {
        ...member,
        totalPaid,
        memberShare,
        balance,
      };
    });

    // Serializza le date
    const serializedGroup = {
      ...group,
      createdAt: group.createdAt?.toISOString ? group.createdAt.toISOString() : group.createdAt,
      updatedAt: group.updatedAt?.toISOString ? group.updatedAt.toISOString() : group.updatedAt,
    };

    const serializedMembers = members.map(member => ({
      ...member,
      createdAt: member.createdAt?.toISOString ? member.createdAt.toISOString() : member.createdAt,
    }));

    const serializedRecurring = recurring.map(expense => ({
      ...expense,
      createdAt: expense.createdAt?.toISOString ? expense.createdAt.toISOString() : expense.createdAt,
      updatedAt: expense.updatedAt?.toISOString ? expense.updatedAt.toISOString() : expense.updatedAt,
    }));

    const serializedOneTime = oneTime.map(expense => ({
      ...expense,
      date: expense.date?.toISOString ? expense.date.toISOString() : expense.date,
      createdAt: expense.createdAt?.toISOString ? expense.createdAt.toISOString() : expense.createdAt,
    }));

    return NextResponse.json({
      group: serializedGroup,
      members: serializedMembers,
      balances: memberBalances,
      recurringExpenses: serializedRecurring,
      oneTimeExpenses: serializedOneTime,
    });
  } catch (error) {
    console.error("Error fetching group data:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}