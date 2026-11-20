# Spese aziendali con ricevute ed export

Implementazione del 20/11/2026. Chiude il gap P1 "Spese aziendali + ricevute + CSV commercialista" di `docs/STIVA_FEATURES_GAP.md`.

## 1. Perché

- Le spese non di flotta (affitto, utenze, consulenze, stipendi, formazione) non avevano un registro.
- Il commercialista riceveva solo i costi dei mezzi e dei viaggi, non le ricevute aziendali.
- Serviva un flusso unico: ricevuta → importo → IVA → export, senza riscaricare documenti da più cartelle.

## 2. Modello dati

Tabella raw `Expense` in `scripts/ensure-raw-tables.ts`:

| Campo | Note |
|---|---|
| `date` | data del documento |
| `category` | codice del catalogo `lib/expense-catalog.ts` |
| `supplier` | fornitore |
| `description` | descrizione obbligatoria |
| `netAmount`, `vatRate`, `vatAmount`, `amount` | imponibile, aliquota, IVA e totale calcolati dal server |
| `paymentMethod` | BONIFICO, CARTA, CONTANTI, RIBA, ALTRO |
| `receiptUrl`, `receiptName` | ricevuta su UploadThing (solo host ammessi) |
| `notes` | riferimento viaggio, targa, numero documento |
| `createdBy`, `createdAt`, `updatedAt` | tracciamento |

L'utente inserisce il **totale documento** e l'aliquota: il server calcola imponibile e IVA e li salva, così l'export è coerente anche se il totale viene modificato.

Catalogo: 21 categorie in 5 gruppi (Flotta, Personale, Struttura, Servizi, Altro), ognuna con aliquota IVA predefinita.

## 3. API

Tutte con `requireFeature("expenses")` e isolamento `companyId`.

| Metodo | Endpoint | Funzione |
|---|---|---|
| GET | `/api/expenses?from=&to=&category=&q=` | elenco filtrato |
| POST | `/api/expenses` | registra spesa |
| PATCH | `/api/expenses/:id` | aggiorna e ricalcola IVA |
| DELETE | `/api/expenses/:id` | elimina |
| GET | `/api/expenses/export?from=&to=&category=&q=` | CSV per commercialista |

Sicurezza:

- `POST`/`PATCH`/`DELETE` riservati alla sede (`AUTISTA` → 403).
- `receiptUrl` accettato solo da host UploadThing (`utfs.io`, `ufs.sh`, `uploadthing.com`).
- Validazione in `lib/expense-input.ts`: data valida, categoria del catalogo, descrizione 2-240, importo 0,01-10.000.000, IVA 0-100, methodi di pagamento ammessi, limiti di lunghezza.
- Upload dedicato `expenseReceipt` (PDF/immagine, max 8 MB) con sessione obbligatoria.

## 4. Interfaccia

Pagina `/dashboard/spese` (sidebar "Fatturazione", permesso `expenses`):

- filtri data (default mese corrente), categoria e ricerca;
- KPI: totale periodo, imponibile, IVA, categoria principale;
- tabella desktop e card mobile con ricevuta apribile;
- modale crea/modifica con anteprima immediata di imponibile e IVA;
- upload ricevuta con `UploadButton` e possibilità di rimuoverla;
- totale di periodo a piè di tabella;
- empty state con una sola azione;
- export CSV con le stesse colonne del filtro attivo.

Il CSV contiene: data, categoria, fornitore, descrizione, imponibile, aliquota IVA, IVA, totale, pagamento, ricevuta, note.

## 5. Verifiche

- `npm run db:raw` → 146 statement idempotenti eseguiti.
- `npx tsc --noEmit` → pulito.
- `npm run build` → pulito.
- `npx tsx scripts/e2e-spese.ts` → **31/31 PASS**:
  - 403 autista, 400 su descrizione mancante, importo zero, categoria invalida, ricevuta fuori dominio;
  - creazione 122 € al 22% → imponibile 100, IVA 22;
  - filtri data/categoria/testo;
  - export CSV con intestazioni e valori corretti;
  - patch a 61 € → imponibile 50, IVA 11;
  - patch categoria senza alterare il totale;
  - pagina 200, eliminazione e verifica scomparsa.

## 6. Prossimi passi

1. OCR ricevute/fatture per precompilare importo, IVA e fornitore.
2. Collegamento spesa → viaggio/mezzo per il margine reale.
3. Categorie personalizzate per azienda.
4. Riepilogo mensile e alert su spese fuori soglia.
5. Export separato per IVA detraibile e indetraibile.
