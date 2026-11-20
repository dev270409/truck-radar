# Stiva — audit del backend osservabile

Data: 20/11/2026. Sessione autorizzata sull'account Stiva in prova. Metodo: navigazione delle 23 route applicative, cattura di 150 chiamate XHR/fetch, 48 endpoint unici in lettura, analisi dei bundle JS pubblici (`app.js`, `giro.js`, `packer.js`, `misure.js`, `scadenze-tipi.js`, `tagliandi-voci.js`, `fatture-calcolo.js`, `bolle.js`). Non è stato letto il codice server, non sono stati accessi dati di altri tenant e non sono stati copiati codice, asset o testi.

## 1. Come è fatto il backend

- REST JSON same-origin su `app.stiva.cloud/api/*`; niente GraphQL.
- Sessione via cookie; il server ricava azienda e utente dalla sessione, non da un `companyId` passato dal client.
- Errori JSON `{ errore }`. Il codice `402` apre la pagina abbonamento; `401/403` bloccano l'operazione.
- ID numerici, date ISO, campi in italiano. I dati complessi sono spesso JSON dentro un record (`assi`, `risultato`, `dati`, `impostazioni`).
- Upload: base64 per immagini piccole; file grandi e PDF salvati sul server e serviti da `/api/.../file/{id}`. Documenti originali e versioni "sistemate" restano separati.
- Il client calcola anteprime e totali, ma il server ricalcola i valori fiscali e decisivi (fatture, numerazioni, stato abbonamento).
- Bootstrap: `GET /api/me` restituisce utente, ruolo, permessi, funzioni attive, beta, stato password e configurazione analytics. `GET /api/abbonamento/stato` restituisce il gate di accesso.

### Moduli API osservati

| Area | Endpoint principali |
|---|---|
| Sessione | `/api/me`, `/api/login`, `/api/logout`, `/api/me/password`, `/api/password/dimenticata`, `/api/password/link` |
| Abbonamento | `/api/abbonamento`, `/api/abbonamento/stato`, `/attiva`, `/periodo`, `/bonifico`, `/portale`, `/disdici`, `/ricarica`, `/fatturazione` |
| IA/OCR | `/api/foto/credito`, `/api/foto/stato`, `/api/foto/leggi`, `/api/foto/sessione`, `/api/foto/bordi`, `/api/mezzi/libretto`, `/api/mezzi/libretto/stato`, `/api/giri/leggi`, `/api/giri/leggi-testo`, `/api/preventivi/da-file`, `/api/bollettazione/leggi-ddt` |
| Mezzi | `/api/mezzi`, `/api/mezzi/:id`, `/assi`, `/revisione`, `/foto`, `/libretto`, `/api/complessi`, `/api/officina`, `/interventi`, `/voci`, `/km` |
| Scadenze | `/api/scadenze`, `/api/scadenze/voce`, `/api/scadenze/persone`, `/api/scadenze/stato-avvisi`, `/api/impostazioni/divieti`, `/api/impostazioni/avvisi-divieti` |
| Costi | `/api/costi-mezzi`, `/panoramica`, `/riepilogo`, `/file`, `/api/spese`, `/api/spese/:id/file`, `/api/costi`, `/api/costi/mese/:mese`, `/api/costi/sblocca` |
| Carburante | `/api/gasolio`, `/movimenti`, `/cisterne`, `/prezzi`, `/importa`, `/accise/periodi`, `/mezzi/:id` |
| Viaggi | `/api/viaggi`, `/api/viaggi/:id`, `/chiudi`, `/riapri`, `/scelte`, `/medie-autisti` |
| Carico/giri | `/api/piani`, `/api/colli`, `/api/giri-salvati`, `/api/giri-abituali`, `/api/percorsi/calcola`, `/matrice`, `/pedaggio` |
| Preventivi | `/api/preventivi`, `/clienti`, `/fornitori`, `/agenda`, `/allegati`, `/versioni`, `/eliminati`, `/da-file`, `/prezzo`, `/confermato`, `/viaggio`, `/inserito` |
| Anagrafica | `/api/clienti`, `/api/clienti/abbina` |
| Bollettazione | `/api/bollettazione`, `/clienti`, `/contratti`, `/allegati`, `/stato`, `/stampate`, `/leggi-ddt` |
| Fatture | `/api/fatture`, `/prepara`, `/emetti`, `/nota-credito`, `/stato`, `/da-bolla`, `/impostazioni` |
| Utenti | `/api/utenti`, `/api/autisti/accessi`, `/api/autisti/giri`, `/api/autisti/avvisi`, `/api/push/iscrivi` |
| Impostazioni | `/api/impostazioni/primi-passi`, `/logo`, `/sedi`, `/tassato`, `/costi`, `/giri`, `/divieti`, `/avvisi-divieti` |
| Assistenza | `/api/assistenza`, `/api/richieste`, `/api/novita`, `/api/novita/viste` |

## 2. Modello dati ricostruito

- **User**: ruolo, permessi per area, funzioni aziendali attive, cambio password, invito, accesso autista.
- **Company**: piano, prova, stato pagamento, sede/i, logo e intestazione PDF, scadenze attive, avvisi email, impostazioni costi/giri/divieti.
- **Person**: autista dipendente distinto dall'utente che accede; può avere account, patente, CQC, carta tachigrafica, visite, corsi.
- **Vehicle**: categoria, portata, volume, classe Euro, massa, serbatoio, consumo, assi, revisione, foto, libretto multi-pagina, sospensione avvisi.
- **Complesso**: motrice + rimorchio/semirimorchio, usato per carico, assi e costi.
- **Deadline**: soggetto `mezzo|autista|azienda`, tipo, data, note, foto, rinnovo, avvisi.
- **Maintenance**: interventi con km/data, voci del tagliando, costo, manodopera, officina, note.
- **Fuel**: cisterne, movimenti, prezzi, consumi per mezzo, periodi accise, importazioni.
- **Trip**: mezzo, autista, ritiro/consegna, merce, pesi, prezzo, costo effettivo, clienti multipli con quote, preventivo collegato, stato chiuso/aperto.
- **LoadPlan/CargoItem**: colli, misure, peso, impilabilità, consegna, risultato 2D/3D, regole di carico.
- **SavedRoute/HabitualRoute**: tappe, indirizzi geocodificati, ordine fisso, note, orari di apertura.
- **Quote/SupplierQuote**: cliente/fornitore, righe, prezzo, costo, margine, allegati, versioni, registro eliminati, agenda.
- **Customer**: anagrafica unica, indirizzi, contatti, contratti, condizioni pagamento.
- **Waybill/Invoice**: righe, aliquote/nature IVA, bollo, numerazione, stato, XML SdI, note di credito.
- **CostEntry/CostCenter**: categoria, ambito, tipo, mese, importo, IVA, fornitore, documento, file, spalmatura su più mesi.
- **Expense**: spese aziendali, ricevuta, categoria, export commercialista.
- **Subscription/AiCredit**: periodo, pagamenti, credito lettura, saldo e costo per lettura.

## 3. Regole di business più importanti

### Permessi e ruoli

- Permessi granulari per area: mezzi, scadenze, gasolio, autisti, giri, carico, viaggi, preventivi, conferma preventivi, preventivi fornitori, costi mezzi, officina, bollettazione, fatturazione, contratti.
- Funzioni aziendali attive separate dai permessi utente.
- Ruoli osservati: admin, ufficio, autista, meccanico, superadmin.
- UI "sola lettura" se manca il permesso; il server deve comunque rifiutare la scrittura.
- Preventivi: permesso separato per confermare e cambiare prezzo.

### Trial e abbonamento

- `accesso`: motivo, data fine, giorni, scaduta, bloccata, giorni prova.
- Stato separato per `past_due`, `insolutoDal`, `grazia`, `bloccata`.
- Con abbonamento bloccato restano accessibili solo abbonamento, assistenza e account.
- `402` dal backend porta alla pagina abbonamento; non è solo un redirect client.
- Prezzo bloccato per cliente, esenzione, credito lettura, listino base + utente + scadenze.

### IA/OCR

- `foto/credito`: `attivo`, `saldo`, `prezzo`, `crediti`, `creditiLettura`, `letture`, `esaurito`.
- Ogni lettura riuscita scala crediti; i beta tester non scalano.
- Libretto: più pagine, OCR/IA, unione pagine allo stesso libretto, foto originale e versione sistemata.
- Giri: lettura PDF/immagine/testo, estrazione indirizzi, geocoding, matrice distanze, pedaggi.
- Preventivi/DDT: lettura da file per precompilare.

### Scadenze

Catalogo di 19 tipi:
- Mezzi (8): assicurazione, bollo, revisione tachigrafo, scarico tachigrafo, tagliando, estintori, ATP, ADR mezzo.
- Autisti (8): patente, CQC, carta tachigrafica, scarico carta, visita medica, ADR conducente, muletto, formazione sicurezza.
- Azienda (3): DURC, polizza merci, Albo autotrasportatori.

Ogni tipo ha:
- durata proposta in mesi o giorni;
- base del rinnovo: dalla vecchia scadenza o da oggi;
- passi di avviso (es. 10 e 1 giorno);
- categorie di mezzo applicabili (motore, frigo, ADR);
- possibilità di essere disattivato dall'azienda.

Controlli backend/UI:
- `stato-avvisi`: servizio attivo, assenza destinatari, errori recenti, ultima modifica.
- Banner se nessuno riceve gli avvisi o se qualche email non è partita.
- Sospensione avvisi per mezzo fermo/in vendita.
- Rinnovo automatico della data, sempre modificabile.

### Manutenzione

- 18 voci di tagliando con intervalli medi per furgoni, camion e rimorchi.
- Ogni voce ha km e/o mesi; `null` significa che il criterio non si applica.
- L'azienda può sovrascrivere gli intervalli o aggiungere voci proprie.
- Stato: `scaduta`, `vicina`, `ok`, `mai`, `nessuna`.
- Soglia "vicina" a 30 giorni oppure a `max(2000 km, 10% dell'intervallo)`.
- Il tagliando è "mai" se non c'è un intervento registrato; non viene inventata una scadenza.
- Manodopera + costo delle singole voci; l'intervento registra km, officina e note.

### Costi

- 5 ambiti: mezzo, personale viaggiante, personale non viaggiante, servizi logistici, azienda.
- 6 tipi: ordinaria, straordinaria, fisso, personale, struttura, servizi.
- Circa 40 categorie: gomme, tagliando, officina, carrozzeria, ricambi, revisione, tachigrafo, frigo, lavaggio, AdBlue, pedaggi, soccorso, multe, assicurazione, bollo, leasing, stipendio, contributi, INAIL, trasferta, straordinari, rimborso, TFR, formazione, vestiario, affitto, utenze, telefono, software, consulenze, banca, tasse, pubblicità, padroncino, corrispondente, cooperativa, interinale, magazzino terzi, altro.
- Importi senza IVA, spalmati sui mesi quando la spesa è pluriennale.
- Costi fissi e manutenzione separati dal gasolio.
- Consumo effettivo solo nei mesi con km ai rifornimenti; altrimenti stima.
- Costi al km, litri/100 km, costo medio per spedizione e per quintale.
- Centri di costo: linea, magazzini corrispondenti, distribuzione, magazzino, officina, ufficio.
- Il costo di una spedizione è la somma dei costi unitari dei centri; il ricarico si applica sul costo.

### Carico

- Colli con misure, peso, impilabilità, fragilità, massimo strati, consegna.
- Regole: appoggio almeno 80%, niente sovrapposizione, niente sporgenza, portata, carico di punta, ultima consegna caricata per prima, consegne separate, margine alle porte (default 10 cm).
- Supporto del peso: un collo non va sopra uno molto più leggero (rapporto 1,5 e tolleranza 50 kg).
- Baricentro, metri lineari, volume, percentuale peso/volume.
- Bilanciamento assi con margine 2% sotto il massimo; stima include tara, gasolio e autista.
- Modalità manuale e confronto con il calcolo automatico.

### Viaggi e preventivi

- Preventivo → viaggio, con possibile più mezzi e quote cliente.
- Prezzo, costo, margine, ricarico separati.
- Chiusura/riapertura viaggio; costi effettivi modificabili.
- Medie autisti per costo orario e trasferta.
- Versioni del preventivo, registro eliminati con ripristino, storico prezzo.
- Agenda clienti/fornitori e allegati con prezzo.

### Fatturazione

- Nature IVA N1–N7, regimi RF01/RF19/RF02, modalità pagamento.
- Bollo virtuale 2 € sopra 77,47 € di imponibile senza IVA.
- Scadenza a giorni o fine mese.
- DDT → fattura, note di credito, XML SdI, numerazione server-side.
- Il client può mostrare l'anteprima, ma il server decide totali e numero.

## 4. Cosa implementare in Truck Radar

### P0 — Permessi granulari

Oggi Truck Radar ha ruoli ma non un vero permesso per area. Serve:
- `User.permissions` JSON con default per ruolo;
- `requirePermission(feature)` nelle API;
- UI sola lettura e menu filtrato;
- inviti con password temporanea e reset;
- log delle modifiche ai permessi.

Impatto: chiude il gap più rischioso e abilita ufficio, meccanico e collaboratori senza dare tutto.

### P0 — Catalogo scadenze e avvisi

Oggi le page scadenze hanno tipi hardcoded e non c'è uno stato degli avvisi. Serve:
- catalogo tipi (19 voci) con soggetto, durata, base rinnovo, passi avviso, categorie;
- configurazione per azienda;
- rinnovo automatico;
- unificazione scadenze veicolo/autista/azienda;
- stato email, destinatari, errori, sospensione avvisi;
- banner "nessuno riceve gli avvisi".

Impatto: è il cuore del valore operativo e riduce le chiamate in ufficio.

### P1 — Manutenzione programmata

Aggiungere catalogo 18 voci, intervalli per categoria, override per mezzo, stato `scaduta/vicina/ok/mai`, soglia km, registro interventi con voci e manodopera.

### P1 — Tassonomia costi

Sostituire le categorie libere del costo viaggio con una tassonomia condivisa; aggiungere ambito, tipo, IVA, spesa plurimestrale, costo al km e costo per spedizione/quintale.

### P1 — Crediti lettura IA

Truck Radar ha OCR ma non un controllo di costo. Se il provider diventa a consumo:
- saldo crediti per azienda;
- costo per lettura;
- letture incluse nel piano;
- blocco o avviso a esaurimento;
- log delle letture.

Non implementarlo prima di avere un costo provider reale.

### P2 — Giri e pedaggi

Aggiungere matrice distanze, pedaggi per mezzo, geocoding con precisione via/comune, lettura PDF/OCR/testo, giri abituali e precedenze ritiro/consegna.

### P2 — Preventivi e fatturazione

Versioni, registro eliminati, agenda fornitori, preventivo→viaggio multi-mezzo, DDT→fattura XML. La fatturazione richiede validazione fiscale esterna: non improvvisarla.

## 5. Cosa non copiare

- Listino 29 €/mese, pacchetti crediti e prezzi Stiva.
- Testi, video, asset, CSS o codice dei bundle.
- Ruoli/permessi esatti senza prima decidere quali servono a Truck Radar.
- Logica fiscale senza commercialista e provider SdI validato.

## 6. Prossimo passo consigliato

1. Permessi granulari con enforcement server.
2. Catalogo scadenze + avvisi email.
3. Manutenzione programmata.
4. Tassonomia costi.
5. Solo dopo: crediti OCR, giri/pedaggi, fatturazione.

La prima due sono le più "backend" e hanno il maggiore impatto operativo; si possono implementare senza cambiare il posizionamento commerciale di Truck Radar.
