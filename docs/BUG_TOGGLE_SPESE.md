# Bug Critico: Toggle Attiva/Disattiva Spese

## Descrizione Bug

**Data rilevamento:** 2026-03-06  
**Severità:** Critico  
**Stato:** Da risolvere

---

## Problema

Quando un utente disattiva una spesa ricorrente usando il toggle nella UI, la spesa **scompare completamente da tutti i mesi**, invece di essere spostata in una sezione "spese nascoste" dove può essere riattivata.

### Scenario

1. L'utente ha spese configurate per marzo 2026 (startMonth=3)
2. L'utente naviga su **febbraio 2026**
3. Le spese di marzo non sono visibili a febbraio ✓ (corretto)
4. L'utente naviga su **marzo 2026**
5. L'utente disattiva una spesa con il toggle
6. **Bug:** La spesa sparisce completamente - non è più visibile da nessuna parte

### Comportamento Atteso

- **A febbraio**: Le spese che iniziano a marzo NON sono visibili (corretto)
- **A marzo**: Spese attive sono visibili normalmente
- **Dopo disattivazione**: La spesa dovrebbe apparire in una sezione "Spesi Nascoste" espandibile
- **Riattivazione**: L'utente può riattivare la spesa dalla sezione nascosta

---

## Analisi Tecnica

### Codice Problema

**File:** `src/app/api/groups/[id]/expenses/route.ts` (linee 9-27)

```typescript
function isExpenseActiveForMonth(
  expense: { isActive: boolean; startMonth: number | null; startYear: number | null; endMonth: number | null; endYear: number | null },
  month: number,
  year: number
): boolean {
  // BUG: Se isActive è false, ritorna false per tutti i mesi
  if (!expense.isActive) return false;
  
  // ... logica start/end month
}
```

**Problema:** Il flag `isActive` è globale (valido per sempre), quindi:
- `isActive = true` → spesa visibile in tutti i mesi (nel range start-end)
- `isActive = false` → spesa **mai** visibile

### UI Toggle

**File:** `src/app/groups/[id]/expenses/page.tsx` (linee 319-346)

```typescript
const toggleExpense = async (expenseId: string, isActive: boolean) => {
  // ...
  body: JSON.stringify({
    expenseId,
    // ... altri campi
    isActive: !isActive,  // Imposta isActive globalmente
  }),
};
```

### Flusso Attuale

```
1. Utente disattiva spesa (toggle)
   └─> PUT /api/groups/[id]/expenses con isActive: false

2. API aggiorna nel database
   └─> recurringExpenses.isActive = false

3. Utente naviga su qualsiasi mese
   └─> GET /api/groups/[id]/expenses?month=X&year=Y
   └─> API filtra: isExpenseActiveForMonth() ritorna false
   └─> Spesa non visualizzata
```

---

## Schema Database

Il database ha già i campi per gestire periodi:

```typescript
// src/db/schema.ts
recurringExpenses {
  // ...
  isActive: boolean,        // Flag globale attivo/disattivo
  startMonth: integer,      // Da mese (1-12)
  startYear: integer,       // Da anno
  endMonth: integer,        // A mese (1-12)
  endYear: integer,         // A anno
}
```

**Il problema:** I campi `startMonth/startYear/endMonth/endYear` permettono di definire il periodo, ma il toggle `isActive` è separato e globale.

---

## Comportamento Atteso (Chiarito)

### Logica di Visualizzazione

| Condizione | Visibilità |
|------------|------------|
| `startMonth > mese_corrente` | ❌ Non visibile (ancora non iniziata) |
| `endMonth < mese_corrente` | ❌ Non visibile (scaduta) → sezione nascosta |
| `isActive = false` | ❌ Non visibile → sezione nascosta |
| `startMonth <= mese_corrente <= endMonth` e `isActive = true` | ✅ Visibile normalmente |

### Sezione "Spese Nascoste"

Quando una spesa è disattivata (o scaduta), deve apparire in una sezione espandibile:
- **Titolo espandibile:** "Spese Nascoste" con contatore
- **Contenuto:** Lista spese disattivate con:
  - Nome, importo, categoria
  - Toggle per riattivare
  - Pulsante elimina
- **Stato iniziale:** Collassata

---

## Soluzione Proposta

### Modello Concettuale

Il toggle "attiva/disattiva" deve:
1. Impostare `endMonth` e `endYear` al mese corrente (la spesa sarà valida fino a quel mese)
2. La spesa NON sarà più visibile nei mesi successivi
3. La spesa apparirà nella sezione "Spese Nascoste" per tutti i mesi

### Implementazione

**Toggle (linea 319-346 in `expenses/page.tsx`):**
```typescript
const toggleExpense = async (expenseId: string, isActive: boolean) => {
  const expense = expenses.find(e => e.id === expenseId);
  if (!expense) return;

  // Se è attiva → disattiva impostando endMonth/Year
  // Se è disattiva → riattiva impostando endMonth/Year a null
  const newEndMonth = !isActive ? null : currentMonthState;
  const newEndYear = !isActive ? null : currentYearState;

  const res = await fetch(`/api/groups/${groupId}/expenses`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expenseId,
      name: expense.name,
      amount: expense.amount,
      categoryId: expense.categoryId,
      frequencyType: expense.frequencyType,
      frequencyValue: expense.frequencyValue,
      isActive: !isActive,  // Manteniamo isActive per retrocompatibilità
      startMonth: expense.startMonth,
      startYear: expense.startYear,
      endMonth: newEndMonth,
      endYear: newEndYear,
    }),
  });
};
```

### API: Mostrare Anche Spese Nascoste

Modificare l'API per accettare `?includeHidden=true`:

```typescript
// GET /api/groups/[id]/expenses?month=3&year=2026&includeHidden=true
export async function GET(...) {
  // ... esistente ...

  const includeHidden = searchParams.get("includeHidden") === "true";

  let expenses = allExpenses;
  if (!includeHidden) {
    expenses = allExpenses.filter(e => isExpenseActiveForMonth(e, month, year));
  }

  // Restituisci anche lo stato di ogni spesa
  const result = expenses.map((expense) => ({
    ...expense,
    category: categories.find((c) => c.id === expense.categoryId),
    isActiveForMonth: isExpenseActiveForMonth(expense, month, year),
    isHidden: !isExpenseActiveForMonth(expense, month, year),
  }));

  return NextResponse.json(result);
}
```

### UI: Sezione Spese Nascoste

In `expenses/page.tsx`:

```tsx
// Distingui spese visibili da nascoste
const visibleExpenses = expenses.filter(e => !e.isHidden);
const hiddenExpenses = expenses.filter(e => e.isHidden);

// ... nella UI ...

// Sezione normale (spese attive)
{visibleExpenses.map(expense => (
  // ... renderizza spesa
))}

// Sezione espandibile (spese nascoste)
{hiddenExpenses.length > 0 && (
  <Collapsible>
    <CollapsibleTrigger>
      Spese Nascoste ({hiddenExpenses.length})
    </CollapsibleTrigger>
    <CollapsibleContent>
      {hiddenExpenses.map(expense => (
        // ... renderizza con opacità ridotta
      ))}
    </CollapsibleContent>
  </Collapsible>
)}
```

---

## Conclusione

**L'Opzione 1 è consigliata** perché:
1. È semplice da implementare
2. Ha un comportamento intuitivo
3. È reversibile (l'utente può modificare endMonth/endYear)
4. Usa i campi già esistenti nel database

La modifica richiede:
1. Modificare `toggleExpense` in `expenses/page.tsx` per impostare `endMonth/endYear`
2. Opzionalmente: modificare l'API per mostrare comunque le spese "scadute" se l'utente vuole visualizzarle

---

## Richiesta Utente

L'utente desidera che:
- Le spese disattivate **non vengano eliminate**
- Siano ancora visualizzabili (ma disattivate) nei mesi passati
- Possano essere riattivate in futuro

**Questo conferma che l'Opzione 1 è la più adatta**, con l'aggiunta di:
- Mostrare le spese "scadute" (con endMonth/endYear < mese corrente) nella lista
- Permettere di modificare/riattivare la spesa

---

## Problemi Correlati

### 1. Spese Disattivate Non Visibili

**Problema:** L'API non restituisce le spese con `isActive = false`, quindi:
- L'utente non può vedere quali spese ha disattivato
- Non può riattivarle

**Soluzione:** Modificare l'API per accettare un parametro `?includeInactive=true` che restituisce tutte le spese, indipendentemente da `isActive`.

### 2. UI Non Mostrate le Spese Disattivate

**Problema:** In `expenses/page.tsx` linea 378:
```typescript
const activeExpenses = expenses.filter(e => e.isActive);
```

Anche se l'API restituisse le spese disattivate, verrebbero filtrate in UI.

**Soluzione:** Mostrare tutte le spese con indicatore visivo (es. opacità ridotta) per quelle disattivate.

---

## Riepilogo Interventi Necessari

### 1. Modifiche API (`/api/groups/[id]/expenses`)

- Aggiungere parametro `?includeHidden=true` per restituire anche spese non attive nel mese
- Restituire campo `isHidden` per ogni spesa (indica se nascosta per il mese corrente)

### 2. Modifiche UI (`expenses/page.tsx`)

- Modificare `toggleExpense` per impostare `endMonth/endYear` al mese corrente (disattiva da ora)
- Chiamare l'API con `includeHidden=true` per ottenere tutte le spese
- Creare sezione espandibile "Spese Nascoste" con contatore
- Nella sezione nascosta: mostrare spese con opacità ridotta, toggle per riattivare

### 3. Logica di Visualizzazione

| Campo | Valore | Mese Precedente | Mese Corrente | Mese Successivo |
|-------|--------|-----------------|---------------|------------------|
| startMonth | 3 | ❌ Nascosta | ✅ Visibile | ✅ Visibile |
| endMonth | 2 | ✅ Visibile | ❌ Nascosta | ❌ Nascosta |
| endMonth (dopo toggle) | 3 (mese corrente) | ✅ Visibile | ⚠️ Nascosta (in sezione) | ❌ Nascosta |

### 4. Componente Collapsible

Usare il componente Radix UI `Collapsible` già disponibile in shadcn/ui:
```bash
npx shadcn@latest add collapsible
```

---

## Fix Applicati (2026-03-06) - Terza Versione

### Soluzione: Tabella Override per Mese

Creata nuova tabella `expense_month_overrides`:
- Memorizza lo stato attivo/disattivo per ogni mese specifico
- Se c'è un override → usa quello
- Se non c'è → usa `isActive` globale

### Correzioni Applicate

| # | Problema | Soluzione |
|---|----------|-----------|
| 1 | Logica globale non funzionava | Nuova tabella `expense_month_overrides` |
| 2 | Toggle ignorava il mese | Toggle passa month/year all'API |
| 3 | API non gestiva override | PUT crea/aggiorna override |
| 4 | Totale non aggiornato | Calcola da `visibleExpenses` |
| 5 | Azioni abilitate sempre | Disabilita per spese non attive |

### Logica Attuale

1. **Toggle a marzo** → Crea override per marzo (non Febbraio)
2. **Toggle a febbraio** → Crea override per febbraio (non marzo)
3. **Totale mensile** → Calcola da spese visibili (`isHidden=false`)
4. **Azioni** → Disabilitate per spese non attive

### File Modificati

- `src/db/schema.ts` - Tabella `expense_month_overrides`
- `src/app/api/groups/[id]/expenses/route.ts` - Gestione override
- `src/app/api/groups/[id]/expensePayments/route.ts` - Aggiornamento override al pagamento
- `src/app/groups/[id]/expenses/page.tsx` - Toggle usa `isActiveForMonth`

### File Modificati

- `src/db/schema.ts` - Aggiunta tabella `expense_month_overrides`
- `src/app/api/groups/[id]/expenses/route.ts` - Gestione override
- `src/app/groups/[id]/expenses/page.tsx` - Toggle passa month/year

### File Modificati

- `src/app/api/groups/[id]/expenses/route.ts`
- `src/app/groups/[id]/expenses/page.tsx`
