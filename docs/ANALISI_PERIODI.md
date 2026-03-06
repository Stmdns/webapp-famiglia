# Analisi: Logica di Visualizzazione per Periodi

## Panoramica

Questo documento analizza il funzionamento della logica di visualizzazione per periodi (mese/anno) nell'applicazione Famiglia Budget. Sono state analizzate le pagine principali che gestiscono la visualizzazione delle spese per periodo.

---

## Pagine Analizzate

| Pagina | File | Stato |
|--------|------|-------|
| Spese Ricorrenti | `src/app/groups/[id]/expenses/page.tsx` | ⚠️ Parziale |
| Spese Singole | `src/app/groups/[id]/expenses/one-time/page.tsx` | ❌ Incompleto |
| Dashboard Gruppo | `src/app/groups/[id]/page.tsx` | ⚠️ Parziale |
| API Spese Ricorrenti | `src/app/api/groups/[id]/expenses/route.ts` | ⚠️ Bug |
| API Spese Singole | `src/app/api/groups/[id]/one-time-expenses/route.ts` | ✅ OK |

---

## Come Funziona Attualmente

### 1. Spese Ricorrenti (`/groups/[id]/expenses`)

**Stato Implementazione:** Parziale

**Logica attuale:**
- Esiste stato `currentMonthState` e `currentYearState` per tracciare il periodo visualizzato
- Navigazione mesi presente ma **nascosta su schermi piccoli** (solo `hidden sm:flex`)
- La navigazione funziona e chiama `fetchData()` con i parametri del periodo

**BUG CRITICO TROVATO (linee 164-165):**
```typescript
// Il savePayment usa currentMonth e currentYear (data reale)
// invece di currentMonthState e currentYearState (mese visualizzato)
const savePayment = async () => {
  // ...
  body: JSON.stringify({
    expenseId: selectedExpenseId,
    month: currentMonth,        // ❌ BUG: usa la data reale
    year: currentYear,          // ❌ BUG: usa la data reale
    amount: paymentAmount,
  }),
}
```

Questo significa che quando l'utente naviga a un mese diverso e registra un pagamento, il pagamento viene salvato per il mese **corrente** (reale) invece del mese **visualizzato**.

### 2. Spese Singole (`/groups/[id]/expenses/one-time`)

**Stato Implementazione:** Mancante

**Problemi:**
- **NESSUNA navigazione per periodo** - La pagina mostra SEMPRE il mese corrente
- Non esiste stato `currentMonthState` / `currentYearState`
- L'utente non può vedere spese di mesi passati o futuri
- L'API supporta i parametri `month` e `year` ma la UI non li usa

**Codice attuale (linee 93-94):**
```typescript
const currentMonth = new Date().getMonth() + 1;  // Solo data corrente
const currentYear = new Date().getFullYear();     // Solo data corrente
```

**Codice fetch (linea 107):**
```typescript
fetch(`/api/groups/${groupId}/one-time-expenses?month=${currentMonth}&year=${currentYear}`)
```

### 3. Dashboard Gruppo (`/groups/[id]`)

**Stato Implementazione:** Parziale

**Logica attuale:**
- Ha navigazione mesi (ChevronLeft/ChevronRight)
- Ha stato `currentMonth` e `currentYear`
- Chiama `fetchData()` quando cambiano i valori

**Problema:**
- La funzione `fetchData()` non passa i parametri month/year all'API delle spese ricorrenti
- L'API spese (`/api/groups/[id]/expenses`) usa i parametri dalla query string, ma non vengono passati

**Codice (linee 70-75):**
```typescript
const [membersRes, categoriesRes, expensesRes, dataRes] = await Promise.all([
  fetch(`/api/groups/${groupId}/members`),
  fetch(`/api/groups/${groupId}/categories`),
  fetch(`/api/groups/${groupId}/expenses`),  // ❌ Senza parametri month/year!
  fetch(`/api/groups/${groupId}/payments?month=${currentMonth}&year=${currentYear}`),
]);
```

---

## API: Logica di Filtraggio

### Spese Ricorrenti (`/api/groups/[id]/expenses`)

L'API filtra le spese in base al mese/anno passato come parametro query:

```typescript
const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

// Filtro in JavaScript (non in SQL)
const expenses = allExpenses.filter(e => isExpenseActiveForMonth(e, month, year));
```

**Problemi:**
1. Il filtraggio avviene in JavaScript dopo aver scaricato TUTTE le spese - inefficiente
2. La funzione `isExpenseActiveForMonth` controlla `startMonth/startYear` e `endMonth/endYear`

### Spese Singole (`/api/groups/[id]/one-time-expenses`)

L'API filtra direttamente nel database:

```typescript
expenses = await db
  .select()
  .from(oneTimeExpenses)
  .where(and(eq(oneTimeExpenses.groupId, id), eq(oneTimeExpenses.month, month), eq(oneTimeExpenses.year, year)));
```

**Stato:** ✅ Corretto

---

## Riepilogo Problemi

### 🔴 Critici

| # | Problema | Posizione | Impatto |
|---|----------|-----------|---------|
| 1 | `savePayment` usa `currentMonth/currentYear` invece di stato | `expenses/page.tsx:164-165` | Pagamenti salvati nel mese sbagliato |
| 2 | Nessuna navigazione periodo su Spese Singole | `one-time/page.tsx` | Impossibile vedere mesi passati/futuri |
| 3 | Dashboard non passa parametri month/year all'API spese | `page.tsx:73` | Dati spese sempre del mese corrente |

### 🟡 Medi

| # | Problema | Posizione | Impatto |
|---|----------|-----------|---------|
| 4 | Navigazione periodo nascosta su mobile | `expenses/page.tsx:436` | Utenti mobile non possono cambiare periodo |
| 5 | Filtraggio spese in JS invece SQL | `expenses/route.ts:65` | Performance |
| 6 | Inconsistenza nomi variabili (`currentMonth` vs `currentMonthState`) | Varie | Confusione nel codice |

---

## Proposte di Miglioramento

### 1. Standardizzare la Navigazione Periodo

Creare un componente condiviso per la navigazione mesi:

```tsx
// components/MonthNavigator.tsx
interface MonthNavigatorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}
```

### 2. Correggere Spese Ricorrenti

**Fix Bug savePayment:**
```typescript
// Cambiare da:
month: currentMonth,
year: currentYear,

// A:
month: currentMonthState,
year: currentYearState,
```

**Aggiungere navigazione sempre visibile:**
```tsx
// Rimuovere hidden sm:flex dalla navigazione
<div className="flex items-center gap-1">
  {/* Navigazione sempre visibile */}
</div>
```

### 3. Implementare Navigazione Spese Singole

Aggiungere stato e navigazione:

```typescript
const [currentMonthState, setCurrentMonthState] = useState(currentMonth);
const [currentYearState, setCurrentYearState] = useState(currentYear);

useEffect(() => {
  fetchData();
}, [currentMonthState, currentYearState]);  // Aggiungere dipendenze
```

### 4. Correggere Dashboard

Passare i parametri month/year all'API:

```typescript
fetch(`/api/groups/${groupId}/expenses?month=${currentMonth}&year=${currentYear}`),
```

### 5. Migliorare API Spese Ricorrenti

Spostare il filtraggio nel database:

```typescript
// Invece di filtrare in JS
const expenses = allExpenses.filter(e => isExpenseActiveForMonth(e, month, year));

// Filtrare direttamente nella query (più efficiente)
// Ma richiede logica complessa per start/end date
```

---

## Flusso Ideale

```
1. Utente apre pagina Spese Ricorrenti
   └─> Visualizza mese corrente (es. Marzo 2026)
   
2. Utente clicca freccia dx (mese successivo)
   └─> Stato: currentMonthState = 4, currentYearState = 2026
   └─> fetchData() con parametri ?month=4&year=2026
   └─> API restituisce spese attive per Aprile 2026
   └─> UI aggiorna

3. Utente registra pagamento per "Affitto"
   └─> savePayment(month=4, year=2026)  ← Mese visualizzato
   └─> Pagamento salvato per Aprile 2026 ✓
```

---

## Fix Applicati (2026-03-06)

### Correzioni Completate

| # | Problema | Soluzione |
|---|----------|-----------|
| 1 | `savePayment` usava data reale invece di stato | Modificato per usare `currentMonthState/currentYearState` |
| 2 | Navigazione nascosta su mobile | Rimossa classe `hidden sm:flex` - ora sempre visibile |
| 3 | Nessuna navigazione su Spese Singole | Aggiunto stato e navigazione mesi completa |
| 4 | Dashboard non passava parametri month/year | Aggiunti parametri alla chiamata API |
| 5 | addExpense usava data reale | Modificato per usare stato del periodo visualizzato |
| 6 | saveEdit non manteneva month/year originale | Modificato per usare i valori originali della spesa |

### File Modificati

- `src/app/groups/[id]/expenses/page.tsx`
- `src/app/groups/[id]/expenses/one-time/page.tsx`
- `src/app/groups/[id]/page.tsx`

---

## Conclusione

Tutti i difetti critici sono stati risolti. L'esperienza utente ora permette di:

1. **Spese Ricorrenti**: Navigazione mesi sempre visibile + pagamenti salvati per periodo corretto
2. **Spese Singole**: Navigazione mesi disponibile + aggiunta/modifica spese per periodo corretto
3. **Dashboard**: Visualizza dati per il periodo selezionato

Le correzioni sono state completate e verificate.
