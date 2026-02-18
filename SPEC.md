# Famiglia Budget - Specifica Progetto

## Stack Tecnologico
- **Database**: Turso (libsql) + Drizzle ORM
- **Auth**: NextAuth (Google + credentials)
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **Charts**: Recharts
- **Validazione**: Zod

## Purpose
App per gestione spese ricorrenti familiari con quote personalizzabili per membro. L'obiettivo è organizzare quanto ci sarà da spendere nel prossimo mese e quindi quanto ognuno deve versare.

## Terminologia
- **Gruppo**: Famiglia/gruppo di persone che condividono spese
- **Membro**: Persona nel gruppo con quota percentuale
- **Spesa ricorrente**: Spesa che si ripete (settimanale, mensile, annuale, custom)
- **Frequenza**: 
  - `weekly`: ogni settimana
  - `monthly`: ogni mese
  - `yearly`: ogni anno
  - `days`: ogni N giorni
  - `months`: ogni N mesi
- **Quota**: Percentuale di spesa assegnata a un membro (totale = 100%)
- **Calcolato**: Importo che il membro dovrebbe versare
- **Versato**: Importo effettivamente versato
- **Confermato**: Versamento confermato manualmente

## Schema Database

### groups
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | text (uuid) | ID univoco |
| name | text | Nome del gruppo |
| owner_id | text | ID utente proprietario |
| created_at | datetime | Data creazione |
| updated_at | datetime | Data ultimo aggiornamento |

### users
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | text (uuid) | ID univoco |
| name | text | Nome utente |
| email | text | Email (univoca) |
| image | text | URL avatar |
| password | text | Hash password (nullable) |
| provider | text | Provider auth ('google' o 'credentials') |
| created_at | datetime | Data creazione |

### group_members
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | text (uuid) | ID univoco |
| group_id | text | FK a groups |
| user_id | text | FK a users (nullable per membri senza account) |
| name | text | Nome visualizzato del membro |
| quota_percent | real | Percentuale quota (0-100) |
| created_at | datetime | Data creazione |

### expense_categories
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | text (uuid) | ID univoco |
| group_id | text | FK a groups |
| name | text | Nome categoria |
| icon | text | Nome icona lucide |
| color | text | Colore esadecimale |
| created_at | datetime | Data creazione |

### recurring_expenses
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | text (uuid) | ID univoco |
| group_id | text | FK a groups |
| category_id | text | FK a expense_categories |
| name | text | Nome spesa |
| amount | real | Importo |
| frequency_type | text | 'weekly' \| 'monthly' \| 'yearly' \| 'days' \| 'months' |
| frequency_value | integer | Numero per frequenza custom (es. 2 per "ogni 2") |
| day_of_month | integer | Giorno del mese per addebito (1-31, nullable) |
| is_active | boolean | Se la spesa è attiva |
| created_at | datetime | Data creazione |
| updated_at | datetime | Data ultimo aggiornamento |

### payments
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | text (uuid) | ID univoco |
| group_id | text | FK a groups |
| member_id | text | FK a group_members |
| expense_id | text | FK a recurring_expenses (nullable) |
| month | integer | Mese (1-12) |
| year | integer | Anno |
| amount_paid | real | Importo versato |
| is_confirmed | boolean | Se il pagamento è confermato |
| confirmed_at | datetime | Data conferma (nullable) |
| created_at | datetime | Data creazione |

## Calcoli

### Normalizzazione a importo mensile
```
weekly:     amount × 4.33
monthly:    amount × 1
yearly:     amount ÷ 12
days:       amount × (30 / frequency_value)
months:     amount ÷ frequency_value
```

### Quota membro
```
calcolato = (totale_mensile × quota_percent) / 100
```

### Validazioni
- Totale quote membri = 100%
- Importi >= 0
- Frequenza custom: frequency_value > 0

## Funzionalità

### 1. Autenticazione
- Login con Google OAuth
- Login con email/password
- Protezione route con NextAuth

### 2. Gestione Gruppi
- Creare nuovo gruppo
- Unirsi a gruppo esistente (invito)
- Uscire da gruppo
- Eliminare gruppo (solo owner)

### 3. Gestione Membri
- Aggiungi membro con nome e quota %
- Modifica quota membro
- Rimuovi membro
- Validazione: totale quote = 100%

### 4. Gestione Categorie
- Crea categoria con nome, icona, colore
- Modifica/elimina categoria
- Categorie predefinite: Alimentari, Mutuo, Utenze, Trasporti, Assicurazioni, Tasse, Svago, Altro

### 5. Gestione Spese Ricorrenti
- Crea spesa con nome, importo, categoria, frequenza
- Modifica spesa
- Elimina/disattiva spesa
- Frequenze: settimanale, mensile, annuale, ogni N giorni, ogni N mesi

### 6. Calcolo Quote Mensili
- Calcolo automatico totale spese mensili
- Distribuzione quote per membro
- Visualizzazione dettaglio per spesa

### 7. Pagamenti
- Visualizzazione quote da versare
- Registrazione versamento
- Conferma manuale pagamento
- Storico pagamenti

### 8. Report
- **Calcolato vs Versato**: Per ogni membro, quanto dovrebbe versare vs quanto ha versato
- **Spese per Categoria**: Distribuzione pie chart
- **Storico Mensile**: Andamento nel tempo
- **Dettaglio Spesa**: Chi paga cosa

## Pagine Frontend

| Percorso | Descrizione |
|----------|-------------|
| `/` | Landing page / Login |
| `/dashboard` | Dashboard principale |
| `/groups` | Lista gruppi |
| `/groups/[id]` | Dashboard gruppo |
| `/groups/[id]/members` | Gestione membri |
| `/groups/[id]/expenses` | Gestione spese ricorrenti |
| `/groups/[id]/reports` | Report e statistiche |
| `/groups/[id]/settings` | Impostazioni gruppo |

## Note Sviluppo
- Totale quote deve essere 100% - validazione in fase di inserimento/modifica
- Il calcolato coincide con versato fino alla conferma manuale
- Flessibilità massima su frequenze spese
- Multi-tenant: ogni utente può appartenere a più gruppi
