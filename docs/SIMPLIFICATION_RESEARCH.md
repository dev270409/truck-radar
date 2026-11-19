# Cosa migliorare e semplificare — ricerca e piano

Ricerca del 17/11/2026. Obiettivo: rendere Truck Radar più semplice prima di avviare la società e scalare. Esclusi network, marketplace e subappalto finché non saranno attivi.

## 1. Fotografia attuale

- **35 sezioni dashboard**, **86 route API**, **8 sezioni SOON**.
- Molte funzioni sono potenti ma compete tra loro: l’utente non sa da dove iniziare.
- La dashboard mescola operatività, crescita, network e impostazioni.
- L’autista ha troppe informazioni da ufficio e poche azioni grandi.
- I documenti arrivano ancora fuori dal prodotto (email/WhatsApp) e vengono ricopiati a mano.

## 2. Principi di semplificazione

1. **Una domanda per ruolo.** Ogni home risponde a una sola domanda:
   - Admin: “Cosa richiede la mia attenzione oggi?”
   - Ufficio: “Cosa devo muovere adesso?”
   - Autista: “Qual è la prossima cosa da fare?”
   - Vettore: “Come sta andando la mia flotta?”
2. **Progressive disclosure.** Mostra prima l’essenziale; metti il resto dietro “Avanzate”, filtri o drill-down.
3. **Eccezioni prima delle medie.** Mostra ciò che è rotto o a rischio, non 20 KPI uguali.
4. **Una sola azione primaria per schermata.**
5. **Default intelligenti.** Precompila mezzo, autista, cliente, tariffa, data e documento quando il contesto lo consente.
6. **Meno campi obbligatori.** Chiedi solo ciò che serve per la prossima azione; il resto è facoltativo.
7. **Mobile-first per l’autista.** Tap target ≥ 48 px, una mano, offline, niente tastiera se non indispensabile.
8. **Ogni alert ha un’azione.** Senza “chiama, assegna, riprogramma, carica documento”, è solo rumore.
9. **La tecnologia deve sembrare più semplice mentre il problema diventa più complesso.**
10. **Misura il tempo risparmiato, non il numero di funzioni.**

## 3. Navigazione semplificata proposta

### Admin / Ufficio
1. **Oggi** — eccezioni, viaggi da assegnare, documenti da gestire, scadenze.
2. **Movimento** — Viaggi, Piano di carico, Giri e costi, Flotta, Autisti.
3. **Amministrazione** — Documenti, Clienti, Preventivi, Ordini, Scadenze, Carburante, Costi.
4. **Impostazioni** — Azienda, utenti, integrazioni, abbonamento, import/export.

Regole:
- Network/marketplace/SOON fuori dalla sidebar finché non attivi.
- Una voce per concetto, non una per tabella.
- Global search sempre visibile.
- Desktop 4 gruppi; mobile 5 voci: Oggi, Viaggi, Carico, Documenti, Altro.

### Autista
1. **Oggi** — viaggio corrente, prossima tappa, un pulsante grande.
2. **Viaggio** — tappe, documenti, POD, eccezioni.
3. **Documenti** — solo i suoi documenti e quelli del viaggio.

Nient’altro in prima battuta.

### Vettore
Stessa struttura dell’admin, ma solo dati della propria azienda. Nessun network.

## 4. Cosa semplificare subito

1. **Nascondere le 8 sezioni SOON** dalla Home e dalla sidebar: restano nel codice, non nell’attenzione.
2. **Ridurre la Home** a “Da fare oggi” + 3 blocchi: flotta, soldi, conformità.
3. **Rimuovere i duplicati**: analisi clienti vs analytics, costi mezzi vs carburante, scadenze vs notifiche. Ogni dato deve avere una casa sola.
4. **Form brevi**: viaggio, preventivo, costo, documento. Campi avanzati in un pannello chiuso.
5. **Onboarding in 4 passi**: azienda → mezzi (import CSV) → autisti → primo viaggio. Progress visibile, dati facoltativi dopo.
6. **Empty state con una sola azione**: “Crea il primo viaggio”, “Carica un documento”.
7. **Tabelle solo desktop; card su mobile** per utenti, costi, accise, preventivi, ordini, analisi clienti (già fatto).
8. **Un solo posto per i documenti** (vedi sotto), non upload sparsi in 5 pagine.
9. **Rimuovere dati demo/test** dalla vista reale (già puliti gli utenti/mezzi e2e).
10. **Rendere esplicita la fonte e l’età del dato** (“Geotab · 2 min fa”).

## 5. Documenti in arrivo: email e WhatsApp

### Flusso consigliato
1. **Intake** — una casella dedicata o un indirizzo di inoltro; per WhatsApp usare Cloud API o export/inoltro, non automazione di WhatsApp Web.
2. **Classificazione** — AI/OCR riconosce il tipo: DDT, fattura, bolla, ordine di ritiro, packing list, CMR, POD, documento mezzo, patente/CQC, assicurazione, revisione, multa, ricevuta carburante, nota spese, contratto, visura, DURC, Albo, REN.
3. **Estrazione** — campi chiave: cliente/fornitore, data, numero documento, targa, autista, viaggio, importo, IVA, scadenza, mittente, allegati.
4. **Validazione** — regole: P.IVA/ragione sociale, targa esistente, viaggio aperto, importo coerente, documento duplicato.
5. **Coda di revisione** — solo i documenti a bassa confidenza o con errori; l’admin corregge il campo, non ricopia tutto.
6. **Collegamento** — a viaggio, mezzo, autista, cliente, scadenza o spesa.
7. **Archivio** — ricerca per targa, cliente, data, tipo; retention e audit.

### Vista Admin “Documenti”
- **Da classificare** — appena arrivati.
- **Da collegare** — classificati ma senza viaggio/mezzo.
- **Da approvare** — bassa confidenza o importo anomalo.
- **Archiviati** — ricerca e consultazione.
- Azioni: collega, crea viaggio, crea scadenza, crea spesa, archivia, rifiuta.
- Filtri: tipo, cliente, targa, data, stato, fonte (email/WhatsApp/upload).

### Vista Autista “Documenti”
- Solo documenti del viaggio e personali.
- Upload foto/PDF, firma POD, DDT, ricevute.
- Nessuna coda di classificazione, nessun documento di altri.

### Email: come accedere senza rischi
- Meglio **inoltro automatico** da Gmail/Outlook a un indirizzo dedicato, o OAuth con scope di sola lettura, non la password personale.
- Se serve IMAP, usare una **app password** e revocarla dopo il test.
- Non salvare credenziali nel repository; usarle solo in sessione e poi revocarle.

### WhatsApp: regola chiara
- **Non automatizzare WhatsApp Web** con il numero di tuo padre: viola i termini e rischia il ban del numero.
- Strada corretta: **WhatsApp Business Cloud API** con numero dedicato e webhook, oppure export/inoltro manuale delle chat e dei documenti.
- Se il numero è personale, usare un numero nuovo per l’azienda e lasciare il personale fuori dal prodotto.

## 6. Cosa chiedere per l’accesso

### Email
- Provider (Gmail/Workspace/Outlook) e presenza 2FA.
- Creare un’etichetta/filtro “Truck Radar” o un inoltro a una casella dedicata.
- 20–30 email reali rappresentative, con allegati: DDT, fatture, ordini di ritiro, packing list, CMR, scadenze, multe, ricevute.
- Chi risponde oggi a queste email e con quale azione.

### WhatsApp
- Numero personale o Business; volume giornaliero; chi scrive (clienti, autisti, fornitori, broker).
- Tipi di allegati e messaggi ricorrenti.
- Esportazione di 20–30 chat rappresentative, o screenshot con dati sensibili oscurati.
- Decisione: numero dedicato per Cloud API o inoltro manuale.

### Privacy
- Accesso solo in lettura, nessun invio di messaggi.
- Nessuna password salvata su file o repo.
- Dati campione minimizzati e cancellati dopo la mappatura.
- DPA e informativa per i dati degli autisti prima del go-live.

## 7. Piano di semplificazione

### Fase A — ora, senza accessi
1. Sidebar a 4 gruppi; SOON fuori.
2. Home “Oggi” con 4 contatori e azioni (fatto).
3. Card mobile per le tabelle principali (fatto).
4. Onboarding 4 passi.
5. Form brevi + “Avanzate”.
6. Coda unica “Documenti” con upload manuale.

### Fase B — con email
7. Casella dedicata/inoltro.
8. Classificazione AI + estrazione.
9. Coda “Da classificare / Da collegare / Da approvare”.
10. Collegamento a viaggio/mezzo/autista/scadenza.

### Fase C — con WhatsApp
11. Cloud API con numero dedicato, webhook e template.
12. Stessa coda documenti, fonte “WhatsApp”.
13. Notifiche automatiche a cliente/autista solo se opt-in.

### Fase D — pulizia
14. Unificare analytics/costi/scadenze.
15. Eliminare o nascondere pagine legacy.
16. Misurare tempo per viaggio, tap per consegna, documenti automatici, adozione mobile.

## 8. Metriche da tenere

- Tempo per creare un viaggio.
- Tap per completare una consegna.
- % documenti classificati automaticamente.
- Tempo medio di gestione di un documento.
- % viaggi con DDT/POD completi.
- Utilizzo mobile vs desktop.
- Errori/duplicati per documento.
- Tempo di onboarding di una nuova azienda.

## 9. Fonti

- Medium — redesign fleet dashboard, progressive disclosure: https://medium.com/@sav.io/redesigning-a-complex-fleet-management-dashboard-ac2efc91868b
- Bouncie — buyer’s guide 2026, UX e complessità: https://www.bouncie.com/blog/fleet-management-platform-buyers-guide
- SimplyFleet — software troppo complicato per autisti: https://www.simplyfleet.app/blog/is-your-fleet-management-software-too-complicated-for-your-drivers
- FleetRabbit — UI scadente, errori e manutenzione: https://fleetrabbit.com/blogs/post/poor-fleet-software-ui-driver-errors-missed-maintenance
- NN/g — progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure
- My Design Audit — onboarding SaaS: https://www.mydesignaudit.com/blog/saas-onboarding-ux-audit
- Autosist — software per dimensione flotta: https://autosist.com/blog/choose-fleet-management-software-fleet-size
- DDI — automazione documenti freight forwarder: https://ddi-dev.com/blog/case/how-we-automated-document-processing-with-ai-solutions-for-a-freight-forwarder-company
- Airparser — document automation logistica: https://airparser.com/blog/best-document-automation-tools-logistics-freight-teams
- Parseur — document processing logistica: https://parseur.com/blog/best-document-processing-logistics
- Affinda — automazione documenti logistica: https://www.affinda.com/blog/how-to-automate-logistics-document-processes
- Klippa — logistics document automation: https://www.klippa.com/en/blog/information/logistics-documents-automation
- WhatsApp Business Platform (Meta): https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- WhatsApp Web API ufficiale vs non ufficiale: https://theautomate.ai/blog/whatsapp-web-api
- WhatsApp ban risk / policy: https://cartsaver.net/help/official-whatsapp-api-vs-unofficial-workarounds-why-your-business-number-is-at-risk
