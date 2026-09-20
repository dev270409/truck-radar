<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OpenCode Autonomous Execution Instructions

## Scopo
Completare integralmente il "MEGA PAPER MASTER" (Transport Operating System) at
`C:\Users\Asus\Downloads\TRANSPORT SaaS paper.md`, in **loop autonomo senza interruzioni**.

## Fase 1 — Analisi & Planning
1. Leggere il paper (in Downloads).
2. Estrarre tutti i task in `.opencode_tasks.md` (radice repo) come checklist:
   - `[x]` task completati, `[ ]` task da fare.
3. Non chiedere conferme all'utente; procedere da soli.

## Fase 2 — Loop di esecuzione (per ogni task `[ ]`)
1. Scegliere il primo task non completato.
2. Implementarlo (API + UI + DB se serve).
3. Verificarlo (dev e2e + `npx tsc --noEmit` + `npm run build`).
4. Aggiornare `.opencode_tasks.md`: `[x]` se verificato; `[FAILED]` dopo 3 tentativi falliti, annotando il motivo, e proseguire col task successivo.
5. Ripetere fino a esaurimento task `[ ]`.

## Fase 3 — Chiusura
Quando tutti i task sono `[x]` o `[FAILED]`, scrivere il sommario finale e terminare con la frase esatta:
`IMPLEMENTAZIONE PAPER COMPLETATA`

## Convenzioni operative (stack corrente)
- Next.js 16 + React 19 + Prisma 5 (Supabase pooler) + NextAuth v5 + Stripe + UploadThing.
- **Prisma CLI `migrate`/`db push` NON funziona** (manca DIRECT_URL locale). Per nuovi modelli/tabelle usare SQL raw idempotente in `scripts/ensure-raw-tables.ts` (CREATE TABLE IF NOT EXISTS) e accesso via `prisma.$queryRawUnsafe/$executeRawUnsafe`. NON modificare lo schema.prisma senza essere sicuri che un `db push` futuro lo replichi.
- Transazioni Prisma interactive su pooler: sempre `{ timeout: 30000 }`.
- `getTenantDb()` perde i typings degli `include`: usare cast `as unknown as Prisma.XxxGetPayload<...>`, `Prisma.validator` e cast per `where.status`.
- Enums attuali: UserRole, TripStatus, VehicleDocType, VehicleStatus, KycStatus, KycDocType, SubscriptionStatus, SubscriptionPlan, VehicleCategory, TransactionType, EscrowStatus, PayoutStatus (vedi `prisma/schema.prisma`).
- Credenziali demo: `admin@demo.com`/`Demo123!` (ADMIN), `autista@demo.com`/`Demo123!` (AUTISTA).
- E2E dev sandbox: retry dello spawn, verifiche HTTP separate dallo spawn, `taskkill /F /T /PID`.
- Verifica finale per ogni task: `npx tsc --noEmit` e `npm run build` puliti.
- Non commettere MAI segreti (no password DB/file `.env`).

## Nota rotazione password DB
La rotazione password `postgres` Supabase richiede l'azione dell'utente (dashboard Supabase). NON bloccare il loop: se le vecchie credenziali smettono di funzionare, marcare il task come `[FAILED-PASSWORD-DB]` e proseguire. Ad avvenuta rotazione, aggiornare i `.env` e riverificare.
