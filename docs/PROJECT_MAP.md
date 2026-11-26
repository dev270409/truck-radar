# Mappa del progetto

Ultimo aggiornamento: 26 novembre 2026.

## Identità e directory

| Cosa | Valore |
|---|---|
| Repository Git | `https://github.com/dev270409/truck-radar.git` |
| Branch produzione | `master` |
| Workspace locale attivo | `C:\Users\Asus\.gemini\antigravity\scratch\transport-saas` |
| Nome pacchetto npm | `truck-radar` |
| Progetto Vercel | `truck-radar` |
| Dominio pubblico | `https://www.truck-radar.it` |
| Link Vercel locale | `.vercel/project.json` (gitignored; collega al progetto `truck-radar`) |

`transport-saas` è solo il nome legacy della directory Antigravity. Non rinominare il workspace attivo: la root Git è già collegata al progetto Vercel giusto, e un worktree laterale esiste sotto `.kilo/worktrees/`.

## Percorsi principali

| Area | Percorso |
|---|---|
| Regole agenti/stack | `AGENTS.md` |
| Punto di ripresa | `START_HERE.md`, `docs/SESSION_HANDOFF.md` |
| Checklist paper | `.opencode_tasks.md` |
| Auth | `auth.ts`, `app/api/auth/` |
| Shell dashboard | `app/dashboard/layout.tsx`, `components/DashboardShell.tsx`, `components/SidebarNav.tsx` |
| Viaggi | `app/dashboard/trips/page.tsx`, `app/api/trips/` |
| Rendiconti | `app/dashboard/trips/importa/page.tsx`, `app/api/trips/import/` |
| Parser testo PDF | `lib/trip-statement.ts` (`unpdf`) |
| Fallback PDF scansioni | `lib/trip-statement-ai.ts` (Gemini) |
| Match Geotab | `lib/trip-auto-match.ts`, `lib/geotab-classify.ts` |
| Consigli mezzo/autista | `app/api/trips/[id]/recommendations/route.ts` |
| Conferma conducenti Geotab | `app/dashboard/users/geotab/page.tsx`, `app/api/drivers/geotab/`, `lib/geotab-drivers.ts` |
| Analisi rendiconto/forecast | `lib/trip-analytics.ts`, `lib/trip-forecast.ts` |
| Benchmark | `app/dashboard/benchmark/page.tsx`, `app/api/benchmark/`, `lib/benchmark.ts` |
| Carburante | `app/dashboard/carburante/page.tsx`, `app/api/fuel/`, `lib/fuel.ts` |
| Modelli standard | `prisma/schema.prisma` |
| Tabelle raw | `scripts/ensure-raw-tables.ts` |
| UploadThing | `app/api/uploadthing/core.ts`, `lib/uploadthing.ts` |
| E2E | `scripts/e2e-*.ts` |
| Documentazione | `docs/INDEX.md` |

## Flusso rendiconto → viaggio → benchmark

```text
PDF
 ├─ testo selezionabile → unpdf (gratis) → parser deterministico
 └─ scansione/layout incompleto → Gemini → JSON validato + warning AI
        ↓
TripStatement + TripStatementLine (raw SQL, tenant scoped)
        ↓ conferma
Trip + deduplica per codice provider
        ↓
match automatico → TripGeotabMatch → autista Geotab confermato
        ↓
ricavi, km non abbinati, forecast adattivo, benchmark
```

## Comandi

```bash
npx tsc --noEmit
npm run build
npm run db:raw                 # prima di usare nuove tabelle/colonne raw
npx tsx scripts/e2e-trip-statement.ts
npx tsx scripts/e2e-trip-statement-ai.ts
npx tsx scripts/e2e-fuel-estimate.ts
vercel whoami
vercel ls --environment production
```

Non lanciare e2e o script `import-*` contro un database live senza leggere prima lo script: alcuni creano account o record. Credenziali e `.env.local` non vanno copiati nei Markdown.
