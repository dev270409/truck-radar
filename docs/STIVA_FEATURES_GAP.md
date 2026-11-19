# Stiva — analisi funzionalità e gap per Truck Radar

Analisi del 12/11/2026. Fonti: pagine pubbliche `stiva.cloud` (landing, privacy, termini), bundle applicativo `app.stiva.cloud/app.js` e API read-only dell'account fornito dall'utente (piano limitato). Nessun dato aziendale o personale è stato copiato in questo documento.

## 1. Piano osservato

Funzioni attive sull'account: `carico`, `viaggi`, `scadenze`, `tassato`, `giri`, `chat`, `gasolio`, `portale`, `preventivi`, `analisi`.
Funzioni disattivate dal piano: `autisti`, `costi`, `officina`, `bollettazione`, `fatturazione`, `cista`, `statistiche`, `backup`, `email automatiche`, `richieste`, `prove`.

Le funzioni disattivate sono comunque presenti nel bundle: l'analisi sotto le include perché sono parte del prodotto Stiva.

## 2. Mappa funzionale Stiva

### Operatività
- **Home**: KPI flotta, scadenze, gasolio, piani di carico, viaggi, primi passi, novità.
- **Mezzi**: anagrafica, targhe, categorie, portata, volume, assi, complessi (motrice+rimorchio), foto, libretto multi-pagina con OCR/IA, gestione documenti, costo mezzo.
- **Autisti**: elenco, scheda, accessi all'app, avvisi, firma, foto, giri assegnati, scadenze personali.
- **Viaggi**: creazione, archivio, medie autisti, scelte, import/lettura, collegamento a DDT e fatture.
- **Piani di carico**: piano 2D/3D, colli, misure, peso, baricentro, assi, stivaggio, container, più consegne, stampa, salvataggio, regole di carico.
- **Giri**: ottimizzazione, indirizzi da testo/email/Excel, geocoding, pedaggi, costi, giro dal vivo, giro abituale, salvataggio.
- **Calcolatore tassato**: peso tassato, volume, metri lineari, tariffa, prezzo, servizi.
- **Preventivi**: clienti, righe, prezzi, margine, allegati, lettura da file, registro eliminati, invio/accettazione.
- **Preventivi fornitori**: agenda, allegati, confronto costi.
- **Portale clienti**: ordini, preventivi pubblici, pagina brandizzata, clienti, persone, allegati, stato ordini.
- **Scadenze**: mezzi, autisti, azienda, voci configurabili, avvisi email, stato avvisi.
- **Divieti**: calendario divieti mezzi pesanti, anni, deroghe, avvisi.
- **Gasolio**: cisterne, movimenti, contalitri, consumi, prezzi, accise, export CSV.
- **Costi mezzi**: costi per voce, file allegati, panoramica, riepilogo, tagliandi, gasolio, categorie, ambiti, blocco mese.
- **Costi totali / centri di costo**: codici costo, mese, sblocco, profili.
- **Officina**: tagliandi, interventi, km, voci, costi, mezzi.
- **Tassato**: calcolatore e nuove regole tariffarie.
- **Analisi/statistiche**: analisi azienda, utente, export, medie autisti, attività.

### Documenti e amministrazione
- **Bollettazione**: DDT, borderò, elenchi, numerazione, clienti, contratti, impostazioni, stampate.
- **Fatturazione**: fatture, da bolla, XML FatturaPA, impostazioni, preparazione.
- **Clienti/rubrica**: anagrafica, contatti, agenda, importazione, abbinamento.
- **Spese**: spese aziendali, ricevute, export CSV per commercialista.
- **Abbonamento**: piani, periodi, pagamenti, fatturazione, credito, portale, disdetta, ricarica.
- **Pagamenti admin**: gestione pagamenti e aziende.
- **Backup**: riepilogo, backup, ripristino.
- **Email automatiche**: template, anteprima, prova, impostazioni per azienda.
- **Chat**: contatti, conversazioni, allegati, foto, non letti.
- **Assistenza**: ticket, categorie, annunci, destinatari, non letti.
- **Novità**: changelog in-app, amministrazione, presa visione.
- **Richieste**: richieste utente.
- **Prove in corso**: gestione trial.
- **Aziende**: multi-azienda/consorzio, demo.
- **Utenti**: utenti, ruoli, permessi, posti.
- **Impostazioni**: logo, intestazione, sedi, primi passi, avvisi, avvisi divieti, costi, giri, scadenze attive, app autisti, tassato.
- **App Stiva Meccanico**: accesso dedicato officina.
- **Push**: chiave, iscrizione web push.

## 3. Cosa ha già Truck Radar

- Multi-tenant, ruoli, KYC/KYB, abbonamenti Stripe, dashboard, notifiche.
- Mezzi, documenti, scadenze, autisti, viaggi, DDT, tracking, PWA autista.
- Geotab live e analytics, carburante, manutenzione, km.
- Marketplace, Smart Return, network, recensioni, badge, ESG, ispezioni, geofence, aree di sosta.
- Ops Suite appena aggiunta: piano di carico 2D/3D, preventivi, portale ordini, giri/costi, analisi clienti, OCR libretto, TCO, scadenze autisti/azienda, divieti, cisterne/accise, POD, import/export, benchmark.
- Self-hosted/Docker e licenza.

## 4. Gap prioritari

| Area Stiva | Stato Truck Radar | Priorità | Note |
|---|---|---|---|
| Bollettazione/DDT con numerazione e PDF | Mancante | P0 | Generare borderò/DDT da viaggi, numerazione, PDF, archivio. |
| Fatturazione elettronica FatturaPA/XML/SDI | Mancante | P0 | XML, numerazione, invio SDI, PDF, note di credito. |
| Clienti/rubrica con agenda e import | Parziale (portale ordini) | P0 | Anagrafica unica clienti, contatti, indirizzi, contratti. |
| Preventivi fornitori | Mancante | P1 | Confronto costi, agenda, allegati. |
| Officina completa | Parziale (manutenzione) | P1 | Interventi, km, voci, ricambi, costi, storico. |
| Costi totali/centri di costo | Parziale (VehicleCost) | P1 | Codici costo, profili, blocco mese, riepiloghi. |
| Spese aziendali + ricevute + CSV commercialista | Mancante | P1 | Upload ricevute, categorie, export. |
| Chat interna | Mancante | P1 | Contatti, conversazioni, allegati, non letti. |
| Assistenza/ticket | Mancante | P2 | Ticket, categorie, annunci, admin. |
| Email automatiche | Mancante | P1 | Template scadenze/preventivi/fatture, anteprima, prova. |
| Push web | Mancante | P2 | Iscrizione, chiave, notifiche. |
| Backup/ripristino | Mancante | P1 | Export completo, ripristino, log. |
| Statistiche/analisi avanzate | Parziale (analytics) | P1 | Analisi azienda/utente, export, medie autisti. |
| Multi-sede | Mancante | P1 | Sedi, magazzini, cisterne per sede. |
| Multi-azienda/consorzio | Mancante | P2 | Gestione gruppi, aziende collegate, ruoli. |
| App meccanico | Mancante | P2 | Accesso officina dedicato. |
| Novità/changelog in-app | Mancante | P2 | Comunicazioni e presa visione. |
| Richieste/trial gestiti | Parziale (demo-request) | P2 | Pipeline trial e richieste. |
| Firma/foto autista | Parziale (POD) | P1 | Firma, foto, accessi, avvisi, giri. |
| Libretto multi-pagina/foto/assi | Parziale (OCR) | P1 | Archivio pagine, foto, dati assi, complessi. |
| Giro dal vivo | Parziale (tracking) | P1 | Vista live con tappe e stato. |
| Giri abituali | Mancante | P2 | Template di giro ricorrenti. |
| Percorsi/pedaggi/matrice | Parziale (Nominatim) | P1 | Provider routing con pedaggi e matrice. |
| Import preventivi da file/OCR | Mancante | P1 | Lettura PDF/immagini e precompilazione. |
| Portale clienti completo | Parziale (ordini) | P1 | Storico, documenti, contratti, persone. |
| Backup e sicurezza dati | Mancante | P1 | Export, restore, retention. |

## 5. Backlog consigliato

### P0 — chiudere il ciclo documentale
1. **Bollettazione**: modello `Waybill`/`InvoiceDraft`, numerazione per azienda/anno, righe, PDF, collegamento a viaggi/DDT.
2. **Fatturazione elettronica**: XML FatturaPA, validazione, invio SDI (provider), PDF, note di credito, impostazioni IVA.
3. **Anagrafica clienti unica**: `Customer`, contatti, indirizzi, P.IVA/CF, condizioni pagamento, contratti, import CSV/agenda.
4. **Spese**: `Expense` con ricevuta, categoria, IVA, export CSV commercialista.

### P1 — operatività e controllo
5. **Officina**: interventi, km, voci, ricambi, costi, alert.
6. **Centri di costo**: codici, profili, blocco mese, riepiloghi.
7. **Email automatiche**: template, trigger, anteprima, test.
8. **Backup/export completo** e restore.
9. **Statistiche**: analisi azienda/utente, medie autisti, export.
10. **Multi-sede**: sedi, magazzini, cisterne.
11. **Portale clienti completo**: storico, documenti, contratti, persone.
12. **Routing provider** con pedaggi/matrice e giro dal vivo.

### P2 — collaboration e crescita
13. Chat interna, assistenza/ticket, push, novità in-app.
14. Multi-azienda/consorzio, app meccanico, richieste/trial.
15. Import preventivi da file/OCR, giri abituali.

## 6. Lezioni UI/UX da Stiva

- App scura, densa, con sidebar a gruppi e icone; landing chiara e molto concreta.
- Copy operativa: "Carica di più. Gira di meno. Non scordarti niente."
- Ogni funzione ha una schermata con dati reali, non una feature list astratta.
- Onboarding "primi passi", video per pagina, assistenza in-app.
- Prezzi modulari, prova senza carta, prezzo bloccato per i primi clienti.
- Trasparenza GDPR: DPA, sub-responsabili, retention, export dati.
- Attenzione: non copiare prezzi bassi, claim non verificabili o dati titolare placeholder.

## 7. Nota

L'account Stiva usato per l'analisi è un piano limitato: le funzioni disattivate sono state ricostruite dal bundle applicativo e dalle API, non testate con dati reali. Prima di implementare bollettazione/fatturazione verificare requisiti fiscali e provider SDI con il commercialista.
