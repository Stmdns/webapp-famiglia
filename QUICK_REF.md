# 🛠️ Quick Reference - Webapp Famiglia

## Comandi Utili

```bash
# Installazione dipendenze
npm install

# Development
npm run dev

# Build produzione
npm run build

# Database
npm run db:generate   # Genera migration
npm run db:push       # Push al DB
npm run db:studio     # Apri Drizzle Studio
```

## Configurazione Locale

### 1. .env
Creare `.env` con:
```env
TURSO_DATABASE_URL=libsql://tuodb.turso.io
TURSO_AUTH_TOKEN=tuotoken
NEXTAUTH_SECRET=generaunasecret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 2. Setup DB
```bash
npm run db:push
```

### 3. Run
```bash
npm run dev
```

---

## Aree Sensibili (NON MODIFICARE)

- `src/db/schema.ts` - Schema DB
- `src/app/api/auth/` - Auth NextAuth
- `src/lib/auth.ts` - Config auth

---

## Bug Note

*Nessun bug critico noto dalla documentazione.*

---

## Links

- Repo: https://github.com/Stmdns/webapp-famiglia
- Produzione: https://famiglia-budget.vercel.app

---

*Da usare quando lavori su questo progetto*
