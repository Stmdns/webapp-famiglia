# Session Memory - COMPACT

## Project: Famiglia Budget

**Ultimo aggiornamento:** 2026-03-06  
**Stato:** Sviluppo - Sessione completata

---

## Stack Tecnologico
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI:** shadcn/ui, Radix UI, Lucide React, Recharts, sonner
- **State:** Zustand, TanStack Query
- **Database:** Turso (libsql), Drizzle ORM
- **Auth:** NextAuth.js (Google + credentials)

---

## Feature Implementate (Sessione Odierna)

### 1. Logica Periodi Spese (CRITICO)
**Problema:** Toggle disattivava spese per sempre invece che per periodo specifico
**Soluzione:** 
- Nuova tabella `expense_month_overrides` per stato per mese
- Toggle aggiorna override per il mese visualizzato
- API usa override se presente, altrimenti usa `isActive`

### 2. Navigazione Periodi
- Aggiornato `fetchData()` per passare `month/year` all'API
- Aggiunto stato `currentMonthState/currentYearState`
- Toggle usa `isActiveForMonth` per UI
- Navigazione sempre visibile su mobile

### 3. Pagamenti con Data Personalizzata
- Dialog pagamento con campo data personalizzabile
- Toggle "Usa giorno selezionato"
- Importo calcolato come: `expectedAmount - paidAmount`
- Toggle "Modifica importo" per override

### 4. Spese Singole + Ricorrenti
- Dropdown automatico per collegare spese singole a ricorrenti
- Se una ricorrente → allegata automaticamente
- Se più ricorrenti → dropdown per selezionare
- API aggiornata per gestire `recurringExpenseId`

---

## Files Modificati

| File | Modifiche |
|------|-----------|
| `src/db/schema.ts` | Aggiunta tabella `expense_month_overrides` |
| `src/app/api/groups/[id]/expenses/route.ts` | Gestione override e month/year |
| `src/app/api/groups/[id]/expensePayments/route.ts` | Gestione data pagamento |
| `src/app/api/groups/[id]/one-time-expenses/route.ts` | Gestione recurringExpenseId |
| `src/app/groups/[id]/expenses/page.tsx` | Toggle periodi, pagamenti, spamse nascoste |
| `src/app/groups/[id]/expenses/one-time/page.tsx` | Navigazione + dropdown ricorrenti |
| `src/app/groups/[id]/page.tsx` | Dati per periodo corretto |

---

## Database Migration

```
drizzle/0003_wild_maria_hill.sql
- Create table expense_month_overrides
```

---

## Come Funziona

| Scenario | Risultato |
|----------|-----------|
| Toggle spesa a Marzo | Override per Marzo, non Febbraio |
| Toggle spesa a Febbraio | Override per Febbraio, non Marzo |
| Pagamento spesa | Data fittizia = ultimo giorno del mese |
| Spesa singola Alimentari | Collegata automaticamente alla ricorrente "Alimentari" |

---

## Prossimi Passi

- Testare flusso completo
- Verificare statistiche aggiornano correttamente
