# Project State - Famiglia Budget

## Stato di Sviluppo

**Ultimo aggiornamento:** 2026-03-06  
**Fase:** Sviluppo attivo - Implementazione OCR  
**Branch:** `scontrini` (feature branch)

---

## Stack Tecnologico

### Core
| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| Next.js | ^14.2.35 | Framework React full-stack |
| React | ^18.3.1 | UI Library |
| TypeScript | ^5.9.3 | Tipizzazione statica |

### Database & Backend
| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| Turso (libsql) | ^0.17.0 | Database SQLite cloud |
| Drizzle ORM | ^0.45.1 | ORM type-safe |
| Drizzle Kit | ^0.30.1 | Migrazioni DB |

### Autenticazione
| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| NextAuth.js | ^4.24.13 | Auth solution |
| bcryptjs | ^3.0.3 | Hash password |

### UI & Styling
| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| Tailwind CSS | ^4.1.18 | Utility CSS |
| shadcn/ui | ^3.8.5 | Componenti UI |
| Radix UI | ^1.4.3 | Primitive UI |
| Lucide React | ^0.574.0 | Icone |

### State & Data Fetching
| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| Zustand | ^5.0.11 | Global state |
| TanStack Query | ^5.90.21 | Server state |

### Altro
| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| Recharts | ^3.7.0 | Grafici |
| Zod | ^4.3.6 | Validazione schema |
| Tesseract.js | ^7.0.0 | OCR |
| Ollama | ^0.6.3 | AI (OCR) |

---

## Database Schema

### Tabelle Principali

```
groups
├── id (uuid)
├── name
├── owner_id (fk → users)
├── created_at
└── updated_at

users
├── id (uuid)
├── name
├── email (unique)
├── image
├── password (hash, nullable)
├── provider ('google' | 'credentials')
└── created_at

group_members
├── id (uuid)
├── group_id (fk → groups)
├── user_id (fk → users, nullable)
├── name
├── quota_percent (0-100)
└── created_at

expense_categories
├── id (uuid)
├── group_id (fk → groups)
├── name
├── icon (lucide name)
├── color (hex)
└── created_at

recurring_expenses
├── id (uuid)
├── group_id (fk → groups)
├── category_id (fk → expense_categories, nullable)
├── name
├── amount
├── frequency_type ('weekly' | 'monthly' | 'yearly' | 'days' | 'months')
├── frequency_value (int)
├── day_of_month (int, nullable)
├── is_active (boolean)
├── start_month (int, nullable)
├── start_year (int, nullable)
├── end_month (int, nullable)
├── end_year (int, nullable)
├── created_at
└── updated_at

one_time_expenses
├── id (uuid)
├── group_id (fk → groups)
├── expense_id (fk → recurring_expenses, nullable)
├── category_id (fk → expense_categories, nullable)
├── name
├── amount
├── date (timestamp)
├── month
├── year
├── is_paid (boolean)
├── receipt_text (OCR, nullable)
└── created_at

expense_payments
├── id (uuid)
├── group_id (fk → groups)
├── expense_id (fk → recurring_expenses)
├── month
├── year
├── amount
└── paid_at

payments
├── id (uuid)
├── group_id (fk → groups)
├── member_id (fk → group_members)
├── expense_id (fk → recurring_expenses, nullable)
├── month
├── year
├── amount_paid
├── is_confirmed (boolean)
├── confirmed_at (nullable)
└── created_at
```

---

## Regole di Business

### Quote Membri
- **Totale deve essere esattamente 100%**
- Validazione in fase di inserimento/modifica membro
- Errore se somma != 100

### Calcoli

#### Normalizzazione a importo mensile
```
weekly:    amount × 4.33
monthly:   amount × 1
yearly:    amount ÷ 12
days:      amount × (30 / frequency_value)
months:    amount ÷ frequency_value
```

#### Quota membro
```
calcolato = (totale_mensile × quota_percent) / 100
```

### Validazioni
- Importi >= 0
- Frequenza custom: frequency_value > 0
- Nome gruppo obbligatorio
- Nome membro obbligatorio con quota > 0

---

## Pagine dell'Applicazione

| Percorso | Descrizione | Stato |
|----------|-------------|-------|
| `/` | Landing / Login | ✅ Completo |
| `/dashboard` | Dashboard principale | ✅ Completo |
| `/groups` | Lista gruppi utente | ✅ Completo |
| `/groups/[id]` | Dashboard gruppo | ✅ Completo |
| `/groups/[id]/members` | Gestione membri | ✅ Completo |
| `/groups/[id]/expenses` | Spese ricorrenti | ✅ Completo |
| `/groups/[id]/expenses/one-time` | Spese singole | 🔄 In sviluppo (upload OCR) |
| `/groups/[id]/expenses/one-time/[expenseId]` | Dettaglio spesa singola | 🔄 Da creare |
| `/groups/[id]/reports` | Report e statistiche | ✅ Completo |

---

## API Routes

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth handler |
| `/api/auth/register` | POST | Registrazione utente |
| `/api/groups` | GET, POST | Lista/crea gruppi |
| `/api/groups/[id]` | GET, PATCH, DELETE | Gestione gruppo |
| `/api/groups/[id]/members` | GET, POST | Lista/aggiungi membri |
| `/api/groups/[id]/members/[memberId]` | PATCH, DELETE | Modifica/rimuovi membro |
| `/api/groups/[id]/categories` | GET, POST | Categorie spese |
| `/api/groups/[id]/expenses` | GET, POST | Spese ricorrenti |
| `/api/groups/[id]/expenses/[expenseId]` | PATCH, DELETE | Gestione spesa |
| `/api/groups/[id]/one-time-expenses` | GET, POST | Spese singole |
| `/api/groups/[id]/expensePayments` | GET, POST | Pagamenti spese |
| `/api/groups/[id]/payments` | GET, POST | Pagamenti membri |
| `/api/groups/[id]/receipts` | POST, GET, DELETE | Upload/OCR ricevute |
| `/api/home` | GET | Dati dashboard |

---

## Funzionalità Implementate

### ✅ Completate

1. **Autenticazione**
   - Login Google OAuth
   - Login email/password
   - Registrazione utente
   - Protezione route con NextAuth

2. **Gestione Gruppi**
   - Creazione gruppo
   - Dashboard gruppo
   - Impostazioni

3. **Gestione Membri**
   - Aggiungi membro con nome e quota %
   - Modifica quota
   - Rimuovi membro
   - Validazione totale = 100%

4. **Gestione Categorie**
   - Crea categoria (nome, icona, colore)
   - Categorie predefinite

5. **Gestione Spese Ricorrenti**
   - Crea/modifica/elimina spesa
   - Multiple frequenze supportate
   - Attiva/disattiva spesa

6. **Calcolo Quote**
   - Totale mensile automatico
   - Distribuzione quote
   - Visualizzazione dettaglio

7. **Pagamenti**
   - Registrazione versamento
   - Conferma manuale
   - Storico

8. **Report**
   - Calcolato vs Versato
   - Spese per categoria (pie chart)
   - Storico mensile

### 🔄 In Sviluppo

1. **OCR Scontrini**
   - [x] Schema DB aggiornato
   - [x] API upload/OCR
   - [ ] UI upload nella lista spese
   - [ ] Pagina dettaglio con OCR
   - [ ] Test completo

---

## Dipendenze npm

```json
{
  "dependencies": {
    "@auth/core": "^0.34.3",
    "@ducanh2912/next-pwa": "^10.2.9",
    "@libsql/client": "^0.17.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.90.21",
    "@types/node": "^25.2.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.4.24",
    "bcryptjs": "^3.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "drizzle-orm": "^0.45.1",
    "lucide-react": "^0.574.0",
    "next": "^14.2.35",
    "next-auth": "^4.24.13",
    "next-themes": "^0.4.6",
    "ollama": "^0.6.3",
    "postcss": "^8.5.6",
    "radix-ui": "^1.4.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^3.7.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.1",
    "tailwindcss": "^4.1.18",
    "tesseract.js": "^7.0.0",
    "typescript": "^5.9.3",
    "uuid": "^13.0.0",
    "zod": "^4.3.6",
    "zustand": "^5.0.11"
  }
}
```

---

## Note Sviluppo

- Multi-tenant: utenti possono appartenere a più gruppi
- Storage ricevute: `public/receipts/{groupId}/{expenseId}_{timestamp}.jpg`
- OCR: Tesseract.js eseguito lato client
- Flessibilità massima su frequenze spese
- Il "calcolato" coincide con "versato" fino a conferma manuale

---

## Riferimenti

- `SPEC.md` - Specifica completa progetto
- `IMPLEMENTATION_PLAN.md` - Piano OCR
- `SESSION_MEMORY.md` - Memoria sessioni
- `src/db/schema.ts` - Schema TypeScript
- `src/db/index.ts` - Setup database

