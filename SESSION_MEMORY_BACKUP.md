# Session Memory

## Project Context

Questo file contiene la memoria tra le sessioni di sviluppo. Mantiene il contesto delle decisioni, lo stato attuale, e informazioni utili per continuare il lavoro da dove si è lasciato.

---

## Ultima Sessione

**Data ultima attività:** 2026-03-06  
**Stato corrente:** Sviluppo in corso - Implementazione OCR per scontrini

---

## Contesto del Progetto

**Nome:** Famiglia Budget  
**Descrizione:** App per gestione spese ricorrenti familiari con quote personalizzabili per membro  
**Obiettivo:** Organizzare le spese mensili e calcolare quanto ognuno deve versare

---

## Decisioni Prese

### Architettura

- **Database:** Turso (libsql) + Drizzle ORM
- **Auth:** NextAuth (Google + credentials)
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand (store globali) + TanStack Query (server state)
- **Charts:** Recharts
- **Validazione:** Zod
- **OCR:** Tesseract.js (client-side)

### Design Decisions

1. **Quote membri:** Totale = 100% obbligatorio
2. **Frequenze spese:** Supporto completo (weekly, monthly, yearly, days, months)
3. **Storage ricevute:** Next.js public folder (`public/receipts/{groupId}/`)
4. **OCR:** Client-side con Tesseract.js per privacy e zero costi

---

## Lavoro in Corso

### Feature Attuale: OCR Scontrini

**Obiettivo:** Permettere upload foto scontrini per spese singole con estrazione automatica testo

**Stato:**
- [x] Schema DB aggiornato (campo `receiptText` in `oneTimeExpenses`)
- [x] Storage configurato
- [x] API route per upload/OCR creata
- [ ] UI pagina spese singole con pulsante upload
- [ ] Pagina dettaglio spesa con visualizzazione OCR
- [ ] Test flusso completo

**File chiave:**
- `src/app/api/groups/[id]/receipts/route.ts` - API upload/OCR
- `src/app/groups/[id]/expenses/one-time/page.tsx` - Lista spese (da modificare)
- `src/app/groups/[id]/expenses/one-time/[expenseId]/page.tsx` - Dettaglio spesa (nuovo)

---

## Comandi Utili

```bash
# Sviluppo
npm run dev

# Database
npm run db:generate   # Genera migrazioni
npm run db:push       # Push migrazioni a DB
npm run db:studio     # Apri Drizzle Studio

# Build
npm run build
npm run start
```

---

## Note per Continuare

### Prossimi Passi (da IMPLEMENTATION_PLAN.md)

1. **Modificare pagina spese singole** (`src/app/groups/[id]/expenses/one-time/page.tsx`)
   - Aggiungere pulsante upload foto su ogni card spesa
   - Implementare state `uploadingReceipt`
   - Creare funzione `handleReceiptUpload(expenseId, file)`

2. **Creare pagina dettaglio** (`src/app/groups/[id]/expenses/one-time/[expenseId]/page.tsx`)
   - Visualizzazione dati spesa
   - Immagine scontrino se presente
   - Testo OCR in area leggibile
   - Possibilità modifica manuale
   - Download/eliminazione scontrino

3. **Testare flusso completo**
   - Upload foto → OCR → Salvataggio → Visualizzazione

---

## Problemi Noti

- Nessun problema critico aperto
- Implementazione OCR in fase di sviluppo

---

## Riferimenti

- `SPEC.md` - Specifica completa del progetto
- `IMPLEMENTATION_PLAN.md` - Piano implementazione OCR
- `src/db/schema.ts` - Schema database aggiornato

---

## Dipendenze Chiave

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| next | ^14.2.35 | Framework |
| drizzle-orm | ^0.45.1 | ORM Database |
| next-auth | ^4.24.13 | Autenticazione |
| @tanstack/react-query | ^5.90.21 | Server State |
| zustand | ^5.0.11 | Client State |
| recharts | ^3.7.0 | Grafici |
| tesseract.js | ^7.0.0 | OCR |
| @libsql/client | ^0.17.0 | Client Turso |

