# Ops Suite — implementazione ispirata a Stiva

Implementazione del 12/11/2026. Copre le funzioni P0/P1/P2 dell'analisi `docs/COMPETITOR_STIVA.md`: piano di carico, preventivi/ordini, giri e costi, analisi clienti, OCR libretto, TCO, scadenze/divieti, cisterne/accise, POD autista, import/export, benchmark e portale cliente.

## 1. Tabelle raw aggiunte

In `scripts/ensure-raw-tables.ts`:

- `Customer`
- `LoadPlan`
- `Quote`
- `CustomerOrder`
- `CustomerPortal`
- `RoutePlan`
- `VehicleCost`
- `DriverDocument`
- `CompanyDeadline`
- `HeavyVehicleBan`
- `FuelTank`
- `FuelTankMovement`
- `TripPod`

Tutte con indice `companyId` e, dove serve, indici su `tripId`, `vehicleId`, `status`, `data`.

## 2. Librerie

- `lib/ops.ts` — CRUD raw scoped per `companyId`.
- `lib/csv.ts` — parser CSV robusto, conversione oggetti, export, download.
- `lib/routes.ts` — haversine, nearest-neighbor + 2-opt, calcolo costo viaggio.
- `lib/ocr.ts` — OCR Gemini/OpenAI per packing list e libretto, con sanitizzazione e limiti dimensione.
- `lib/api-guard.ts` — guard sessione/admin per le route.

## 3. API

- `/api/load-plans`, `/api/load-plans/[id]`
- `/api/quotes`, `/api/quotes/[id]`
- `/api/orders`, `/api/orders/[id]`
- `/api/portal`, `/api/public/portal/[token]`
- `/api/route-plans`, `/api/route-plans/optimize`, `/api/route-plans/[id]`
- `/api/vehicles/costs`, `/api/vehicles/costs/[id]`
- `/api/deadlines`, `/api/deadlines/bans`
- `/api/fuel/tanks`, `/api/fuel/tanks/movements`, `/api/fuel/tanks/[id]/movements`, `/api/fuel/accise`
- `/api/trips/[id]/pod`
- `/api/ocr`
- `/api/export`
- `/api/import`

## 4. Pagine

- `/dashboard/carico` — colli, calcolatore, vista 2D/3D, OCR packing list, salvataggio piani.
- `/dashboard/preventivi` — preventivi con margine, accettazione che crea l'ordine, export.
- `/dashboard/ordini` — ordini, stati, conversione in viaggio, portale cliente brandizzato.
- `/portale/[token]` — form pubblico ordini/preventivi.
- `/dashboard/giri` — geocoding, ottimizzazione tappe, costi e prezzo consigliato.
- `/dashboard/analisi-clienti` — churn/calo/crescita da CSV, elaborazione client-side.
- `/dashboard/costi-mezzi` — OCR libretto, costi mezzi, TCO e costo/km.
- `/dashboard/scadenze` — scadenze autisti/azienda, calendario divieti, condivisione WhatsApp.
- `/dashboard/cisterne` — cisterne, movimenti contalitri, prospetto accise.
- `/dashboard/benchmark` — costo/km e consumi per categoria.
- `/dashboard/import-export` — import CSV e modelli per mezzi/clienti/viaggi, export.
- `/dashboard/autista/[id]` — navigazione Google Maps/Waze, firma canvas e foto POD.
- `/tracking/[token]` — link mappa ultima posizione e condivisione WhatsApp.

## 5. Verifica

- `npx tsc --noEmit` → **EXIT 0**
- `npm run build` → **EXIT 0** (tutte le nuove route presenti nel build)
- `npx tsx scripts/ensure-raw-tables.ts` → **BLOCCATO**: il pooler Supabase `aws-1-eu-west-1.pooler.supabase.com:6543` non è raggiungibile (ENOTFOUND/timeout). Le tabelle non sono state create sul DB. Questo è un blocco infrastrutturale, non di codice.

## 6. Prossimi passi per attivare in produzione

1. Ripristinare la connettività DB/Supabase (o ruotare le credenziali come da nota in `.opencode_tasks.md`).
2. Eseguire `npx tsx scripts/ensure-raw-tables.ts` per creare le 13 tabelle.
3. Verificare in dev: login demo, creare un piano di carico, un preventivo, un ordine dal portale, un giro, un costo mezzo, una scadenza e un movimento cisterna.
4. Configurare `GOOGLE_GENERATIVE_AI_API_KEY` (già presente in produzione per KYB) per OCR packing list/libretto.
5. Valutare `three`/`@react-three/fiber` solo se il piano 2D/3D SVG attuale non basta; per l'import Excel valutare `xlsx` se serve il formato .xlsx nativo.
6. Aggiungere email reali per scadenze/alert quando il provider email sarà attivo; oggi le scadenze sono visibili in dashboard e condivisibili via WhatsApp.

## 7. Aggiornamento 18/11/2026 - Documenti in arrivo

- Nuova tabella raw `DocumentInbox` (coda manuale unica per DDT, fatture, ordini di ritiro, POD, scadenze).
- Nuova libreria `lib/doc-inbox.ts` + costanti condivise `lib/doc-inbox-shared.ts`.
- Nuove API: `/api/documents/inbox` (GET/POST) e `/api/documents/inbox/[id]` (PATCH/DELETE).
- Nuova pagina `/dashboard/documenti` con upload PDF/foto, filtri di stato, classificazione manuale e collegamento a viaggio/mezzo.
- Nuovo endpoint UploadThing `inboundDocument`.
- Gating piano in `lib/plans.ts` (`getPlanFeatures`): coda manuale disponibile anche in Base; classificazione AI, numero aziendale, email dedicata e WhatsApp restano feature Pro. Nessun cambio ai prezzi o ai limiti mezzi/autisti.
- Verifica: `npx tsc --noEmit` exit 0; `npm run build` exit 0 (111 pagine); `npx tsx scripts/ensure-raw-tables.ts` completato (111 statement); audit UI desktop/mobile su `/dashboard/documenti` con overflow 0 e 0 underscore; test API POST/GET/PATCH/DELETE completato e dati di test rimossi.
