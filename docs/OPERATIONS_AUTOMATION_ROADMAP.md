# Automazione operativa, Geotab, PDF viaggi e agevolazioni

Ricerca e piano del 19/11/2026. Obiettivo: ridurre il lavoro manuale dell'admin, usare meglio Geotab, importare i viaggi Energy Trucks da PDF e predisporre la sezione agevolazioni.

## 1. Principio guida

L'admin non deve ricopiare dati che esistono già in un documento, in Geotab o in una mail. Il flusso deve essere:

1. **Acquisisci** il dato (upload, email, WhatsApp, Geotab).
2. **Estrai** i campi con AI/OCR o API.
3. **Verifica** solo le eccezioni (bassa confidenza, duplicati, importi anomali).
4. **Collega** il dato a viaggio, mezzo, autista, cliente o scadenza.
5. **Calcola** costo, margine e alert senza chiedere altri input.

Regola: automatizzare il 90% prevedibile, lasciare all'admin solo l'eccezione.

## 2. Mappa delle automazioni per sezione

| Sezione | Oggi | Automazione futura |
|---|---|---|
| Documenti | Upload manuale e coda | Email/WhatsApp intake → classificazione → estrazione → collegamento |
| Viaggi | Creazione manuale | Import PDF Energy Trucks, match Geotab, duplicati, stato automatico |
| Scadenze | Inserimento manuale | OCR libretto/patente/CQC/assicurazione → scadenza e alert |
| Carburante | Rifornimenti manuali | Import fuel card/Geotab, costo per viaggio, alert consumi |
| Costi mezzi/TCO | Inserimento manuale | OCR fatture officina/gomme, costo al km aggiornato |
| Preventivi | Form manuale | Prezzo suggerito da km/costi/storico cliente |
| Ordini | Form/portale | Import email ordine, match cliente, creazione viaggio |
| Scadenze/divieti | Manuale/parziale | Calendario automatico e digest email |
| Agevolazioni | Assente | Catalogo + mail Consorzio Italia → scadenze e checklist |
| KYC/KYB | Trial/verifica | Provider KYC + VIES/Openapi, nessuna auto-approvazione |

## 3. Import viaggi da PDF Energy Trucks

### Cosa serve prima
Serve un **PDF campione anonimizzato** (o 2-3 PDF di mesi diversi). Non ho trovato un formato pubblico Energy Trucks: senza un esempio non si può garantire la mappatura delle colonne. Il flusso può essere costruito in modo generico, ma va tarato sul PDF reale.

**Aggiornamento 20/11/2026:** PDF campione TAROS/Energy Trucks ricevuto e parser implementato. Flusso completo in `docs/TRIP_STATEMENT_IMPORT.md` (import, deduplica, assegnazione, analisi Geotab, stima carburante).

### Flusso proposto
1. L'admin carica il PDF da `/dashboard/trips` oppure lo inoltra a `viaggi@in.truck-radar.it` (fase successiva).
2. Il file viene salvato su UploadThing (già usato per KYC/DDT).
3. Un'API server scarica il PDF, lo passa a Gemini/Google Document AI e chiede un JSON con:
   - periodo del rendiconto;
   - cliente/committente (Energy Trucks);
   - righe viaggio: data, codice viaggio, ritiro, consegna, mezzo/targa, autista, riferimento ordine, peso/quantità, tariffa, importo, note.
4. L'AI restituisce anche una **confidenza per riga**. Le righe a bassa confidenza vanno in revisione.
5. L'admin vede una tabella di anteprima con:
   - righe nuove;
   - possibili duplicati (stessa data/tratta/importo);
   - righe da correggere;
   - totale PDF vs totale righe.
6. Conferma l'import: vengono creati i viaggi con:
   - `status: COMPLETATO` (sono viaggi già svolti);
   - `cliente: Energy Trucks` (o valore estratto);
   - `prezzo` = importo riga;
   - `dataRitiro`/`dataConsegna` dalla riga;
   - `tipoMerce` estratto o "Merce";
   - `pesoKg`/`volumeM3` se presenti, altrimenti 0;
   - `note` con "Import Energy Trucks · PDF <nome> · riga <n>".
7. `costo` parte da 0 e viene completato dal calcolatore costi (gasolio/pedaggi/autista).
8. Ogni import crea un batch con stato e audit log, così si può annullare o controllare.

### Deduplica
- Chiave forte: `codice viaggio` + `data` + `importo`.
- Chiave debole: `data` + `ritiro` + `consegna` + `importo`.
- Le righe duplicate vengono mostrate, non importate automaticamente.
- Gli importi vengono confrontati con il totale PDF; se la somma non torna, l'import si blocca.

### Perché non creare direttamente i viaggi
Il PDF può contenere righe ambigue, note, supplementi o viaggi già presenti. La preview con conferma evita duplicati e viaggi fantasma.

### Dati da chiedere sul PDF campione
- Intestazione e periodo.
- Colonne esatte.
- Come sono indicate tratte, targhe, autisti e importi.
- Presenza di supplementi (pedaggi, attese, carburante).
- Una riga di esempio per ogni caso.

## 4. Geotab: come sfruttarlo meglio

### Cosa abbiamo già
- `lib/geotab.ts` autentica MyGeotab e legge:
  - `Device` (mezzi);
  - `DeviceStatusInfo` (posizione, velocità, stato);
  - `User` (driver);
  - `Trip` (storico viaggi, km, durata, idling).
- `GeotabTripSnapshot` salva gli ultimi 90 giorni.
- `app/api/analytics/geotab` espone km per mezzo/autista.
- `app/api/fleet/map` unisce posizioni locali e Geotab.
- `lib/fuel.ts` usa i km Geotab per la stima carburante.

### Cosa aggiungere, in ordine
1. **Match automatico Geotab ↔ viaggio pianificato**
   - Per targa + finestra temporale (inizio Geotab vicino a `dataRitiro`).
   - Se c'è un solo viaggio compatibile, proponi il collegamento; non forzarlo.
   - Se non c'è, crea un “viaggio Geotab da completare” (non un viaggio finanziario).
2. **Km reali sul viaggio**
   - Salva `actualKm`, `actualStart`, `actualEnd`, `drivingMinutes`, `idlingMinutes`.
   - Confronta km pianificati vs reali e costo/km.
3. **Costi automatici**
   - Gasolio: km reali × consumo medio (o `FuelUsed`/`FillUp` se disponibile).
   - Pedaggi: da Telepass/Consorzio (import) o stima per tratta.
   - Autista: ore di guida + pause.
   - Usa il calcolatore costi già presente.
4. **Eventi e alert**
   - `ExceptionEvent`: frenate brusche, eccesso velocità, idling, uso fuori orario.
   - `Zone`: arrivo/partenza cliente o sede.
   - `Rule`: alert su viaggi senza chiusura, mezzi fermi, Geotab non comunicante.
5. **Sync incrementale**
   - `GetFeed` per `Trip`, `StatusData`, `ExceptionEvent`, `FuelTransaction` con `fromVersion`.
   - Rispettare i rate limit Geotab: `Get` ~1000/min, `GetFeed` ~60/min.
   - Salvare il `toVersion` per non rileggere tutto.
6. **Carburante**
   - `FuelTransaction` e `FillUp` solo se il fuel card/Geotab li espone.
   - In assenza, usare `FuelUsed`/`StatusData` o stima dichiarata.
7. **Tachigrafo**
   - Se il cliente usa Geotab con scarico tachigrafico, importare i file e collegarli all'autista/viaggio.

### Limiti da rispettare
- Geotab non sa chi è il cliente, il prezzo o il motivo del viaggio: serve il dato Truck Radar.
- Geotab non distingue da solo i km a vuoto: servono viaggi pianificati o carichi.
- La posizione può arrivare in ritardo: mostrare sempre “aggiornato a”.
- Non automatizzare multe, contestazioni o chiusure finanziarie senza conferma.

## 5. Costi del viaggio e margine

### Implementato ora
- Tabella `TripCostItem` con costi analitici per viaggio.
- API `/api/trips/[id]/costs` (GET/POST) e `/costs/[costId]` (DELETE).
- Componente `TripCostBreakdown` nel dettaglio viaggio:
  - Gasolio: km, km/l, €/l.
  - Pedaggi.
  - Autista: ore, €/h.
  - Traghetto/tunnel.
  - Altro costo.
- Il totale aggiorna `Trip.costo`; il margine è `prezzo - costo`.
- Il calcolatore `lib/routes.ts` resta disponibile per i giri.

### Prossimi passi
- Precompilare km da Geotab o dal route plan.
- Precompilare consumo da `FuelLog`/categoria mezzo.
- Pedaggi da Telepass/Consorzio o stima tratta.
- Salvare scenari (“stima” vs “consuntivo”).
- Mostrare margine per viaggio nella lista viaggi (già presente) e alert sotto soglia.

## 6. Agevolazioni fiscali, accise e bonus

### Cosa serve
Una sezione `/dashboard/agevolazioni` con:
- catalogo opportunità;
- scadenze;
- requisiti;
- documenti;
- stato (da valutare, in preparazione, inviata, ottenuta, scaduta);
- link ufficiale;
- promemoria email.

### Fonti
- **MIMIT — Incentivi**: catalogo nazionale, bandi, decreti.
- **Incentivi Italia / Sistema Incentivi Italia**: catalogo unico nazionale e regionale; area pubblica.
- **ADM — Agevolazione autotrasporto**: aliquota ridotta accisa gasolio, credito d'imposta.
- **MIT — bonus gasolio / credito d'imposta carburanti**: piattaforme e FAQ.
- **Consorzio Italia**: email e notizie su pedaggi, carburanti, rimborso IVA estera e accise, assicurazione, geolocalizzazione/tachigrafo.
- **Regione/CCIAA**: bandi locali (Emilia-Romagna, Ferrara-Ravenna).

### API disponibili?
Non risulta un'API pubblica e stabile per aggregare tutti gli incentivi. Le fonti sono portali, PDF, decreti e email. La strada corretta è:
1. **Catalogo curato** in DB (title, category, requirements, deadline, link, status).
2. **Inoltro email** a un indirizzo Truck Radar (`agevolazioni@in.truck-radar.it`).
3. **AI/OCR** che estrae da email/PDF: misura, scadenza, requisiti, link, documenti.
4. **Coda di revisione** per confermare.
5. **Alert** su scadenze e documenti mancanti.
6. **Non scrapare** portali autenticati o Consorzio senza autorizzazione.

### Modello dati proposto
`IncentiveOpportunity`:
- id, companyId, title, category, provider, description;
- amountText/amountMax, deadline, status;
- requirements, documents, officialUrl, source (`MANUAL`/`EMAIL`/`IMPORT`);
- confidence, notes, createdAt, updatedAt.

`IncentiveTask`:
- checklist, owner, dueDate, done.

### Priorità
- Accise gasolio autotrasporto (rimborso/credito d'imposta).
- Credito d'imposta gasolio/carburanti.
- Pedaggi/rimborsi Albo.
- IVA estera.
- Iperammortamento/Transizione 5.0 per software/licenze capitale.
- Nuova Sabatini, Fondo di Garanzia PMI, bandi CCIAA.
- Formazione autotrasporto.

## 7. Deleghe esterne consigliate

| Funzione | Servizio | Perché |
|---|---|---|
| KYC | Stripe Identity | Già Stripe, hosted flow, webhook |
| KYB | VIES + Openapi | P.IVA/CF e Registro Imprese |
| Geotab | MyGeotab API | Già integrato |
| Mappe/geocoding | Google Maps o Mapbox | ETA, geofence, indirizzi |
| Document AI | Gemini / Google Document AI | PDF, fatture, DDT, libretti |
| Email transazionale | Postmark/Resend | Verifica email, alert, digest |
| Email inbound | Postmark/Cloudflare | Documenti e agevolazioni |
| Telefono/WhatsApp | Telnyx/Twilio | Numero aziendale e Cloud API |
| Firma | SignWell/DocuSign | Contratti e deleghe |
| Monitoraggio | Sentry + uptime | Errori e availability |
| Rate limit | Upstash Redis | Limiti distribuiti |
| Fisco/e-invoicing | Fatture in Cloud/Aruba/Openapi SDI | Fatturazione e SDI |

## 8. Fasi di implementazione

### Fase 1 — ora
1. Costi analitici del viaggio (fatto).
2. PDF Energy Trucks: upload + anteprima + import (serve PDF campione).
3. Match Geotab suggerito per targa/data.

### Fase 2 — dopo il PDF
4. Sync incrementale Geotab e km reali sul viaggio.
5. Precompilazione costi da Geotab/carburante.
6. Alert viaggi senza chiusura/POD.

### Fase 3 — agevolazioni
7. Catalogo + scadenze + checklist.
8. Inoltro email Consorzio Italia e AI extraction.
9. Digest email e notifiche.

### Fase 4 — WhatsApp/email
10. Cloud API/forwarding per PDF e documenti.
11. Coda unica documenti con fonte e audit.

## 9. Domande aperte
- Il PDF Energy Trucks è un rendiconto mensile o un ordine per singolo viaggio?
- Contiene targa/autista o solo tratta e importo?
- Energy Trucks è il cliente/committente o il broker?
- Il prezzo è imponibile, lordo o include supplementi?
- Il padre vuole importare anche i viaggi già chiusi o solo quelli da fatturare?
- Consorzio Italia manda email a un indirizzo dedicato? Si può inoltrare?
- Geotab espone già fuel card/tachigrafo o solo posizioni e viaggi?

## 10. Fonti

- Geotab Trip: https://developers.geotab.com/myGeotab/apiReference/objects/Trip
- Geotab FuelTransaction: https://developers.geotab.com/myGeotab/apiReference/objects/FuelTransaction/
- Geotab StatusData: https://developers.geotab.com/myGeotab/apiReference/objects/StatusData
- Geotab GetFeed: https://developers.geotab.com/myGeotab/apiReference/methods/GetFeed
- Consorzio Italia: https://consorzioitalia.eu/
- MIMIT Incentivi: https://www.mimit.gov.it/it/incentivi
- Incentivi Italia: https://www.incentivi.gov.it/it
- ADM agevolazione autotrasporto: https://www.adm.gov.it/portale/agevolazione-autotrasporto
- MIT credito d'imposta autotrasporto: https://www.mit.gov.it/documentazione/piattaforma-credito-dimposta-favore-imprese-di-autotrasporto-ristoro-maggiore-spesa
