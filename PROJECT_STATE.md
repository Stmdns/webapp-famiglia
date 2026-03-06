# Project State - COMPACT

## Stato di Sviluppo

**Data:** 2026-03-06  
**Sessione:** Completata - Deploy su Vercel

**URL Produzione:** https://famiglia-budget.vercel.app

---

## Stack

| Componente | Tecnologia |
|------------|------------|
| Framework | Next.js 14 |
| Database | Turso (libsql) + Drizzle ORM |
| Auth | NextAuth.js |
| UI | shadcn/ui + Radix UI |
| Deploy | Vercel |

---

## Schema Chiave

```
recurring_expenses (id, groupId, name, amount, frequencyType, 
                   isActive, startMonth, startYear, endMonth, endYear)
                   
expense_month_overrides (expenseId, month, year, isActive)
oneTimeExpenses (expenseId) - foreign key to recurringExpenses
```

---

## Logica Toggle

| Azione | Risultato |
|--------|-----------|
| Toggle a Marzo | Override per Marzo, non per Febbraio |
| Toggle a Febbraio | Override per Febbraio, non per Marzo |
| Totale | Calcolato da spese visibili (`isHidden=false`) |
| Pagamento | Data fittizia = ultimo giorno del mese |

---

## API Routes Modificate

- `GET /api/groups/[id]/expenses?month=X&year=Y&includeHidden=true`
- `PUT /api/groups/[id]/expenses` + `month/year` → crea/aggiorna override
- `POST /api/groups/[id]/one-time-expenses` + `recurringExpenseId`

---

## File Modificati

1. `src/db/schema.ts` - Tabella `expense_month_overrides`
2. `src/app/api/groups/[id]/expenses/route.ts` - Logica override
3. `src/app/api/groups/[id]/expensePayments/route.ts` - Data pagamento
4. `src/app/api/groups/[id]/one-time-expenses/route.ts` - Spesa ricorrente
5. `src/app/groups/[id]/expenses/page.tsx` - Toggle & pagamenti
6. `src/app/groups/[id]/expenses/one-time/page.tsx` - Dropdown ricorrenti
7. `src/app/groups/[id]/page.tsx` - Dati per periodo

---

## Funzionalità Implementate

### ✅ Periodi
- Navigazione mese/anno
- Toggle per periodo specifico
- Spese visibili solo nel periodo corretto

### ✅ Pagamenti
- Data personalizzabile nel dialog
- Importo calcolato (expected - paid)
- Modifica importo toggle

### ✅ Spese Singole
- Upload foto + OCR
- Dropdown spesa ricorrente
- Allocazione automatica

### ✅ Dashboard
- Quote membri
- Pagamenti
- Report grafici

---

## Database Migration

```
drizzle/0003_wild_maria_hill.sql
- Create table expense_month_overrides
```

---

## Commit

**Branch:** main  
**Commit:** c2eb30e  
**Message:** feat: implement period-based expense logic
