# Piano Implementazione: Foto Scontrini con OCR

## Obiettivo
Permettere agli utenti di caricare foto degli scontrini per le spese singole, con estrazione automatica del testo tramite OCR e visualizzazione in una pagina di dettaglio.

## Requisiti
- Soluzione OCR gratuita e accurata → **Tesseract.js** (client-side)
- Storage immagini → **Next.js public folder** (`public/receipts/`)
- Target spese → **Solo Spese Singole**
- Testo OCR salvato nel campo della spesa + pagina dettaglio

---

## 1. Modifiche al Database

### File: `src/db/schema.ts`
- Aggiungere campo `receiptText` alla tabella `oneTimeExpenses`:
  ```typescript
  receiptText: text("receipt_text"),
  ```

---

## 2. Storage Immagini

### Struttura cartelle
```
public/
  receipts/
    {groupId}/
      {expenseId}_{timestamp}.jpg
```

### Naming convenzione
- Formato: `{expenseId}_{timestamp}.jpg`
- Esempio: `abc123_1705000000000.jpg`

---

## 3. API Routes

### Endpoint: `/api/groups/[id]/receipts`

#### POST - Upload ricevuta + OCR
- Input: FormData con immagine
- Output: `{ success: true, receiptText: string, imageUrl: string }`
- Workflow:
  1. Salva immagine in `public/receipts/{groupId}/`
  2. Esegui OCR con Tesseract.js
  3. Aggiorna record spesa con `receiptText`

#### GET - Recupera ricevuta
- Input: `expenseId` come query param
- Output: `{ imageUrl: string, receiptText: string }`

#### DELETE - Elimina ricevuta
- Input: `expenseId` come query param
- Workflow:
  1. Elimina immagine da filesystem
  2. Aggiorna record spesa (set `receiptText` = null)

---

## 4. Pagine UI

### 4.1 Modifica: `src/app/groups/[id]/expenses/one-time/page.tsx`

#### Aggiungere:
- Pulsante per upload foto scontrino su ogni card spesa
- Icona camera/attachment nel pulsante
- Dialog per conferma upload con anteprima

#### State necessario:
```typescript
const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
```

#### Funzioni:
- `handleReceiptUpload(expenseId: string, file: File)` - upload + OCR

### 4.2 Nuova pagina: `src/app/groups/[id]/expenses/one-time/[expenseId]/page.tsx`

#### Visualizzazione:
- Dettagli spesa (nome, importo, data, categoria)
- Immagine scontrino (se presente)
- Testo estratto da OCR in un'area leggibile
- Pulsante per ricaricare/aggiornare scontrino

#### Funzionalità:
- Possibilità di modificare manualmente il testo OCR
- Download immagine scontrino
- Eliminazione scontrino

---

## 5. Dipendenze

### Nuove dipendenze
```bash
npm install ollama tesseract.js
```

> **Nota**: L'implementazione attuale usa **Ollama con GLM-OCR** (consigliato) invece di Tesseract.js per maggiore accuratezza.

---

## 6. Flusso Utente

1. Utente va nella pagina "Spese Singole"
2. Clicca sull'icona fotocamera su una spesa
3. Carica foto scontrino (da camera o file)
4. Sistema esegue OCR e salva immagine + testo
5. Testo viene visualizzato nella pagina di dettaglio della spesa
6. Utente può accedere alla pagina dettaglio cliccando sulla spesa

---

## 7. Note Tecniche

### Tesseract.js
- Libreria OCR gratuita e open-source
- Supporto multilingua (italiano incluso)
- Elaborazione client-side (nessun server aggiuntivo)
- Tempo elaborazione: ~2-5 secondi per immagine

### Sicurezza
- Validare tipo file (solo immagini: jpg, png, webp)
- Limitare dimensione massima (es. 5MB)
- Sanitizzare nome file

---

## 8. Task Checklist

- [ ] Aggiornare schema database con campo `receiptText`
- [ ] Creare script migrazione database
- [ ] Creare API route per upload/OCR ricevute
- [ ] Modificare pagina spese singole con pulsante upload
- [ ] Creare pagina dettaglio spesa con visualizzazione OCR
- [ ] Installare Tesseract.js
- [ ] Testare flusso completo
