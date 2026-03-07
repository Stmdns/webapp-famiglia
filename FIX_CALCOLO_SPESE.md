# FIX: Calcolo Pagamenti nelle Spese Ricorrenti

## Problema
Le spese ricorrenti non mostravano il calcolo delle spese singole collegate (oneTimeExpenses).

## Soluzione Implementata

### 1. API (`src/app/api/groups/[id]/expenses/route.ts`)

**Modifiche:**
- Importato `oneTimeExpenses` dallo schema
- Aggiunto query per recuperare tutte le `oneTimeExpenses` per il gruppo e il mese specificato
- Raggruppate per `expenseId` e sommate gli amount
- Inserito `paidAmount` nella risposta per ogni recurring expense

```typescript
// Recupera le spese singole collegate (one-time expenses) per il mese specificato
const oneTimeExpensesData = await db
  .select()
  .from(oneTimeExpenses)
  .where(and(
    eq(oneTimeExpenses.groupId, id),
    eq(oneTimeExpenses.month, month),
    eq(oneTimeExpenses.year, year)
  ));

// Raggruppa per expenseId e somma gli amount per calcolare il totale pagato
const paidAmountsMap = new Map<string, number>();
oneTimeExpensesData.forEach(ote => {
  if (ote.expenseId) {
    const current = paidAmountsMap.get(ote.expenseId) || 0;
    paidAmountsMap.set(ote.expenseId, current + ote.amount);
  }
});
```

### 2. Frontend (`src/app/groups/[id]/expenses/page.tsx`)

**Modifiche:**
- Aggiornato `getExpensePaidAmount()` per usare il campo `paidAmount` dall'API
- Modificato l'UI per mostrare il formato "€{paidAmount}/€{expectedAmount}"

```typescript
const getExpensePaidAmount = (expenseId: string): number => {
  // Prima cerca nel paidAmount dell'expense (calcolato dalle oneTimeExpenses)
  const expense = expenses.find(e => e.id === expenseId);
  if (expense?.paidAmount !== undefined) {
    return expense.paidAmount;
  }
  // Fallback al vecchio sistema expensePayments
  const payment = expensePayments.find(p => p.expenseId === expenseId);
  return payment?.amount || 0;
};
```

```tsx
<p className="text-xs text-slate-500">
  {paidAmount > 0 ? `€${paidAmount.toFixed(0)}/€${expectedAmount.toFixed(0)}` : 'Non pagato'}
</p>
```

## Risultato

✅ **Prima:**
- Spesa ricorrenta = €400
- Spese singole collegate = €50, €30
- UI mostrava: "Pagato: €0" (non calcolato)

✅ **Dopo il fix:**
- Spesa ricorrenta = €400
- Spese singole collegate = €50, €30 → totale €80
- UI mostra: "€80/€400" (calcolo corretto)

## Test
- ✅ Build completato con successo
- ✅ Nessun errore TypeScript
- ✅ Codice retrocompatibile con `expensePayments`