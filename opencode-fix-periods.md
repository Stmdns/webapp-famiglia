# Fix Problemi Gestione Periodi e Spese

## Problemi da Risolvere

### 1. CRITICO: Calcolo quote membri non filtra per periodo
**File:** `src/app/api/groups/[id]/payments/route.ts`

Il calcolo del totale mensile usa TUTTE le spese attive, senza filtrare per:
- startMonth/startYear (inizio validità)
- endMonth/endYear (fine validità)
- expenseMonthOverrides (spese nascoste per mese specifico)

**Fix richiesto:**
- Aggiungere funzione `isExpenseInDateRange` (copiare da expenses/route.ts)
- Filtrare le spese per il mese/anno richiesto prima di calcolare il totale
- Considerare gli override mensili

### 2. CRITICO: Override mensili ignorati nel calcolo quote
**File:** `src/app/api/groups/[id]/payments/route.ts`

Le spese "nascoste" per un mese specifico (via expenseMonthOverrides) vengono comunque incluse nel totale per le quote.

**Fix richiesto:**
- Caricare gli override per il mese richiesto
- Escludere spese con override isActive=false

### 3. Frequenza spese non gestita
**File:** `src/app/api/groups/[id]/expenses/route.ts` e `src/app/api/groups/[id]/payments/route.ts`

La funzione `isExpenseInDateRange` controlla solo start/end date, non la frequenza.

**Nota:** Per ora lasciamo così (spese visibili tutti i mesi nel loro range), ma aggiungiamo un commento TODO per implementare la logica frequenza in futuro.

## Modifiche da Fare

### File 1: src/app/api/groups/[id]/payments/route.ts

Aggiungere in alto:
```typescript
import { expenseMonthOverrides } from "@/db/schema";
```

Aggiungere funzione (copiare da expenses/route.ts):
```typescript
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
```

Modificare la query delle spese (intorno a linea 63):
```typescript
// Prima: prendi tutte le spese attive
const expenses = await db
  .select()
  .from(recurringExpenses)
  .where(and(eq(recurringExpenses.groupId, id), eq(recurringExpenses.isActive, true)));

// Dopo: prendi tutte le spese (anche non attive globalmente, ma filtra per periodo)
const allExpenses = await db
  .select()
  .from(recurringExpenses)
  .where(eq(recurringExpenses.groupId, id));

// Carica override per il mese
const overrides = await db
  .select()
  .from(expenseMonthOverrides)
  .where(and(
    eq(expenseMonthOverrides.month, month),
    eq(expenseMonthOverrides.year, year)
  ));

const overrideMap = new Map(overrides.map(o => [o.expenseId, o.isActive]));

// Filtra spese attive per questo mese
const expenses = allExpenses.filter(e => {
  // Deve essere nel range di date
  if (!isExpenseInDateRange(e, month, year)) return false;
  
  // Se c'è un override, usa quello
  if (overrideMap.has(e.id)) {
    return overrideMap.get(e.id);
  }
  
  // Altrimenti usa isActive globale
  return e.isActive;
});
```

### File 2: src/app/api/groups/[id]/expenses/route.ts

Aggiungere commento TODO nella funzione `isExpenseInDateRange`:
```typescript
// TODO: Implementare logica frequenza (weekly, monthly, yearly, days, months)
// per mostrare spese solo nei mesi specifici in base alla frequenza
```

## Verifica
Dopo le modifiche:
1. Creare una spesa con startMonth=6 (Giugno) 
2. Verificare che in Marzo NON venga conteggiata nel totale
3. Verificare che in Giugno SIA conteggiata
4. Nascondere una spesa per Marzo via override
5. Verificare che NON venga conteggiata nel totale quote

## Note
- I versamenti membri restano versamenti liberi (non collegati a spese)
- Il totale mensile calcolato serve solo per determinare la quota di ciascun membro
- Ogni membro versa la sua quota percentuale sul totale spese attive per quel mese