# Handoff sessione — Truck Radar

**Aggiornato:** 26 novembre 2026
**Obiettivo:** riprendere il lavoro senza dipendere dalla cronologia della chat.

## Stato in una frase

Produzione `www.truck-radar.it` è collegata correttamente al branch Git `master`; l'import rendiconti, il match Geotab, gli account conducenti TAROS e il benchmark sono già attivi. La landing pubblica è stata ridisegnata senza claim non verificati e con il funnel BASE/PRO funzionante. Il prossimo lavoro è importare gli altri rendiconti e migliorare copertura/dati reali, soprattutto carburante.

## 1. Root, Git e deploy

| Cosa | Valore |
|---|---|
| Root attiva | `C:\Users\Asus\.gemini\antigravity\scratch\transport-saas` |
| Remote | `https://github.com/dev270409/truck-radar.git` |
| Branch | `master` |
| Package npm | `truck-radar` |
| Progetto Vercel | `truck-radar` |
| Dominio Production | `https://www.truck-radar.it` |
| Vercel project ID | `prj_rJwSHuy5I5c5L3WQbo8BFT8cXAI9` |
| Codice applicativo verificato | typecheck/build/ESLint verdi al 26 novembre 2026; app su `master` |
| Deploy app verificato | `truck-radar-8koty6vhg`, Ready, Production, 26 novembre 2026 |
| Commit deploy app | `a07696b feat: aggiorna landing e flussi operativi` |

La root locale si chiama ancora `transport-saas` per compatibilità con Antigravity; **non rinominarla**. `package.json` e il progetto Vercel si chiamano `truck-radar`. `.vercel/project.json` è locale/gitignored e punta al progetto corretto.

Il tree tracciato è pulito. Sono rimasti non tracciati `.agents/` e `skills-lock.json`: sono tooling locale, non rimuoverli e non committarli automaticamente. Esiste anche il worktree `giant-radiator` sotto `.kilo/worktrees/` con file `.env`: non toccare né rimuovere.

I commit che aggiornano solo i documenti possono generare deploy Vercel nuovi pur senza modificare il runtime. Per conoscere sempre il deploy più recente usa `vercel ls --environment production`; per il commit corrente `git log -1 --oneline`.

Per deploy normale:

```powershell
git status --short
git add <percorsi specifici>
git diff --cached
git commit -m "..."
git push origin master
vercel ls --environment production
```

Non usare `git add -A` alla cieca. Guida completa: [`DEPLOY.md`](DEPLOY.md).

## 2. Account TAROS (utente 0)

- Azienda: **AUTOTRASPORTI TAROS GROUP SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA**
- Admin: `tapesolegto@gmail.com`, ruolo ADMIN, piano PRO, subscription ACTIVE.
- 2 mezzi Geotab/anagrafica: `FL010MC`, `FV740AR`.
- 1.664 snapshot Geotab presenti al controllo.

Conducenti confermati e account già creati:

| Geotab | Truck Radar | Stato |
|---|---|---|
| ALEXANDRU BOLOZAN | `alexandru.bolozan@autisti.truck-radar.it` | AUTISTA attivo, 22 viaggi assegnati |
| IOAN SILVIU NEGOITA | `ioan.silviu.negoita@autisti.truck-radar.it` | AUTISTA attivo, 0 viaggi del rendiconto ottobre |
| OLEG TAPES | `tapesolegto@gmail.com` | collegato all'ADMIN esistente, nessun account duplicato |

I due login autista sono stati verificati in produzione il 26 novembre: Auth.js 302 verso la dashboard e `/api/autista/trips` 200; Alexandru vede 22 viaggi, Ioan 0.

**Non conservare le password temporanee nei file.** Sono state mostrate in chat quando gli account sono stati creati; nel database c'è solo l'hash. Se non sono state copiate o vanno ruotate, usa Autisti e team → Reset. L'email `@autisti.truck-radar.it` è uno username di login, non una casella di posta.

Workflow/documentazione: [`GEOTAB_DRIVERS.md`](GEOTAB_DRIVERS.md).

## 3. Rendiconto già caricato

File originale fuori repo: `C:\Users\Asus\Downloads\TAROS.pdf` (Energy Trucks, 1–31 ottobre 2026).

Inventario PDF in Downloads verificato il 26 novembre: `TAROS.pdf`, due polizze `vs_sped_polizza_*.pdf` e tre PDF di ricerca NotebookLM. **Non risultano altri rendiconti mensili/provider** nella cartella Downloads; gli altri mesi andranno recuperati/caricati quando saranno disponibili. Le polizze e i PDF NotebookLM non vanno caricati come rendiconti.

- 24 viaggi; 17 giornate; totale dichiarato e letto **7.790 €**.
- Statement ID `40cd5830-d59b-441c-8ee6-80933691bf5f`.
- 24 righe importate con deduplica per codice.
- 23/24 match automatici Geotab (96%); resta ambiguo `T269216`, non forzare.
- 22 viaggi completati e assegnati ad Alexandru; 2 `DA_ASSEGNARE`; un altro viaggio aziendale è `SUBAPPALTATO`.
- Il forecast corrente è **93.480 €/anno**, affidabilità BASSA perché esiste un solo mese di rendiconto.

Benchmark osservato: ultimi 12 mesi, 34.109 km Geotab, 551 viaggi Geotab reali, 23 viaggi pagati collegati (copertura 4%), carburante stimato 17.054,56 €, nessun `FuelLog` o `VehicleCost`. I 143 tracciati non collegati al solo PDF Energy Trucks **non sono certamente vuoti**: potrebbero appartenere ad altri committenti/provider. Il benchmark avvisa della copertura bassa; non usare il margine attuale come dato finanziario.

## 4. Funzioni e percorsi da conoscere

| Funzione | File principali |
|---|---|
| Import rendiconto UI | `app/dashboard/trips/importa/page.tsx` |
| API import/confirm/history | `app/api/trips/import/` |
| Parser PDF testuale | `lib/trip-statement.ts` |
| Fallback Gemini per scansioni | `lib/trip-statement-ai.ts` |
| Match Geotab e classificazione spostamenti | `lib/trip-auto-match.ts`, `lib/geotab-classify.ts` |
| Analisi e forecast | `lib/trip-analytics.ts`, `lib/trip-forecast.ts` |
| Autisti Geotab | `app/dashboard/users/geotab/page.tsx`, `app/api/drivers/geotab/`, `lib/geotab-drivers.ts` |
| Benchmark | `app/dashboard/benchmark/page.tsx`, `app/api/benchmark/`, `lib/benchmark.ts` |
| Carburante | `app/dashboard/carburante/page.tsx`, `lib/fuel.ts` |
| Tabelle raw | `scripts/ensure-raw-tables.ts` |
| Upload PDF | `app/api/uploadthing/core.ts` (`tripStatement`) |
| Registrazione con piano scelto | `app/(auth)/register/`, `app/api/register/route.ts` |
| Audit UI OSS | `docs/UI_REDESIGN_PLAN.md` |

Documentazione: [`TRIP_STATEMENT_IMPORT.md`](TRIP_STATEMENT_IMPORT.md), [`BENCHMARK.md`](BENCHMARK.md), [`OCR_COSTS.md`](OCR_COSTS.md), [`UI_REDESIGN_PLAN.md`](UI_REDESIGN_PLAN.md), [`INDEX.md`](INDEX.md).

## 5. Checklist per la prossima sessione

1. **Inventariare i PDF già disponibili** (es. Downloads), leggere i nomi senza caricarli tutti alla cieca.
2. Importare i rendiconti degli altri mesi e provider da `/dashboard/trips/importa`, controllando periodi e codici duplicati.
3. Dopo ogni import verificare quanti match sono ambigui e quanti viaggi non hanno il mezzo; non autoassegnare i casi incerti.
4. Ricontrollare il forecast e il benchmark dopo più mesi: la copertura attuale è 4%.
5. Aggiungere FuelLog reali e costi mezzi per eliminare la stima carburante/costo.
6. Valutare il provider email/consenso privacy prima dell'intake email o dell'invio automatico di credenziali.
7. Chiudere i rilievi Taste gate residui: lo stato è `GATE: DONE` per richiesta utente, con 59 FAIL strutturali aperti (vedi `docs/UI_REDESIGN_PLAN.md`, sezione "Gate Taste — stato").
8. Smoke visivo autenticato delle pagine dashboard protette (richiede sessione).

## 6. Comandi di verifica

```powershell
npx tsc --noEmit
npm run build
npm run db:raw
npx tsx scripts/e2e-trip-statement.ts
npx tsx scripts/e2e-trip-statement-ai.ts
npx tsx scripts/e2e-fuel-estimate.ts
vercel whoami
vercel ls --environment production
```

`npm run db:raw` solo se ci sono nuove tabelle/colonne: lo script è idempotente. Prisma `migrate`/`db push` non è supportato sul pooler Supabase locale. Leggere `AGENTS.md` prima di cambiare codice Next.js 16.

## 7. Sicurezza/igiene

- Non scrivere mai password, token, API key, contenuto di `.env.local` o credenziali autisti in file Markdown/Git.
- Non stampare i valori di `.env*` nei log.
- La rotazione password DB Supabase è ancora un'azione dell'utente, non blocca il lavoro.
- Secondo il deploy doc, `RESEND_API_KEY` e `CRON_SECRET` non sono ancora configurati: email scadenze non attive/cron protetto.
