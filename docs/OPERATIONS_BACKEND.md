# Backend operativo: permessi, scadenze, manutenzione, costi

Implementazione del 20/11/2026. Le modifiche sono additive: nessun dato esistente viene cancellato.

## 1. Permessi granulari

- `User.permissions` è un JSON opzionale; se assente valgono i default del ruolo.
- Ruoli attivi: ADMIN, UFFICIO, AUTISTA. COMMITTENTE resta escluso.
- ADMIN ha sempre tutti i permessi.
- UFFICIO parte con le aree operative (mezzi, viaggi, documenti, scadenze, carburante, manutenzione, costi, preventivi, ordini, giri, analytics) e senza amministrazione (utenti, integrazioni, impostazioni, abbonamento, licenza).
- AUTISTA parte senza permessi gestionale: continua a usare la PWA e i propri viaggi.
- `PATCH /api/users/:id/permissions` aggiorna la matrice; l'operazione è registrata in `AuditLog`.
- `requireFeature()` in `lib/api-guard.ts` verifica il permesso lato server. Le pagine mostrano un blocco "Permesso non attivo" e la sidebar nasconde le voci non consentite.
- Aggiungere un permesso non richiede un nuovo ruolo: si aggiorna la matrice dell'utente.

File principali:
- `lib/permissions-catalog.ts`
- `lib/permissions.ts`
- `lib/api-guard.ts`
- `app/dashboard/users/page.tsx`
- `components/SidebarNav.tsx`

## 2. Catalogo scadenze

Catalogo unico in `lib/deadline-catalog.ts`:
- 20 voci: 9 mezzi, 8 autisti, 3 azienda.
- ogni voce ha soggetto, durata (mesi o giorni), base del rinnovo, giorni di preavviso e categorie veicolo applicabili;
- `nextDeadlineDate()` calcola il rinnovo;
- `deadlineStatus()` calcola scaduta / in scadenza / ok.

Tabelle:
- `DriverDocument` e `CompanyDeadline`: già esistenti;
- `VehicleDeadline`: nuova tabella per le scadenze dei mezzi non coperte da `VehicleDocument`;
- `DeadlineAlert`: outbox per gli avvisi email;
- `Company.deadlineSettings`: JSON con email, giorni di preavviso, avvisi attivi e catalogo attivo.

API:
- `GET /api/deadlines?scope=driver|vehicle|company|all`
- `POST /api/deadlines` (`scope` + `tipo` dal catalogo)
- `DELETE /api/deadlines?id=...&scope=...`
- `POST /api/deadlines/renew` (calcola la prossima data)
- `GET /api/deadlines/config`
- `PUT /api/deadlines/config` (solo ADMIN)
- `GET /api/deadlines/status`
- `POST /api/deadlines/check` (solo ADMIN)
- `GET /api/cron/deadlines` (protetto da `CRON_SECRET`)

Avvisi:
- `lib/deadline-alerts.ts` crea una riga per ogni soglia (es. 30/7/1 giorni) con chiave idempotente.
- Lo stato è `PENDING`, `SENDING`, `SENT`, `FAILED`, `NOT_CONFIGURED`.
- `lib/email.ts` usa Resend via HTTP; senza `RESEND_API_KEY` gli avvisi restano `NOT_CONFIGURED` e sono visibili in pagina.
- `vercel.json` pianifica il controllo ogni giorno alle 06:00. Vercel invia automaticamente `Authorization: Bearer ${CRON_SECRET}` se la variabile è configurata.
- Con `CRON_SECRET` assente il cron risponde 401: è voluto, per non esporre un endpoint di invio.

Variabili:
- `RESEND_API_KEY`
- `EMAIL_FROM` (default `Truck Radar <noreply@truck-radar.it>`)
- `CRON_SECRET`

## 3. Manutenzione programmata

Catalogo in `lib/maintenance-catalog.ts`:
- 18 voci con intervalli in km e/o mesi per gruppo leggero, pesante e rimorchio.
- `Vehicle.maintenanceConfig` può contenere override per singolo mezzo (`voci`, `gruppo`).
- `lib/maintenance-schedule.ts` calcola lo stato di ogni voce:
  - `SCADUTA` se data o km superati;
  - `VICINA` entro 30 giorni oppure entro `max(2.000 km, 10% dell'intervallo)`;
  - `OK`, `MAI` (nessun intervento registrato), `NESSUNA`.
- `VehicleMaintenance.voce` collega un intervento alla voce del catalogo.
- `GET /api/maintenance?vehicleId=` restituisce sia gli interventi sia lo scadenzario calcolato.
- La pagina Manutenzione mostra le voci da controllare e il form permette di scegliere la voce del catalogo.

## 4. Tassonomia costi

Catalogo in `lib/cost-catalog.ts`:
- 5 ambiti (mezzo, personale viaggiante, personale non viaggiante, servizi logistici, azienda);
- 6 tipi (ordinaria, straordinaria, fisso, personale, struttura, servizi);
- 48 categorie con codice, etichetta, ambito, tipo e unità.
- `TripCostItem.tipo` usa i codici del catalogo; `lib/trip-costs.ts` arricchisce le risposte con `ambito`, `tipoCosto` e `categoryLabel`.
- `GET /api/costs/catalog` espone il catalogo.
- I costi mezzi usano le categorie dell'ambito mezzo; il costo del viaggio mantiene le categorie esistenti e accetta quelle nuove.

## 5. Verifiche eseguite

- `prisma generate` + `npm run db:raw` (129 statement idempotenti).
- `npx tsc --noEmit` pulito.
- API testate su sessione admin:
  - creazione/eliminazione scadenza mezzo;
  - creazione/eliminazione intervento con `voce`;
  - creazione/eliminazione costo mezzo;
  - configurazione avvisi e `check` con stato `NOT_CONFIGURED`;
  - patch permessi con audit.
- Login UFFICIO verificato: sidebar filtrata, `/api/users` POST 403, `/api/integrazioni` 403, `/api/deadlines/status` 200.
- Nessun overflow da 360 a 1440 px sulle pagine modificate.
