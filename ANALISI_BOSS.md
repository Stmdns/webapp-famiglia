# 📋 Analisi Webapp Famiglia - Boss

## Panoramica Progetto

**Nome:** Famiglia Budget  
**Repo:** https://github.com/Stmdns/webapp-famiglia  
**Deploy:** https://famiglia-budget.vercel.app (Vercel)

---

## Stack Tecnologica

| Componente | Tecnologia |
|------------|------------|
| Framework | Next.js 14 (App Router) |
| Database | Turso (libSQL) + Drizzle ORM |
| Auth | NextAuth.js |
| UI | shadcn/ui + Radix UI |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Deploy | Vercel |

---

## Struttura File

```
src/
├── app/                    # Pagine Next.js
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth
│   │   └── groups/[id]/   # CRUD gruppi
│   ├── dashboard/         # Dashboard principale
│   └── groups/[id]/       # Pagine gruppo
├── components/
│   └── ui/                # Componenti shadcn
├── db/
│   └── schema.ts          # Schema Drizzle
├── lib/                   # Utility
└── store/                 # Zustand stores
```

---

## Database Schema

### Tabelle Principali

| Tabella | Descrizione |
|---------|-------------|
| `groups` | Gruppi/famiglie |
| `users` | Utenti autenticati |
| `group_members` | Membri con quota % |
| `expense_categories` | Categorie spese |
| `recurring_expenses` | Spese ricorrenti |
| `expense_month_overrides` | Override attivo/disattivo per mese |
| `one_time_expenses` | Spese una-tantum |
| `expense_payments` | Pagamenti spese ricorrenti |
| `payments` | Pagamenti membri |

### Relazioni

```
groups ← group_members ← payments
groups ← expense_categories ← recurring_expenses
groups ← recurring_expenses ← expense_month_overrides
groups ← recurring_expenses ← expense_payments
groups ← one_time_expenses
```

---

## Funzionalità Implementate

### ✅ Autenticazione
- Login Google OAuth
- Login email/password (credentials)

### ✅ Gestione Gruppi
- Creazione gruppi
- Invito membri
- Quote percentuali membri (totale = 100%)

### ✅ Spese Ricorrenti
- Frequenze: weekly, monthly, yearly, days, months
- Toggle attivo/disattivo per singolo mese
- Spese una-tantum collegate a ricorrenti

### ✅ Pagamenti
- Registrazione versamenti
- Conferma manuale
- Storico

### ✅ Report
- Calcolato vs Versato
- Spese per categoria (pie chart)
- Andamento storico

---

## Logica Toggle Spese

| Azione | Risultato |
|--------|-----------|
| Toggle ON per Marzo | Override attivo solo per Marzo |
| Toggle OFF per Marzo | Spesa non calcolata per Marzo |
| Totale mensile | Somma spese attive nel mese |

---

## API Routes

| Metodo | Endpoint | Descrizione |
|--------|---------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | Auth |
| GET/POST | `/api/groups` | Lista/Crea gruppi |
| GET/PUT/DELETE | `/api/groups/[id]` | Singolo gruppo |
| GET/POST | `/api/groups/[id]/members` | Membri |
| GET/POST | `/api/groups/[id]/expenses` | Spese ricorrenti |
| GET/POST | `/api/groups/[id]/one-time-expenses` | Spese singole |
| GET/POST | `/api/groups/[id]/payments` | Pagamenti |
| GET/POST | `/api/groups/[id]/categories` | Categorie |
| GET | `/api/groups/[id]/reports` | Report |

---

## Variabili d'Ambiente Richieste

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## ⚠️ Note Importanti

### Cosa NON modificare (senza accordo)

1. **Struttura database** - Lo schema è giàdefinito e funziona
2. **Routing** - Le pagine seguono la specifica in SPEC.md
3. **Autenticazione** - NextAuth configurato e funzionante
4. **Logicadi toggle** - Implementata correttamente nell'ultimo commit

### Bug Noti (da sistemare)

Dalla PROJECT_STATE non risultano bug critici segnalati. L'app è in produzione.

### Prossimi Passi (quando Denis torna al PC)

1. Configurare `.env` con variabili Turso
2. Testare in locale
3. Eventuale fix bug specifici

---

## 📁 File Utili

- `SPEC.md` - Specifica completa progetto
- `PROJECT_STATE.md` - Stato attuale sviluppo
- `IMPLEMENTATION_PLAN.md` - Piano implementazione

---

*Analisi completata da Boss - 2026-03-06*
