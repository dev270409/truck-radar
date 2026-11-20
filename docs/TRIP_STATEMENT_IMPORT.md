# Import rendiconti viaggi, analisi Geotab e stima carburante

Implementazione del 20/11/2026, basata sul PDF reale `TAROS.pdf` (Energy Trucks, ottobre 2026).

## 1. Che documento è

Il PDF è un **rendiconto viaggi periodico**. Nel settore viene chiamato anche:

- **estratto conto vettore**;
- **prospetto di liquidazione viaggi**;
- **distinta viaggi** / **riepilogo prestazioni**;
- in italiano corrente: **rendiconto mensile dei viaggi**.

Contenuto tipico:

- periodo (es. 1–31 ottobre 2026);
- totali dichiarati: viaggi, giornate, importo;
- per ogni giorno: numero viaggi e totale giornaliero;
- per ogni viaggio: **codice** (`T268486`), **tratta/descrizione**, **committente finale** (CAFA, ARCESE, FERCAM…), **prezzo**;
- a volte l'ora di partenza.

Nel caso specifico il documento è emesso da **Energy Trucks** (provider/committente) verso **Autotrasporti Taros Group** (vettore). Il cliente finale indicato su ogni riga è quello servito.

## 2. Flusso di import

1. L'admin apre **Viaggi → Importa rendiconto** (`/dashboard/trips/importa`).
2. Carica il PDF (UploadThing, max 16 MB, solo PDF).
3. Il server estrae il testo con `unpdf` e lo interpreta con un parser deterministico (`lib/trip-statement.ts`).
4. Mostra un'anteprima con: provider, periodo, viaggi dichiarati/letti, totale, warning, duplicati.
5. L'admin deseleziona eventuali righe e conferma.
6. Il server crea i viaggi in una transazione, tutti in stato `DA_ASSEGNARE`, con:
   - `cliente` = committente finale;
   - `prezzo` = importo riga;
   - `note` = `Rendiconto … · codice · descrizione`;
   - `dataRitiro` = data + ora del rendiconto, convertita correttamente in UTC (Europe/Rome);
   - `dataConsegna` = ritiro + 8 ore (modificabile).
7. Ogni riga viene registrata in `TripStatementLine` con `UNIQUE (companyId, code)`: lo stesso viaggio non può essere importato due volte.
8. Dopo l'import la pagina mostra l'analisi e il link ai viaggi, dove si assegna l'autista.

## 3. Parser

Regole principali:

- normalizza le lettere spaziate (`V I A G G I` → `VIAGGI`);
- legge periodo, viaggi, giornate e totale dichiarati;
- riconosce i giorni (`GIOVEDÌ 1 OTTOBRE`, `· PARTENZA 10:54`);
- riconosce i codici `T…` e le righe di prezzo `170,00 €`, anche quando cliente e prezzo sono sulla stessa riga (`RHENUS 300,00 €`);
- divide la tratta su `x`, su `RITIRO … CONSEGNA …` o su `Consegna … presso …`;
- confronta righe lette e totale con i valori dichiarati e produce **warning** se non tornano.

Sul PDF di esempio: **24/24 viaggi, 7.790,00 €, zero warning**.

Limite attuale: servono PDF con testo selezionabile. Le scansioni senza testo restituiscono un errore esplicito; l'OCR/AI è il passo successivo.

## 4. Assegnazione rapida

Nella lista viaggi ogni riga ha il pulsante **Assegna** (o **Riassegna**):

- selezione autista e, facoltativamente, mezzo;
- se il viaggio è nel passato viene segnato `COMPLETATO`, altrimenti `ASSEGNATO`;
- l'autista lo vede subito in `/dashboard/autista` (API `/api/autista/trips` filtra per `driverId`);
- l'operazione è registrata in `AuditLog` e `TripEvent`.

## 5. Analisi Geotab

Endpoint: `GET /api/trips/import/:id/analytics`.

- **Micro-spostamenti**: tracciati Geotab sotto 3 km o sotto 8 minuti (e < 10 km). Non sono contati come viaggi veri.
- **Match**: per ogni viaggio importato con mezzo assegnato si cerca il tracciato Geotab dello stesso giorno e della stessa targa, scegliendo quello con ora di partenza più vicina.
- **Km non attribuiti** = km dei viaggi Geotab "veri" meno i km collegati a un viaggio pagato. È la prima stima dei **km a vuoto / altri movimenti**, dichiarata come tale.
- **Copertura match**: percentuale di viaggi con mezzo collegati a Geotab.
- **Ricavi**: totale rendiconto, media per viaggio, media per giorno attivo, stima 12 mesi al ritmo attuale.
- **Top/bottom 5** per importo e **resa €/km** per i viaggi collegati.

Limite: finché i viaggi non hanno un mezzo assegnato il match è parziale. L'analisi lo dichiara nei warning.

Tabelle: `TripStatement`, `TripStatementLine`, `TripGeotabMatch` (predisposta per salvare i match; l'analisi attuale li calcola al volo).

## 6. Stima carburante su dati reali

`lib/fuel.ts` non usa più un consumo unico per tutta l'azienda:

- **consumo pieno-pieno** per mezzo: km tra due pieni / litri tra i due pieni (`FuelLog`);
- **prezzo medio reale** = costo totale / litri dei rifornimenti;
- km per mezzo da **Geotab** (ultimi 30 giorni), con ripiego su `TripKm`;
- se un mezzo non ha abbastanza pieni, usa il consumo di categoria e lo dichiara `STIMA`;
- il risultato espone `metodo` (`REALE`/`MISTO`/`STIMA`), `kmConConsumoReale`, `kmConStima`, `prezzoSource` e il dettaglio per targa.

## 7. API e tabelle

| Metodo | Endpoint | Funzione |
|---|---|---|
| POST | `/api/trips/import/parse` | carica, estrae e interpreta il PDF; crea il rendiconto in bozza |
| POST | `/api/trips/import/confirm` | crea i viaggi selezionati, deduplica per codice |
| GET | `/api/trips/import` | ultimi rendiconti |
| GET | `/api/trips/import/:id/analytics` | ricavi, top/bottom, Geotab, km non attribuiti |
| PATCH | `/api/trips/:id` | assegnazione rapida (driver/mezzo/stato) |

Tabelle raw in `scripts/ensure-raw-tables.ts`; eseguire `npm run db:raw` prima del deploy.

## 8. Verifiche

- `npx tsc --noEmit` → pulito.
- `npm run build` → pulito (133 route).
- `npx tsx scripts/e2e-trip-statement.ts` → **33/33 PASS**:
  - upload reale su UploadThing, parse 24 righe / 7.790 €, zero warning;
  - 24 viaggi creati, note con codice, stato `DA_ASSEGNARE`;
  - secondo caricamento: 24 duplicati, 0 nuovi viaggi;
  - assegnazione di 5 viaggi, visibilità nell'account autista;
  - Geotab simulato: 3 micro-spostamenti, 5 match, km non attribuiti, stima 12 mesi 93.480 €, resa €/km.
- `npx tsx scripts/e2e-fuel-estimate.ts` → **15/15 PASS**: consumo pieno-pieno 3,33 km/l, prezzo 1,50 €/l, metodo `REALE`.
- `npx tsx scripts/test-trip-statement.ts` → parser sul PDF reale (24/24).

## 9. Prossimi passi

1. OCR/AI per PDF scansionati e layout di altri provider.
2. Salvataggio dei match Geotab in `TripGeotabMatch` e ricalcolo incrementale.
3. Migliore stima km a vuoto usando le tratte geocodificate, non solo i tracciati.
4. Costo carburante per singolo viaggio importato.
5. Import dello stesso formato via email in `viaggi@in.truck-radar.it`.
6. Storicizzazione dei rendiconti con pagina dedicata e confronto mese su mese.
