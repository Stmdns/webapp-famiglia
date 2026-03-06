import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { recurringExpenses, groups, groupMembers, expenseCategories, expenseMonthOverrides } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";

function isExpenseInDateRange(
  expense: { startMonth: number | null; startYear: number | null; endMonth: number | null; endYear: number | null },
  month: number,
  year: number
): boolean {
  // Controlla se è nel periodo di validità
  // Se startMonth/startYear sono definiti, la spesa inizia da quel mese
  if (expense.startMonth !== null && expense.startYear !== null) {
    if (year < expense.startYear || (year === expense.startYear && month < expense.startMonth)) {
      return false;
    }
  }
  
  // Se endMonth/endYear sono definiti, la spesa termina quel mese
  if (expense.endMonth !== null && expense.endYear !== null) {
    if (year > expense.endYear || (year === expense.endYear && month > expense.endMonth)) {
      return false;
    }
  }
  
  return true;
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
    const includeHidden = searchParams.get("includeHidden") === "true";

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

    // Carica gli override per il mese richiesto
    const overrides = await db
      .select()
      .from(expenseMonthOverrides)
      .where(and(
        eq(expenseMonthOverrides.month, month),
        eq(expenseMonthOverrides.year, year)
      ));

    // Crea una mappa per lookup veloce
    const overrideMap = new Map(overrides.map(o => [o.expenseId, o.isActive]));

    // Filtra le spese in base al mese/anno e agli override
    let expenses = allExpenses.filter(e => {
      const inDateRange = isExpenseInDateRange(e, month, year);
      if (!inDateRange) return false;
      
      // Se c'è un override per questo mese, usa quello
      if (overrideMap.has(e.id)) {
        return overrideMap.get(e.id);
      }
      
      // Altrimenti usa isActive globale
      return e.isActive;
    });

    // Se richiesto, includi anche le spese "nascoste" (non attive per questo mese)
    if (includeHidden) {
      const hiddenExpenses = allExpenses.filter(e => {
        const inDateRange = isExpenseInDateRange(e, month, year);
        if (!inDateRange) return false;
        
        if (overrideMap.has(e.id)) {
          return !overrideMap.get(e.id);
        }
        
        return !e.isActive;
      });
      expenses = [...expenses, ...hiddenExpenses];
    }

    const result = expenses.map((expense) => {
      // Determina lo stato per questo mese
      let isActiveForMonth: boolean;
      if (overrideMap.has(expense.id)) {
        isActiveForMonth = overrideMap.get(expense.id)!;
      } else {
        isActiveForMonth = expense.isActive;
      }
      
      return {
        ...expense,
        category: categories.find((c) => c.id === expense.categoryId),
        isActiveForMonth,
        isHidden: !isActiveForMonth,
      };
    });

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

    return NextResponse.json({ 
      id: expenseId, 
      name, 
      amount, 
      frequencyType,
      startMonth: startMonth ? parseInt(startMonth) : null,
      startYear: startYear ? parseInt(startYear) : null,
      endMonth: endMonth ? parseInt(endMonth) : null,
      endYear: endYear ? parseInt(endYear) : null,
    });
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

    // Se vengono passati month e year, gestisci l'override per quel mese
    const overrideMonth = body.month;
    const overrideYear = body.year;
    
    if (overrideMonth && overrideYear) {
      // Cerca se esiste già un override per questo mese
      const [existingOverride] = await db
        .select()
        .from(expenseMonthOverrides)
        .where(and(
          eq(expenseMonthOverrides.expenseId, expenseId),
          eq(expenseMonthOverrides.month, parseInt(overrideMonth)),
          eq(expenseMonthOverrides.year, parseInt(overrideYear))
        ))
        .limit(1);

      if (existingOverride) {
        // Aggiorna l'override esistente
        await db
          .update(expenseMonthOverrides)
          .set({ isActive: isActive })
          .where(eq(expenseMonthOverrides.id, existingOverride.id));
      } else {
        // Crea un nuovo override
        await db.insert(expenseMonthOverrides).values({
          id: uuid(),
          expenseId,
          month: parseInt(overrideMonth),
          year: parseInt(overrideYear),
          isActive,
        });
      }
    } else {
      // Comportamento originale: aggiorna i dati della spesa
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
    }

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
