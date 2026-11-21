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

### Scansioni: fallback AI

Se il PDF non ha testo (scansione) o il parser deterministico non chiude i conti, il server prova **Gemini** con il PDF nativo (`lib/trip-statement-ai.ts`). Il risultato passa sempre dall'anteprima e viene marcato `parserMode: "AI"`. Sul PDF TAROS convertito in immagini: **24/24 viaggi, 7.790 €**. Costi e alternative in `docs/OCR_COSTS.md`.

Se l'AI non è configurata o fallisce, il parser deterministico resta la prima scelta e l'import si blocca con un errore esplicito, senza creare viaggi errati.

## 4. Assegnazione rapida

Nella lista viaggi ogni riga ha il pulsante **Assegna** (o **Riassegna**):

- selezione autista e, facoltativamente, mezzo;
- se il viaggio è nel passato viene segnato `COMPLETATO`, altrimenti `ASSEGNATO`;
- l'autista lo vede subito in `/dashboard/autista` (API `/api/autista/trips` filtra per `driverId`);
- l'operazione è registrata in `AuditLog` e `TripEvent`.

## 5. Analisi Geotab

Endpoint: `GET /api/trips/import/:id/analytics`.

- **Micro-spostamenti**: tracciati Geotab sotto 3 km o sotto 8 minuti. Non sono contati come viaggi veri.
- **Match automatico**: al termine dell'import il server collega i viaggi ai tracciati Geotab quando il match è certo:
  1. ora di partenza esplicita nel rendiconto entro 90 minuti;
  2. un solo mezzo con tracciati quel giorno;
  3. un solo viaggio pagato e un tracciato nettamente più lungo degli altri.
  I casi ambigui restano all'admin.
- **Km a vuoto (stima)**: tracciati Geotab oltre 3 km o 8 minuti **non collegati** a un viaggio pagato. Più rendiconti e viaggi colleghi, più il numero scende e diventa preciso. Non è una verità contabile finché non sono importati tutti i provider.
- **Copertura match**: percentuale di viaggi collegati a Geotab.
- **Ricavi**: totale rendiconto, media per viaggio, media per giorno attivo.
- **Top/bottom 5** per importo e **resa €/km** per i viaggi collegati.

### Stima 12 mesi adattiva

`lib/trip-forecast.ts` calcola la media mensile sui **viaggi realmente importati**, mese per mese:

- 1 mese → affidabilità `BASSA`;
- 3–5 mesi → `MEDIA`;
- 6+ mesi → `ALTA`.

La stima si aggiorna automaticamente a ogni nuovo rendiconto. Sul solo ottobre TAROS: 7.790 €/mese → **93.480 €/anno**, affidabilità bassa.

Tabelle: `TripStatement`, `TripStatementLine`, `TripGeotabMatch` (i match automatici vengono salvati con tipo e confidenza).

## 6. Consigli mezzo e autista

Nel modale **Assegna** (`GET /api/trips/:id/recommendations`) Truck Radar propone:

- mezzi compatibili per portata e volume, disponibili e liberi nella finestra del viaggio, con categoria adatta alla merce (FRIGO/ADR/CISTERNA);
- autisti attivi e liberi, con priorità a chi è già associato al mezzo consigliato.

L'admin vede le motivazioni e sceglie: il sistema non assegna mai un autista al posto suo.

## 7. Stima carburante su dati reali

`lib/fuel.ts` non usa più un consumo unico per tutta l'azienda:

- **consumo pieno-pieno** per mezzo: km tra due pieni / litri tra i due pieni (`FuelLog`);
- **prezzo medio reale** = costo totale / litri dei rifornimenti;
- km per mezzo da **Geotab** (ultimi 30 giorni), con ripiego su `TripKm`;
- se un mezzo non ha abbastanza pieni, usa il consumo di categoria e lo dichiara `STIMA`;
- il risultato espone `metodo` (`REALE`/`MISTO`/`STIMA`), `kmConConsumoReale`, `kmConStima`, `prezzoSource` e il dettaglio per targa.

## 8. API e tabelle

| Metodo | Endpoint | Funzione |
|---|---|---|
| POST | `/api/trips/import/parse` | carica, estrae e interpreta il PDF; crea il rendiconto in bozza |
| POST | `/api/trips/import/confirm` | crea i viaggi selezionati, deduplica e lancia il match Geotab |
| GET | `/api/trips/import` | ultimi rendiconti |
| POST | `/api/trips/import/:id/auto-match` | ricalcola il match automatico Geotab |
| GET | `/api/trips/import/:id/analytics` | ricavi, top/bottom, Geotab, km a vuoto, previsione |
| PATCH | `/api/trips/:id` | assegnazione rapida (driver/mezzo/stato) |
| GET | `/api/trips/:id/recommendations` | consigli mezzo/autista con motivazioni |

Tabelle raw in `scripts/ensure-raw-tables.ts`; eseguire `npm run db:raw` prima del deploy.

## 9. Verifiche

- `npx tsc --noEmit` → pulito.
- `npm run build` → pulito.
- `npx tsx scripts/e2e-trip-statement.ts` → **51/51 PASS**:
  - upload reale, parse 24 righe / 7.790 €, zero warning;
  - 24 viaggi creati, deduplica, note con codice;
  - match automatico Geotab: 5 mezzi collegati, 2 viaggi a vuoto, km a vuoto;
  - analisi: 5 match, 3 micro-spostamenti, top/bottom, resa €/km;
  - forecast: 1 mese, affidabilità bassa, 93.480 €/anno;
  - consigli mezzo/autista con motivazioni;
  - assegnazione autista e visibilità nell'account autista.
- `npx tsx scripts/e2e-trip-statement-ai.ts` → **5/5 PASS** su PDF scansionato: parserMode AI, 24/24 righe, 7.790 €.
- `npx tsx scripts/e2e-fuel-estimate.ts` → **14/14 PASS**: consumo pieno-pieno 3,33 km/l, prezzo 1,50 €/l, metodo `REALE`.
- `npx tsx scripts/test-trip-statement.ts` → parser sul PDF reale (24/24).

### Import nell'account TAROS

Eseguito `scripts/import-taros-rendiconto.ts` sull'account `tapesolegto@gmail.com`:

- 24 viaggi importati, totale 7.790 €;
- **23/24 collegati automaticamente ai tracciati Geotab** (copertura 96%);
- 143 tracciati Geotab non giustificati dal solo rendiconto Energy Trucks: 6.842,6 km a vuoto stimati (scendono importando anche gli altri provider);
- previsione 12 mesi: 93.480 €, affidabilità bassa (1 mese);
- 0 autisti assegnati: in Geotab ci sono ALEXANDRU BOLOZAN, OLEG TAPES e IOAN SILVIU NEGOITA, ma nell'app non esistevano utenti AUTISTA. L'admin deve crearli per completare l'assegnazione.

## 10. Prossimi passi

1. Creare gli utenti AUTISTA e mapparli ai nomi Geotab per l'assegnazione automatica anche dell'autista.
2. Migliorare il match ambiguo con geocoding delle tratte (quando il rendiconto non indica l'ora).
3. Import via email in `viaggi@in.truck-radar.it` e OCR per altri provider.
4. Costo carburante per singolo viaggio importato.
5. Pagina storica dei rendiconti con confronto mese su mese.
