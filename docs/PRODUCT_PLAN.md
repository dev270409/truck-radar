# Truck Radar — Piano verso il prodotto finale

Documento operativo di lavoro. Elenca cosa va sistemato/completato, con priorità e regole.
Legenda: `[ ]` da fare · `[x]` fatto · `[~]` in corso · `[n]` non loppabile (input esterno).

Regole guida
- Non cancellare codice. Le funzioni non ancora attive restano nel repository ma diventano "non disponibili" nella UI, con badge **SOON** e pagina dati d'esempio "In arrivo".
- Non inventare dati. Se un dato non è certo (es. km a vuoto) si dichiara esplicitamente; si possono fare stime solo se chiaramente etichettate come tali.
- Ogni sezione esterna (Geotab, ecc.) resta di sola lettura finché non esiste una mappatura verificata.
- Ogni modifica chiude con `tsc`, `build`, e2e e deploy verificato live.

## 1. Abbonamento e pricing
- [x] Trial unico portato a **21 giorni** ovunque (codice, DB, marketing, legale).
- [x] Piano **BASE 59€/mese** (era 99€); PRO invariato.
- [x] Creato Price Stripe BASE 59€ (`price_1UL0jmDU9CV3V30w9su6sv3m`) e aggiornata `STRIPE_PRICE_ID_BASE` (Vercel Production+Preview, `.env.local`).
- [x] Allineare testi: homepage, `/prezzi`, FAQ, abbonamenti.
- [x] Fix corruzione caratteri accentati (mojibake `Â`/`Ã`) su 6 file di UI: simboli `·`, `§`, `m³`, `CO₂`, `è/à` ripristinati.

## 2. Gestione flotta / Mezzi
- [x] Deduplica automatica per targa con i dispositivi Geotab.
- [x] Rendere un mezzo salvato **modificabile** (modifica + eliminazione) dalla UI e API.
- [ ] Report per singolo mezzo arricchito con telemetria Geotab (km, stato).

## 3. Dashboard Panoramica
- [x] Metric-card con dati reali e aggiornati (flotta, scadenze, abbonamento, verifica).
- [x] Collegamento dati Geotab live (posizioni, viaggi, km).
- [ ] Pannello "attività recenti" unificato (viaggi, DDT, scadenze).

## 4. Carburante
- [x] Stima consumi/€-per-km quando i rifornimenti non sono registrati, etichettata come stima.
- [x] Nessuna stima dei km a vuoto (dato non stimabile in modo affidabile).

## 5. Sezioni SOON (non disponibili, codice conservato)
Da marcare **SOON** con pagina dati d'esempio "In arrivo", senza rimuovere nulla:
- [x] Incasso rapido (Stripe Connect)
- [x] Borsa Carichi (marketplace)
- [x] Smart Return
- [x] Network
- [x] Aree di Sosta
- [x] Check-list Ispezioni
- [x] Aree e Geofence
- [x] ESG / Report sostenibilità
- [x] Report e impostazioni (parte export avanzata)
- [x] Telemetria e diagnostica motore
- [x] Dashcam AI
- [x] Fleet Radar AI
- [x] Integrazioni senza adapter reale (TMS, ERP, Tachigrafo, Carburante, GPS generico)

## 6. Integrazione Geotab
- [x] Autenticazione reale (database + utente + password).
- [x] Lettura flotta live con refresh automatico bounded + pulsante manuale.
- [x] Deduplica targa e driver.
- [x] Analytics storiche viaggi/km (fonte MyGeotab Trip).
- [ ] [n] Import ufficiale dei mezzi Geotab in `Vehicle` (serve mappatura categoria/portata/volume approvata).
- [ ] [n] Km a vuoto reali (serve dato operativo/carichi).

## 7. Legale / privacy
- [x] Cookie policy reale, fix refuso privacy.
- [x] **Account demo bloccati in produzione**: il login per email `@demo.com` è rifiutato quando `NODE_ENV=production` (override esplicito `ALLOW_DEMO_LOGIN=true`). Verificato: `admin@demo.com/Demo123!` accedeva prima via API di produzione sul tenant demo scrivibile; ora bloccato. Gli account restano nel DB per gli e2e locali.
- [ ] Verifica affermazioni pubblicate (da validare legalmente / documentare):
  - **Cifratura "in transito e a riposo"**: VERO — TLS in transito; Supabase e UploadThing cifrano a riposo; credenziali integrazioni AES-256-GCM. Documentare nei record di sicurezza.
  - **"Dati ospitati in Unione Europea"**: PARZIALE — DB Supabase in UE (`eu-west-1`), ma UploadThing è su `sea1` (USA) e Gemini usa endpoint globale senza garanzia di residenza. Da correggere o migrare (scelta A/B pendente).
  - **"Conforme al GDPR"**: generico — definire ruoli titolare/responsabile e DPA con i fornitori; documentare.
  - **Tracking conducenti art. 4 L.300/70**: l'informativa `/informativa-autisti` si dichiara "bozza da validare legalmente": NON pronta, da validare prima del go-live.
- [ ] [n] Dati societari del Titolare (ragione sociale, sede, P.IVA, PEC, email).
- [ ] [n] Allineare "dati in UE" alla regione reale dei fornitori (decisione A/B).

## 8. Backlog tecnico
- [ ] Rate limit distribuito (oggi in-memory).
- [ ] Migrazione completa pagine interne ai design token (light mode).
- [ ] [n] Rotazione password DB Supabase.
