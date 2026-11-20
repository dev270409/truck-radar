# Stiva — audit logiche per pagina e decisioni Truck Radar

Audit live del 20/11/2026 sull'account Stiva in prova (7 giorni rimasti, 2.000 crediti). Sono state visitate 23 route applicative e aperte le guide video di ogni pagina. Nessun asset, testo o dato Stiva è stato copiato in Truck Radar.

## 1. Cosa fa Stiva davvero

- Tutorial contestuali: ogni pagina complessa ha un pulsante `Come si usa` con durata (20 s–3 min 15 s) che apre un video MP4 con poster e sottotitoli VTT.
- Trial visibile: banner persistente con giorni rimasti, funzioni attive e prezzo dopo la prova.
- Assistenza: chat/ticket in-app, non una pagina FAQ. Il video tutorial resta accessibile dalla pagina, non viene spostato in una FAQ.
- Empty state operativi: ogni pagina vuota spiega il prossimo passo e offre una sola azione principale.
- Dati sempre contestuali: filtri, contatori per stato, export CSV, stampa PDF, condivisione avvisi.

## 2. Inventario tutorial Stiva

| Pagina | Titolo video | Durata |
|---|---|---|
| Piano di carico | Come si usa il Piano di carico | 2 min |
| Calcolatore | Come si usa il Calcolatore | 3 min |
| Viaggi | Come si usa Viaggi e costi | 3 min |
| Archivio viaggi | Come si usa l'Archivio viaggi | 2 min 10 s |
| Piani salvati | Come si usano i Piani salvati | 20 s |
| Analisi spedizioni | Come si usa Analisi spedizioni | 3 min 15 s |
| Ottimizza giro | Come si usa Ottimizza giro | 1 min |
| Scadenze | Come si usa Scadenze | 2 min 20 s |
| Divieti | Come si usa Divieti | 1 min 25 s |
| Mezzi | Come si usa Mezzi | 1 min 40 s |
| Utenti | Aggiungi i tuoi colleghi | 45 s |
| Impostazioni | Logo e intestazione | 35 s |

Le altre pagine (Home, Preventivi, Costi, Anagrafica, Gasolio, Abbonamento, Assistenza, Account) non hanno tutorial.

## 3. Logiche per pagina: adotta / scarta

### Home
- **Adotta**: blocco `Da fare` con 4 azioni e link diretto; avviso quando manca un canale per gli alert (es. email scadenze); KPI ultimi 7 giorni; accesso a guide e assistenza.
- **Adatta**: il banner trial deve essere più compatto e non ripetere il prezzo in ogni pagina.
- **Scarta**: troppi widget simultanei e duplicazione tra Home e sezioni operative.

### Piano di carico
- **Adotta**: tutorial contestuale; risultato sempre visibile accanto agli input; salvataggio con nome; stampa per magazzino; passaggio a preventivo.
- **Adatta**: mostrare solo i parametri che cambiano il risultato (assi, baricentro, consegne multiple) quando il mezzo li richiede.
- **Scarta**: eccesso di opzioni di stivaggio manuale nella prima schermata.

### Calcolatore / Preventivi
- **Adotta**: prezzo e costo affiancati; margine immediato; importi da file; esportazione; agenda clienti/fornitori.
- **Adatta**: un solo flusso `preventivo -> ordine`, senza duplicare agenda e tab.
- **Scarta**: registro eliminati e “preventivi fornitori” come voci di primo livello: meglio dentro il preventivo.

### Viaggi / Archivio / Piani salvati
- **Adotta**: filtri per stato; viste `Da confermare`, `In corso`, `Da chiudere`; costo effettivo e margine; esportazione CSV; piani salvati come libreria riutilizzabile.
- **Adatta**: unire archivio e viaggi in un'unica pagina con filtri, come già fatto in Truck Radar.
- **Scarta**: due voci di menu separate per viaggi e archivio.

### Costi
- **Adotta**: categorie di costo (mezzi, personale viaggiante/non viaggiante, servizi logistici, azienda); riepilogo mensile; dettaglio per voce; export.
- **Adatta**: usare le stesse categorie nel costo analitico del viaggio, senza un secondo database costi.
- **Scarta**: blocco mese e profili di sblocco nella prima versione.

### Anagrafica / Indirizzi giri / Utenti
- **Adotta**: anagrafica unica clienti/fornitori; indirizzi salvati dai giri; ruoli e permessi; password temporanea e reset.
- **Adatta**: l'indirizzo deve poter nascere da un viaggio o da un giro e restare collegato all'anagrafica.
- **Scarta**: tre rubriche separate (clienti, fornitori, indirizzi) con dati duplicati.

### Ottimizza giro / Portale ordini
- **Adotta**: import da PDF/foto/Excel e incolla indirizzi; giri abituali; ordine migliore delle tappe; portale clienti con stato ordine.
- **Adatta**: il portale deve riusare ordini e preventivi esistenti, non creare un secondo ciclo.
- **Scarta**: “Strumenti beta” come etichetta permanente nel menu.

### Gasolio / Scadenze / Divieti / Mezzi
- **Adotta**: rifornimenti con odometro e pieno; consumi reali; avvisi email; calendario divieti con condivisione; OCR libretto multi-pagina; complessi motrice+rimorchio; scadenze configurabili.
- **Adatta**: unificare scadenze e divieti in una sola area con tab, come già fatto.
- **Scarta**: contalitri e rimborso accise nella prima versione.

### Abbonamento / Assistenza / Account / Impostazioni
- **Adotta**: riepilogo trial e prossimo rinnovo; metodi di pagamento; crediti per lettura OCR; ticket e richieste; preferenze notifiche; logo/intestazione PDF; sedi.
- **Adatta**: niente crediti se non c'è un costo variabile reale; ticket solo se presidiati.
- **Scarta**: bonifico manuale e listino 29 €/mese: non sono il posizionamento Truck Radar.

## 4. Decisione implementata

La logica più trasferibile è il **tutorial contestuale + centro assistenza permanente**:

- pulsante `Come si usa` nella topbar, che cambia in base alla pagina;
- video MP4 con poster e sottotitoli VTT, prodotti da schermate Truck Radar;
- banner trial compatto con giorni rimasti e link alle guide;
- `/dashboard/assistenza` con libreria video, FAQ e contatto;
- guide sempre disponibili, anche dopo la prova: il trial le mette in evidenza, non le nasconde.

Non è stato copiato il modello Stiva di chat/ticket perché Truck Radar non ha ancora un presidio di assistenza dedicato. Il canale attuale resta la pagina Contatti.

## 5. Prossimi candidati

1. Empty state con una sola azione per ogni pagina (P0, basso costo).
2. Anagrafica unica clienti/fornitori e indirizzi (P0, sblocca preventivi e giri).
3. Scadenze configurabili con avvisi email (P1).
4. OCR libretto multi-pagina e complessi veicolari (P1).
5. Portale ordini collegato a preventivi e viaggi (P1).
6. Crediti OCR solo se emerge un costo provider reale (P2).
