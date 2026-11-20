# Anagrafica unica clienti e fornitori

Implementazione del 20/11/2026. Chiude il gap P0 "Clienti/rubrica con agenda e import" emerso dagli audit Stiva (`docs/STIVA_FEATURES_GAP.md`, `docs/STIVA_BACKEND_AUDIT.md`).

## 1. Perché

- I preventivi e gli ordini chiedevano nome, email e telefono a testo libero: ogni documento creava un cliente diverso.
- La tabella `Customer` e le funzioni di lista/creazione esistevano già, ma non c'erano API né pagina: il permesso `clients` era nel catalogo senza alcun utilizzo.
- Import/export CSV gestivano solo nome, email, telefono, indirizzo e P.IVA.
- Serviva un archivio unico riutilizzabile da preventivi, ordini, portale e (in futuro) giri e contratti.

## 2. Modello dati

Tabelle raw in `scripts/ensure-raw-tables.ts` (Prisma CLI migrate non disponibile):

`Customer` (estesa in modo additivo con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`):

| Campo | Note |
|---|---|
| `type` | `CLIENTE` o `FORNITORE`, default `CLIENTE` |
| `name` | ragione sociale, obbligatoria |
| `contactName` | referente operativo |
| `email`, `phone` | contatti principali |
| `address`, `city`, `province`, `postalCode`, `country` | sede principale, `country` default `IT` |
| `vat` | P.IVA o codice fiscale |
| `sdi`, `pec` | fatturazione elettronica |
| `paymentTerms` | condizioni di pagamento |
| `notes` | annotazioni |

`CustomerAddress` (nuova): indirizzi secondari collegati all'anagrafica.

- `id`, `companyId`, `customerId`
- `label` (default `Sede`), `address`, `city`, `province`, `postalCode`, `country`, `notes`
- indici su `companyId` e `customerId`

Nessun dato esistente viene cancellato: le righe già presenti diventano `CLIENTE` con `country = IT`.

## 3. API

Tutte protette da `requireFeature("clients")` e isolate per `companyId`.

| Metodo | Endpoint | Funzione |
|---|---|---|
| GET | `/api/customers?type=CLIENTE\|FORNITORE&q=` | elenco con conteggio indirizzi secondari |
| POST | `/api/customers` | crea cliente o fornitore |
| GET | `/api/customers/:id` | scheda + indirizzi |
| PATCH | `/api/customers/:id` | aggiorna i campi inviati |
| DELETE | `/api/customers/:id` | elimina se non ci sono preventivi/ordini collegati |
| GET | `/api/customers/:id/addresses` | indirizzi secondari |
| POST | `/api/customers/:id/addresses` | aggiunge indirizzo |
| DELETE | `/api/customers/:id/addresses/:addressId` | elimina indirizzo |

Regole:

- `POST`/`PATCH`/`DELETE` riservati alla sede (`AUTISTA` → 403 anche se il permesso fosse attivo).
- `DELETE` risponde `409` con il numero di preventivi e ordini collegati: prima si scollegano o si eliminano i documenti.
- Validazione in `lib/customer-input.ts`: nome 2-160 caratteri, email/PEC valide, P.IVA/CF 5-32 alfanumerici, SDI 7 caratteri, provincia maiuscola, stato ISO a 2 lettere, limiti di lunghezza su ogni campo.

## 4. Interfaccia

Pagina `/dashboard/anagrafica` (voce "Anagrafica" nel gruppo Commerciale, permesso `clients`):

- tab Clienti/Fornitori con contatori;
- ricerca per nome, referente, email, P.IVA, città, telefono;
- KPI: clienti, fornitori, anagrafiche con P.IVA, sedi secondarie;
- tabella desktop e card mobile;
- modale crea/modifica con dati fiscali, condizioni di pagamento e indirizzi secondari;
- empty state con una sola azione ("Aggiungi il primo cliente/fornitore");
- export CSV aggiornato con tipo, referente, città, provincia e CAP.

Integrazione:

- `/dashboard/preventivi` e `/dashboard/ordini` hanno un selettore "Cliente occasionale / nuovo" che precompila nome, email e telefono e invia `customerId`.
- Il testo libero resta disponibile per i clienti occasionali.
- Import CSV clienti accetta `tipo`, `referente`, `citta`, `provincia`, `cap`.
- Export clienti allineato alle stesse colonne.

## 5. Verifiche

- `npm run db:raw` → 142 statement idempotenti eseguiti.
- `npx tsc --noEmit` → pulito.
- `npm run build` → pulito (124 pagine).
- `npx tsx scripts/e2e-anagrafica.ts` → **37/37 PASS**:
  - validazione (nome, tipo, email) e 403 autista;
  - creazione cliente con normalizzazione di provincia, stato, SDI;
  - creazione fornitore e filtro per tipo/testo;
  - patch parziale, indirizzo secondario, conteggio sedi;
  - preventivo collegato a `customerId`;
  - blocco eliminazione con 409 e messaggio parlante;
  - pulizia, eliminazione cliente/fornitore, pagina 200 ed export con colonna `tipo`.

## 6. Prossimi passi

1. Usare gli indirizzi salvati nei giri e nei piani di carico (selezione invece di digitazione).
2. Contratti e condizioni per cliente (allegati, validità, listini).
3. Confronto preventivi fornitori sull'anagrafica fornitori.
4. Portale clienti: storico documenti e fatture per anagrafica.
5. Deduplica assistita su P.IVA durante import e creazione.
