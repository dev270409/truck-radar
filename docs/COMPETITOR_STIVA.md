# Competitor analysis — Stiva (stiva.cloud)

Ricerca effettuata il 12/11/2026 sulle pagine pubbliche: `/` (landing completa), `/privacy`, `/termini`, `/accedi`. Il sito è una single-page con login su `app.stiva.cloud`; non ci sono altre pagine pubbliche indicizzate (sitemap con solo la home).

## 1. Posizionamento

- Target: PMI di autotrasporto e spedizionieri italiani.
- Promessa: "Carica di più. Gira di meno. Non scordarti niente."
- Tono: operativo, concreto, "fatto da chi i trasporti li fa davvero", zero gergo tecnico.
- Accesso: browser, nessuna installazione, PC/tablet/telefono.
- GTM: prelancio 29 €/mese tutto incluso per le prime 20 aziende, prezzo bloccato 12 mesi; dopo il lancio 49 €/mese base + moduli a pagamento; 15 giorni di prova senza carta; nessun contratto; onboarding con chiamata e attivazione con i mezzi del cliente.
- Fiducia: server in Europa, DPA art. 28, elenco sub-responsabili, dati scaricabili, cancellazione dopo 60 giorni, GPS conservato 30 giorni, fatture 10 anni, AI che non addestra sui dati, nessuna vendita dati/pubblicità.

## 2. Funzioni dichiarate

1. Piano di carico 3D per camion, motrici, bilici, rimorchi e container (20', 40', 40' HC, 45' HC, frigo).
   - OCR packing list da foto, colli gestiti uno per uno, metri lineari, peso, baricentro, rispetto assi, "quale mezzo basta?", colli ruotabili, barre fermacarico, più consegne sullo stesso mezzo, stampa del piano per il magazzino.
2. Giri e costi del viaggio.
   - Import indirizzi da email/WhatsApp/Excel, geocoding, ottimizzazione multi-tappa, orari di arrivo, partenza dalla sede o da una tappa, rubrica clienti, costo viaggio (gasolio, pedaggi per classe mezzo, autista, pause), prezzo consigliato.
3. Calcolatore trasporto.
   - Volume, peso tassato, metri lineari, prezzo; tariffe a quintale/kg/m³/metro lineare/bancale/scatola/unità; regole kg/m³, arrotondamenti, minimo tassabile; servizi (sponda, preavviso, facchinaggio, adeguamento gasolio); OCR packing list; passaggio al piano di carico.
4. Preventivi e portale ordini cliente.
   - Pagina ordini brandizzata per ogni cliente, richiesta ordine/preventivo, upload PDF ordine di ritiro, stati ricevuto/confermato/in viaggio/consegnato, accettazione preventivo con un clic, richieste da non-clienti dal sito, registro preventivi con prezzi fornitori e margine.
5. Analisi spedizioni.
   - Import Excel delle bolle, andamento clienti mese per mese vs anno prima, clienti fermi/in calo/in crescita, fatturato, peso, giorni e zone di consegna; elaborazione client-side (i file non arrivano ai server).
6. Mezzi e costi.
   - OCR libretto (targa, portata, assi, classe Euro, revisione), scheda mezzo con foto/documenti, consumo reale dai rifornimenti, costi per gomme/officina/tagliando con foto fattura, assicurazione ripartita sui 12 mesi, costo al km e costo mensile per mezzo.
7. Scadenze, documenti e divieti.
   - Mezzi (revisione, assicurazione, bollo, tachigrafo, tagliando, ATP), autisti (patente, CQC, carta tachigrafica, visita medica, ADR), azienda (DURC, polizza merci, Albo), avvisi email, riepilogo mensile stampabile, calendario divieti mezzi pesanti con condivisione WhatsApp.
8. Gasolio.
   - Una o più cisterne con contalitri, rifornimenti in cisterna e distributori esterni, litri rimasti/autonomia, alert consumi anomali/cisterna bassa, prospetto rimborso accise trimestrale.
9. In arrivo.
   - App autisti (giro sul telefono, navigatore, foto e firma alla consegna, documenti e avvisi), posizione mezzi dal vivo.

## 3. Cosa ha già Truck Radar

- Multi-tenant, ruoli, KYC/KYB, abbonamenti Stripe, dashboard.
- Mezzi con documenti e scadenze, autisti, viaggi, DDT digitale, tracking link per il committente.
- Geotab live e analytics per mezzo/autista, carburante con rifornimenti e stime, manutenzione, notifiche.
- Marketplace/subappalto, Smart Return, network, recensioni, badge, ESG, ispezioni (in parte SOON).
- PWA autista con viaggi assegnati, upload DDT, tracking consegna.
- Analytics per mezzo/autista (km, ricavi, costi, margine).

## 4. Gap rispetto a Stiva

| Area | Stiva | Truck Radar | Priorità |
|---|---|---|---|
| Piano di carico 3D / peso tassato / OCR packing list | Sì | No | Alta |
| Ottimizzazione giri multi-tappa + costi viaggio/pedaggi | Sì | Parziale (viaggi, Smart Return) | Alta |
| Calcolatore preventivo / portale ordini cliente | Sì | No | Alta |
| Analisi clienti/churn da Excel | Sì | No | Alta |
| OCR libretto + TCO/costo al km | Sì | Parziale (documenti, carburante) | Media-alta |
| Cisterne gasolio + accise | Sì | Parziale (rifornimenti) | Media |
| Calendario divieti mezzi pesanti | Sì | No | Media |
| App autista con navigazione + firma POD | In arrivo | Parziale (PWA, DDT) | Media |
| Import/export Excel/CSV | Sì | No | Media |
| Condivisione WhatsApp | Sì | No | Bassa-media |
| Container | Sì | No | Bassa (espansione spedizionieri) |

## 5. Cosa integrare (in ordine)

### P0 — differenzianti da fare subito

1. **Piano di carico + calcolatore**
   - MVP: inserimento colli/pallet, dimensioni/peso, mezzo, calcolo metri lineari, peso tassato, baricentro/assi, "quale mezzo basta?", piano stampabile.
   - Fase 2: vista 3D (three.js/react-three-fiber), rotazione colli, barre fermacarico, più consegne.
   - OCR packing list riusando il pattern AI di `lib/kyb/ai.ts` (Gemini structured output), sanitizzazione e nessun log dei file.
   - Aggancio a viaggi e preventivi: dal calcolatore al piano di carico, dal piano al viaggio.

2. **Preventivi + portale ordini cliente**
   - Pagina pubblica brandizzata per azienda (logo/colori), form ordine/preventivo, upload PDF, stati e tracking.
   - Registro preventivi con costo fornitore, prezzo, margine e storico modifiche.
   - Notifiche interne e link a viaggio/DDT.

3. **Ottimizzazione giri e costi viaggio**
   - Import indirizzi da testo/CSV/Excel, geocoding, ottimizzazione multi-tappa, orari di arrivo.
   - Costo viaggio: gasolio, pedaggi per classe, autista, pause; prezzo consigliato.
   - Riuso di Geotab per km/posizioni e del motore Smart Return per i match.

4. **Analisi clienti/churn**
   - Import Excel bolle/fatture, elaborazione client-side (come Stiva) per evitare trattamento dati lato server.
   - Alert clienti fermi/in calo/in crescita, fatturato e peso per cliente, confronto anno prima.
   - Forte valore commerciale, basso costo tecnico.

5. **OCR libretto + costo reale per mezzo**
   - Foto libretto, estrazione targa/portata/assi/Euro/revisione, creazione mezzo.
   - Costi per gomme/officina/tagliando/assicurazione, costo al km mese per mese.
   - Riuso di `Vehicle`, `VehicleDocument`, `FuelRecord`.

### P1 — completamento operativo

6. **Scadenze autisti/azienda + calendario divieti**
   - Estendere le scadenze mezzi ad autisti e azienda; digest email; calendario divieti con condivisione WhatsApp.
7. **Gasolio: cisterne e accise**
   - Cisterne/concalitri, rifornimenti interni/esterni, autonomia, alert consumi, prospetto accise trimestrale.
8. **App autista con navigazione e POD**
   - Navigazione tappa, foto/firma consegna, offline, scadenze e avvisi; estensione della PWA esistente.
9. **Import/export Excel/CSV**
   - Clienti, viaggi, bolle, mezzi; export dati completo; "compatibile con il gestionale che usi già".
10. **WhatsApp share**
    - Link di condivisione per tracking, DDT, divieti e riepiloghi; WhatsApp Business API solo se il volume lo giustifica.

### P2 — espansione

11. Piano di carico container per spedizionieri.
12. Posizione live lato cliente con ETA e stato consegne.
13. Benchmark costi/km e consumi per categoria mezzo.

## 6. Cosa non copiare

- **Prezzo 29/49 €**: Stiva è in prelancio e punta sul volume; Truck Radar ha costi (Geotab, AI, infrastruttura) e un posizionamento più ampio (network, marketplace, compliance). Non fare guerra sul prezzo: usa offerta design partner/prelancio e moduli, ma proteggi il margine.
- **"Lo usiamo ogni giorno"**: dirlo solo se vero e documentabile.
- **Dati del titolare "in aggiornamento"**: noi dobbiamo completare i dati societari (vedi `docs/PRODUCT_PLAN.md`, voce aperta).
- **Nessun contratto**: per il B2B può andare come leva commerciale, ma termini/DPA chiari restano necessari.
- **3D subito a tutti i costi**: validare prima con 2D/assi/stampa; il 3D completo è costoso e va giustificato dal feedback.

## 7. Lezioni di GTM/UX

- Copy concreta e numerica ("14 tappe, 299 km invece di 724", "0,94 €/km"), non elenchi di feature astratte.
- Screenshot e mockup reali, video breve, FAQ in fondo, CTA sticky su mobile.
- "Non devi cambiare il programma che usi già": import/export Excel come riduttore di attrito.
- Offerta di prelancio con scarsità reale (posti limitati) e prezzo bloccato.
- Onboarding con chiamata e attivazione con i mezzi del cliente.
- Trasparenza su dati/DPA/retention: è un argomento di vendita, non solo legale.
- Usare il design partner (azienda di famiglia) come caso studio con numeri reali, se autorizzato.

## 8. Note implementative

- Nuove tabelle via SQL raw idempotente in `scripts/ensure-raw-tables.ts` (Prisma migrate/db push non disponibile in locale).
- Nuove route API: `/api/load-plans`, `/api/quotes`, `/api/orders`, `/api/customer-portal`, `/api/analytics/customers`, `/api/vehicles/ocr`, `/api/fuel/tanks`, `/api/accise`, `/api/deadlines`, `/api/bans`.
- Nuove pagine dashboard: carico, preventivi, ordini, analisi clienti, costi mezzi, scadenze, gasolio/cisterne.
- Dipendenze da valutare: `three` + `@react-three/fiber` per il 3D; `xlsx` o `papaparse` per import/export; riuso di `leaflet` per mappe.
- OCR: riusare il pattern di `lib/kyb/ai.ts` (Gemini structured output), con sanitizzazione e nessun log di documenti.
- Privacy: per l'analisi bolle valutare elaborazione client-side; per OCR e mappe aggiornare DPA e retention.
