# Task di Fix per Webapp Famiglia

## Problemi da Risolvere (in ordine di priorità)

### 🔴 CRITICO 1: NEXTAUTH_SECRET fallback (src/lib/auth.ts:96)
**Problema:**
```typescript
secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-build-only"
```
**Fix:** Rimuovere il fallback:
```typescript
secret: process.env.NEXTAUTH_SECRET!
```

### 🔴 CRITICO 2: Validazione groupId mancante (src/app/groups/[id]/page.tsx)
**Problema:** `groupId` non viene validato prima di usarlo nelle fetch.
**Fix:** Aggiungere check dopo linea 46:
```typescript
const groupId = params.id as string;
if (!groupId) {
  router.push("/dashboard");
  return;
}
```

### 🔴 CRITICO 3: Quota default 100% (src/app/api/groups/route.ts:67)
**Problema:** Quando crei gruppo, ti aggiunge con quota 100%. Se aggiungi altri membri, superi 100%.
**Fix:** Cambiare a 0 o richiedere configurazione:
```typescript
quotaPercent: 0, // invece di 100
```

### 🟡 MEDIO 4: Race condition month/year (src/app/groups/[id]/page.tsx:144-162)
**Problema:** `handleMonthChange` e `handleYearChange` usano state che potrebbe essere stale.
**Fix:** Usare callback o refs consistenti.

### 🟡 MEDIO 5: LocalStorage non sincronizzato (src/app/page.tsx:51)
**Problema:** Se `lastGroupId` punta a gruppo eliminato, reindirizza a 404.
**Fix:** Verificare esistenza gruppo prima di navigare.

### 🟢 BASSO 6: Doppio riferimento state (src/app/groups/[id]/page.tsx:75-76)
**Problema:** Alias inutili:
```typescript
const currentMonth = currentMonthState;
const currentYear = currentYearState;
```
**Fix:** Rimuovere e usare direttamente `currentMonthState`/`currentYearState`.

## Istruzioni
1. Leggi attentamente ogni file
2. Applica i fix uno per uno
3. Verifica che TypeScript non dia errori (`npm run build` o `npx tsc --noEmit`)
4. Non modificare altre parti del codice
5. Mantieni lo stile di codice esistente

## File da modificare
1. src/lib/auth.ts
2. src/app/groups/[id]/page.tsx  
3. src/app/api/groups/route.ts
4. src/app/page.tsx

## Output richiesto
Per ogni file modificato, mostra:
- File modificato
- Problema risolto
- Diff delle modifiche