# Panoramica e supervisione — ricerca UX per Admin, Autista e Vettore

Ricerca del 17/11/2026. Esclusi network, marketplace, subappalto e funzioni future: qui si parla solo di cosa deve vedere chi apre Truck Radar ogni giorno.

## 1. Principio base

Ogni ruolo apre il prodotto per rispondere a **una domanda**. La dashboard deve rispondere a quella domanda in meno di 3 secondi, senza filtri e senza scroll.

| Ruolo | Domanda | Cosa vede per primo |
|---|---|---|
| Admin / Titolare | “Cosa richiede la mia attenzione oggi?” | Eccezioni, soldi, conformità |
| Ufficio / Operazioni | “Cosa devo muovere adesso?” | Viaggi da assegnare, carichi, DDT/POD, ritardi |
| Autista | “Qual è la prossima cosa da fare?” | Viaggio corrente, prossima tappa, un pulsante grande |
| Vettore / Azienda cliente | “Come sta andando la mia flotta?” | Flotta, viaggi, costi, scadenze — solo la propria azienda |

## 2. Tre livelli di informazione

1. **Glance** — 4–5 numeri e un conteggio eccezioni. Visibile subito.
2. **Diagnosi** — trend, cause, confronto periodo precedente. Un click sotto.
3. **Dettaglio** — mezzi, viaggi, documenti, movimenti. Drill-down dal numero.

Regola: un numero senza confronto o senza azione non va in prima schermata.

## 3. Dashboard Admin / Titolare

### Struttura consigliata

1. **“Da fare oggi”** (eccezioni, in alto)
   - Viaggi da assegnare.
   - DDT/POD mancanti o consegne senza prova.
   - Scadenze mezzi/autisti/azienda scadute o entro 30 giorni.
   - Costi anomali: mezzi sopra la banda €/km, consumi fuori media, fatture da verificare.
   - Ogni riga: numero, motivo, tempo, link all’azione.

2. **Flotta in questo momento**
   - Disponibili / in viaggio / in manutenzione / non idonei.
   - Mezzi fermi da più giorni.
   - Ultima posizione con età del dato (“2 min fa”, “3 h fa”).

3. **Soldi della settimana/mese**
   - Margine per viaggio (non solo fatturato).
   - Costo/km medio e mezzi fuori banda.
   - Carburante e accise.
   - Preventivi in scadenza e ordini da confermare.

4. **Conformità**
   - Scadenze critiche con proprietario e azione.
   - KYC/KYB e documenti aziendali.
   - Blocchi mezzi/autisti non idonei.

5. **Azioni rapide**
   - Nuovo viaggio, piano di carico, preventivo, ordine, reset password utente.

### Cosa togliere dalla prima schermata

- Mappa grande senza eccezioni.
- Grafici decorativi.
- Moduli “in arrivo” o network (finché non sono attivi).
- Ogni KPI dello stesso peso: il colore va solo a ciò che è rotto o a rischio.

## 4. Dashboard Ufficio / Operazioni

- **Bacheca viaggi**: da assegnare, assegnati, in corso, in ritardo, completati.
- **Carico**: piani da preparare, colli senza piano, mezzi non compatibili.
- **Documenti**: DDT da caricare, POD mancanti, ordini da confermare.
- **Clienti**: richieste dal portale, preventivi da inviare, clienti fermi.
- **Scadenze**: solo quelle che bloccano partenze o consegne.
- Filtri per sede, cliente, mezzo, autista; ricerca per targa/email/viaggio.

## 5. Dashboard Autista (mobile-first)

### Home
- **Viaggio corrente** grande: cliente, ritiro, consegna, orario.
- **Prossima tappa** con indirizzo, finestra, note di accesso.
- **Un pulsante grande** con il prossimo passo: “Parti”, “Arrivato”, “Consegna”, “Firma”.
- Sotto: resto della giornata, documenti, scadenze personali, problema mezzo.

### Flusso
1. **Carica la giornata** — viaggi, indirizzi e documenti scaricati prima di partire.
2. **In viaggio** — un tap apre Google Maps/Waze; lo stato cambia da solo.
3. **Arrivato** — registra ora e posizione, mostra note e contatti.
4. **Consegna** — foto, firma, nome destinatario, eventuale parziale.
5. **Eccezione** — motivo da lista, foto, ufficio avvisato subito.
6. **Fine turno** — riepilogo, invii pendenti, sincronizzazione.

### Regole mobile
- Tap target ≥ 48 px, testo leggibile al sole, contrasto alto.
- Una sola azione primaria per schermata.
- Niente tastiera se non indispensabile.
- Offline-first: la consegna non si perde senza segnale.
- Non chiedere login ogni volta: pin/biometria su dispositivo aziendale.
- Mostrare chiaramente “salvato sul telefono, invio appena c’è rete”.

## 6. Dashboard Vettore / Azienda cliente

Il vettore è l’azienda che usa Truck Radar per la propria flotta. Non deve vedere il network finché non è attivo.

- **Panoramica**: viaggi attivi, mezzi disponibili, scadenze, margine.
- **Viaggi**: assegnazione, stato, DDT/POD, tracking.
- **Flotta**: mezzi, documenti, manutenzione, costi.
- **Clienti**: preventivi, ordini, portale.
- **Scadenze**: mezzi, autisti, azienda.
- **Nessun modulo network/marketplace** nella Home finché non c’è una sezione dedicata e attiva.

## 7. Alert e priorità

- **Critico**: blocca una partenza o è un obbligo di legge. Azione entro la giornata.
- **Alto**: rischio cliente o margine. Azione entro il turno.
- **Medio**: da pianificare nei prossimi giorni.
- **Basso**: informativo, non in prima schermata.

Ogni alert deve avere:
- oggetto (mezzo, viaggio, autista, cliente);
- motivo in una riga;
- tempo di apertura;
- azione successiva (chiama, assegna, riprogramma, carica documento);
- proprietario.

Senza questi cinque campi, l’alert è solo un numero e verrà ignorato.

## 8. Cosa implementare in Truck Radar

### Fase 1 — veloce
1. Rinominare la dashboard in **“Oggi”** e mettere in testa un pannello **“Da fare”** con 4 contatori e link.
2. Aggiungere “ultimo aggiornamento” a flotta live e costi.
3. Ruotare la Home driver: viaggio corrente + prossima tappa + un solo pulsante primario.
4. Nascondere i moduli SOON/network dalla Home admin finché non attivi.
5. Coerenza mobile: card al posto delle tabelle per utenti, costi, accise, preventivi, ordini, analisi clienti.

### Fase 2 — struttura
6. Modello `Alert` aggregato con severità, owner, azione e link.
7. Viste role-based: Admin, Ufficio, Autista, Vettore.
8. Drill-down da ogni KPI al record che lo genera.
9. Freschezza dati e fonte su ogni numero (Geotab, viaggi, carburante).

### Fase 3 — supervisione
10. “Mezzi fuori banda” (€/km, consumi, fermo).
11. “Clienti a rischio” collegato all’analisi clienti.
12. “Viaggi senza POD/DDT” e blocco fatturazione.
13. Cruscotto conformità con scadenze e proprietario.

## 9. Fonti

- Fleetistics — fleet reporting dashboards: https://fleetistics.com/fleet-reporting-dashboards
- Jubayer — fleet management dashboard: https://maniruzzamanjubayer.com/blog/fleet-management-dashboard
- Volpis — UX flotte e ruoli: https://volpis.com/blog/user-experience-design-of-fleet-management-apps
- Heavy Vehicle Inspection — dashboard KPI e ruoli: https://heavyvehicleinspection.com/blog/post/modern-fleet-management-ui-ux-dashboard-kpis-guide
- Logivo — TMS dashboard planning/execution/settlement: https://logivo.ai/blog/transport-management-system-dashboard
- QuantumByte — TMS dashboard: https://quantumbyte.ai/articles/transport-management-system-dashboard
- MonkMaze — driver task flow: https://monkmaze.com/insights/driver-field-worker-task-flow
- APFoodz — driver app: https://apfoodz.com/resources/driver-mobile-apps-what-good-ones-do
- SummationWorks — driver apps: https://summationworks.com/blog/building-driver-logistics-apps
- Fera Tech — last-mile driver app: https://fera-tech.com/blog/must-have-features-for-a-last-mile-delivery-app
