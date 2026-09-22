# TRUCK RADAR

## Paper di lancio, distribuzione web e onboarding verificato

**Stato:** piano successivo al completamento del Mega Paper Master — aggiornato con verifica del codice (2026-09-21)

Truck Radar è il Transport Operating System per aziende di trasporto: gestione di mezzi, autisti e viaggi; documenti e DDT; dati, network, marketplace e Smart Return.

## 1. Esito del controllo del Mega Paper Master

La checklist funzionale attuale è completa: non risultano task `[ ]` o `[FAILED]`.

Sono già disponibili account aziendale e ruoli, multi-tenancy, mezzi, autisti con credenziali, viaggi, PWA autista, DDT, documenti, tracking, integrazioni, abbonamenti, verifica account, marketplace, subappalto, Smart Return, analytics, reputazione, community ed ESG.

### 1.1 Stato implementazione verificato a oggi (codice + repo)

| Voce | Stato |
| --- | --- |
| Landing pubblica Truck Radar (obiettivo, valore, network verificato, CTA) | ✔ `app/page.tsx` |
| Rinominazione LogiFlow → Truck Radar (metadata, manifest, login, landing) | ✔ con residui in 5 file (riepilogo in §8.1) |
| Registrazione aziendale multi-step + KYC con upload reale (UploadThing) | ✔ wizard 4 step; `app/api/register/route.ts` rifiuta KYC incomplete |
| Blocco fallback mock in produzione (Stripe e cifratura) | ✔ `lib/stripe.ts`, `lib/crypto.ts` lanciano senza chiavi valide in produzione |
| Repository GitHub privato e remote | ✔ `github.com/dev270409/truck-radar` (commit `cb28637`, push eseguito) |
| Suite e2e di regressione + build production | ✔ `npx tsc --noEmit` e `npm run build` puliti; regressione e2e 14/14 verde |
| Incasso rapido "In arrivo" (embedded finance Stripe Connect) | ✔ UI + lead gen + DB predisposto, attivazione al §9 (§8.4) |

Prima di rendere il servizio pubblico restano comunque i seguenti **gate di produzione**:

1. Sostituire integrazioni GPS/TMS/ERP simulate con provider realmente contrattualizzati e testati.
2. Configurare Stripe live, webhook firmati e processo di riconciliazione operativa dei pagamenti/payout.
3. Definire il processo KYC con provider o revisione manuale, SLA, dati richiesti e procedura di rifiuto/escalation.
4. Far validare privacy, condizioni d'uso, marketplace/subappalto, tracking dei lavoratori e conservazione dei documenti da consulenti legali competenti.
5. Configurare dominio, posta transazionale, monitoraggio, backup, gestione incidenti e rotazione delle credenziali.

Questi punti non modificano il core prodotto: sono la condizione per offrire Truck Radar in produzione in modo affidabile.

## 2. Architettura pubblica

```text
truckradar.it                 → landing pubblica e acquisizione lead
app.truckradar.it             → applicazione autenticata
api.truckradar.it             → opzionale: API pubbliche/versionate in futuro

Landing → registrazione azienda → onboarding → KYC → trial → account verificato → Network
```

La landing deve essere separata dall'app operativa: comunica il valore, raccoglie interesse e accompagna l'impresa nel percorso di registrazione; non deve esporre dati, dashboard o funzioni del network.

## 2.1 Principio: Truck Radar orchestra, non sostituisce i provider regolamentati

Truck Radar conserva soltanto i dati minimi necessari per erogare il servizio e la decisione applicativa di accesso al Network. Tutto ciò che richiede infrastruttura specialistica, verifica documentale, gestione di denaro, invio massivo, consenso o sicurezza operativa viene delegato tramite API/webhook a fornitori con contratti, SLA e accordi sul trattamento dati.

| Ambito | Responsabilità Truck Radar | Da delegare |
| --- | --- | --- |
| Hosting e CDN | Codice e configurazione dell'app | Vercel o cloud equivalente |
| Database e backup | Modello dati e permessi tenant | Supabase managed Postgres/storage |
| Login e account | Ruoli e accesso ai tenant | Provider identity (es. Clerk/Auth0) con MFA, reset e verifica email |
| Documenti KYC persona | Collegare esito e gestire l'accesso | Stripe Identity o provider KYC equivalente |
| Visura e verifica impresa | Confrontare esito con la richiesta | Provider di business verification / fonte camerale autorizzata |
| Pagamenti e payout | Stato dell'ordine/commissione nel prodotto | Stripe Billing + Stripe Connect; nessuna gestione diretta di carte o IBAN sensibili |
| Email | Template e trigger di business | Resend/Postmark o provider transazionale equivalente |
| File e scansione | Riferimento al documento e retention | Object storage/upload provider + antimalware gestito |
| Errori, uptime e audit tecnico | Risoluzione prodotto | Sentry e servizio uptime/alerting |
| Cookie e consenso | Scelte UX e policy | CMP conforme, con registro del consenso |

Non inviare documenti di identità, numeri carta o credenziali API a strumenti di analytics, log applicativi o assistenza. I webhook devono essere firmati, verificati lato server e idempotenti.

## 3. Landing page Truck Radar

### Obiettivo

Convertire titolari e responsabili operativi di aziende di trasporto in registrazioni aziendali qualificate, non semplici iscritti generici.

### Struttura proposta

1. **Hero** — “Meno chilometri a vuoto. Più controllo su flotta, viaggi e margini.” CTA primaria: `Inizia la prova per la tua azienda`.
2. **Problema** — strumenti frammentati: fogli, WhatsApp, GPS, documenti e borse carichi scollegati.
3. **Soluzione** — tre blocchi: Gestisci, Collega, Trova opportunità.
4. **Flusso operativo** — Mezzi + Autisti + Viaggi → DDT/tracking → dati → Smart Return/Network.
5. **Vantaggi misurabili** — documenti più rapidi, visibilità dei margini, riduzione potenziale dei km a vuoto. Nessuna promessa economica non dimostrabile.
6. **Come funziona il Network** — accesso solo alle aziende verificate; il gestionale resta utilizzabile senza integrazioni esterne.
7. **Sicurezza e verifica** — account aziendale, visura/documenti, controlli e protezione dei dati.
8. **Piani / trial** — periodo di prova e richiesta demo; prezzi e condizioni devono essere pubblicati solo dopo definizione commerciale e fiscale.
9. **FAQ** — hardware-agnostic, chi può accedere, dati richiesti, cosa serve per essere verificati, supporto.
10. **CTA finale** — `Crea l'account aziendale` e alternativa `Richiedi una demo`.
11. **Footer legale** — privacy policy, cookie policy, termini di servizio, contatti, ragione sociale e informazioni societarie.

### Principi UX

- Una CTA principale; la demo è secondaria.
- Linguaggio concreto per imprenditori del trasporto, non promesse “AI” generiche.
- Il KYC viene spiegato prima di richiederlo, con motivazione: proteggere il network e i subappalti.
- Il visitatore può esplorare il prodotto senza lasciare dati; la registrazione è richiesta solo quando avvia il trial.

## 4. Onboarding aziendale e KYC

### Fase A — Registrazione account

L'amministratore inserisce nome, cognome, email professionale, password e consenso ai termini. Verifica dell'email obbligatoria prima dell'accesso operativo.

### Fase B — Profilo dell'azienda

Ragione sociale, partita IVA/codice fiscale, sede legale, PEC, telefono, settore e ruolo dell'amministratore. Validare sintassi e partita IVA; non dichiarare l'azienda verificata a questo stadio.

### Fase C — Avvio trial

L'azienda può configurare flotta, team e viaggi. Le funzioni operative non devono dipendere dal KYC, in accordo con il Mega Paper.

### Fase D — Richiesta di verifica

Per accesso a Network, Marketplace e subappalto l'admin carica:

- visura camerale aggiornata, preferibilmente verificata tramite una fonte camerale/provider autorizzato e non solo letta manualmente;
- documento dell'amministratore o del legale rappresentante, raccolto tramite un flusso KYC esterno anziché caricato e valutato direttamente da Truck Radar;
- eventuale delega, se chi presenta la domanda non è il legale rappresentante;
- dati bancari solo se e quando richiesti per payout, usando un provider idoneo;
- dichiarazioni richieste da termini e policy del servizio.

L'interfaccia deve mostrare stato, documenti mancanti, motivazione del rifiuto e possibilità di reinvio. Nessun dato KYC deve apparire nel profilo pubblico.

### Fase E — Decisione KYC

Stati minimi: `BOZZA`, `IN_ATTESA`, `IN_REVISIONE`, `VERIFICATO`, `RIFIUTATO`, `SCADUTO`.

Il provider restituisce un esito verificabile via webhook; Truck Radar conserva il riferimento della verifica e non il materiale identitario quando non necessario. Un operatore autorizzato interviene solo per eccezioni, controlla la coerenza della visura/azienda e registra decisione, data, motivazione e audit log. La verifica deve avere scadenza e riesame; un badge pubblico mostra solo “Azienda verificata”.

## 5. Roadmap di implementazione

### Sprint 1 — Brand e landing

- Rinominare prodotto, metadata, manifest PWA, logo, testi email e titoli da LogiFlow a Truck Radar.
- Creare landing responsive e pagine legali in `truckradar.it`.
- Collegare CTA alla registrazione aziendale e al form demo.
- Aggiungere analytics privacy-aware e tracciamento conversione solo dopo consenso cookie dove necessario.

### Sprint 2 — Onboarding e KYC robusto

- Verifica email e recupero password.
- Wizard aziendale salvabile in bozza.
- Integrare un provider identity/KYC per il legale rappresentante; Stripe Identity, ad esempio, usa sessioni di verifica ospitate e può restituire gli esiti via webhook. Non archiviare URL o secret temporanei.
- Integrare un provider di business verification/visure autorizzato per la verifica dell'impresa; mantenere solo l'esito, i riferimenti e il minimo set di attributi necessario.
- Usare upload protetto solo per i documenti che il provider non può raccogliere, con antivirus gestito, tipi/dimensioni limitati e retention automatica.
- Backoffice per eccezioni con assegnazione, SLA, rifiuto motivato, audit log e notifiche; mai per trattare indiscriminatamente documenti identitari.

### Sprint 3 — Hardening di produzione

- Configurare Supabase production, policy di backup, restore testato e segreti separati per ambiente.
- Configurare UploadThing/storage production, domini consentiti e limiti upload.
- Configurare Stripe Billing/Connect/Identity live e webhook verificati; eliminare qualunque fallback di chiavi mock dalla produzione.
- Integrare un provider identity per MFA, verifica email, inviti autista e reset password; usare un provider email transazionale per le notifiche.
- Aggiungere rate limit, Sentry/error tracking, logging strutturato con redazione dei dati sensibili, alert uptime e audit degli accessi admin.

### Sprint 4 — Deploy controllato

- Pubblicare preview per ogni pull request e un ambiente staging separato.
- Eseguire smoke test: registrazione, email, KYC, login admin/autista, upload, viaggio, DDT e webhook Stripe.
- Deploy iniziale con una Design Partner, metriche e canale supporto.
- Solo dopo esito positivo, aprire le registrazioni dalla landing.

## 6. Configurazione del deploy

Provider suggeriti, da confermare in base a costi e requisiti: Vercel per Next.js, Supabase per Postgres/Auth storage già adottato, UploadThing per upload e Stripe per pagamenti.

Variabili minime per ambiente:

- `DATABASE_URL` e credenziali Supabase production;
- `AUTH_SECRET`, `AUTH_URL` e URL pubblici Truck Radar;
- chiavi Stripe live e `STRIPE_WEBHOOK_SECRET`;
- chiavi UploadThing;
- chiave di cifratura distinta per le credenziali delle integrazioni;
- provider email e mittente `noreply@truckradar.it`;
- DSN error monitoring.

Mai inserire segreti nel repository, nei log, nei file client o in schermate amministrative.

## 7. Criteri di go-live

Il lancio è autorizzato solo se:

- dominio HTTPS, redirect e cookie sicuri funzionano;
- backup e restore database sono stati provati;
- tutti i flussi critici passano in staging;
- email di verifica/reset/invito sono consegnate;
- accesso tenant e autorizzazioni sono testati con almeno due aziende;
- documenti KYC restano privati e accessibili solo agli operatori autorizzati;
- Stripe live e webhook sono verificati oppure i pagamenti sono temporaneamente disabilitati;
- testi legali e procedimento di assistenza sono pubblicati;
- il Design Partner ha approvato il pilot.

## 8. Metriche del primo pilot

- aziende registrate e aziende che completano onboarding;
- tempo di completamento KYC e tasso di approvazione;
- mezzi/autisti/viaggi creati per azienda;
- DDT caricati e tempo dalla consegna alla disponibilità del documento;
- km a vuoto e opportunità Smart Return;
- attivazioni Network, match e subappalti;
- errori tecnici, ticket e tempo di risposta supporto.

## 8.1 Lavori che NON richiedono account esterni (pronti da fare)

Attività preparatorie che si possono implementare subito, senza dipendere da credenziali:

1. Rimuovere il riquadro "Credenziali Demo" dalla pagina login (`app/(auth)/login/page.tsx`) e gestire l'accesso demo solo via flag di ambiente. ✔ fatto: riquadro condizionato da `NEXT_PUBLIC_SHOW_DEMO_CREDS=true`, nascosto in produzione.
2. Ripulire i residui del vecchio brand. ✔ fatto: nessun riferimento "LogiFlow" residuo nel codice (layout, economia, seed, ensure-raw-tables, README).
3. Creare le pagine legali placeholder in `truckradar.it` (`privacy`, `termini`, `cookie`) collegate dal footer della landing, da completare con i consulenti. ✔ fatto: `app/privacy`, `app/termini`, `app/cookie` + link nei footer; testi da validare legalmente.
4. Definire il flusso dati KYC interno (schema) per collegare poi gli esiti dei provider: stato, riferimento verifica, motivazione rifiuto, scadenza/riesame, audit — senza mai salvare documenti identitari non necessari. ✔ fatto: `docs/KYC_PROVIDER_SCHEMA.md` definisce modello dati (`KycVerification`), flusso, mapping eventi e vincoli.
5. Apporre `rate limit` e logging strutturato con redazione dei dati sensibili sui route handler critici (auth, register, KYC, webhook). ✔ fatto: `lib/rate-limit.ts` (in-memory, chiave IP+scope) su register (10/min) e login (30/min per email); `lib/safe-log.ts` con `redact()` e `safeLog()` sostituisce i log grezzi nel route register e nei webhook Stripe.
6. Preparare il webhook KYC centralizzato per gli esiti dei provider (Stripe Identity e visure). ✔ fatto: `app/api/webhooks/kyc/route.ts` (boilerplate: rate limit 60/min, validazione tipo/stato, firma richiesta in produzione se chiave configurata, mapping su `KycVerification` da attivare in §9); smoke test verde su dev.

## 8.2 Check manuale del codice (punto della situazione)

- Gestione core e funzioni operative: **complete** (checklist `.opencode_tasks.md` tutta `[x]`).
- Regressione e2e modulo 2: **14/14 script verdi** (13 esistenti + `e2e-stripe-lead` per l'incasso rapido "In arrivo") dopo la correzione di un test DDT fragile legato all'accumulo di dati demo (verifica su viaggio dell'autista, non più sul primo viaggio in lista).
- Landings, brand e onboard: **fatte**; pulizia residui fatta (§8.1 completato).
- Integrazione esterne: **nessuna attiva** (GPS/TMS simulate, Stripe in modalità test/mock, nessun provider identity, email o monitoring).
- Sicurezza produzione: **pronta nei punti chiave** (hardening in `lib/stripe.ts` e `lib/crypto.ts`, rate limit + log redatti su register/login/webhook, webhook KYC boilerplate pronto), ma mancano legali validati giuridicamente, CMP e backoffice KYC reale: i 6 punti §8.1 risultano completati.
- Deploy: **repository pronto, nessun progetto Vercel/dominio/Supabase production ancora configurato**.

## 8.3 Punto della situazione verso il committente — aggiornamenti attesi

Il committente ha confermato: nessun account esterno attivato al momento. Tutti i lavori che non richiedono account esterni (§8.1) sono completati e verificati (landing pubblica, cerca-un-vettore, pagine legali, demo creds sotto flag, KYC schema, webhook KYC boilerplate, rate limit + log redatti). Il prossimo giro di feedback riguarderà cosa cambiare, migliorare o togliere nel prodotto; a quello segue l'attivazione progressiva dei provider in ordine di dipendenza (vedi §2.1 e roadmap §5), che richiede le credenziali del committente e non può essere completata dall'agente in autonomia.

## 8.4 Feedback del committente — incasso rapido (Stripe Connect) e logo sui camion

### Incasso rapido / anticipo fatture (borsa carichi)

Il problema dei pagamenti a 60/90 giorni sulla borsa carichi viene risolto con **embedded finance**: fattoring/anticipo fatture tramite partner autorizzati, senza che Truck Radar tocchi mai i fondi. Decisione del committente: **Stripe Connect** con commissione fissa **1%** per transazione, split automatico (99% vettore / 1% piattaforma). Non implementato come funzionalità erogante credito: è solo UI + preparazione dati finché il provider non è attivo.

Implementato subito (senza account esterno):
- ✔ Pulsante "Incasso rapido · In arrivo" disabilitato con badge, su **Economia** e **Borsa Carichi** (`components/IncassoRapidoSoon.tsx`), per testare interesse e preparare l'onboarding.
- ✔ Lead gen idempotente "Avvisami quando disponibile" → `StripeConnectLead` + `POST /api/finance/stripe-lead` (auth, rate limit 5/min, log redatti).
- ✔ DB predisposto per il futuro Stripe: `StripeConnectProfile` (stripeAccountId, onboardingComplete, payoutsEnabled, featureActive) — descrizione in `docs/STRIPE_CONNECT_ROADMAP.md`.
- ✔ e2e `scripts/e2e-stripe-lead.ts` verde (401 senza login, registrazione, idempotenza, pagine UI 200); tsc + build puliti.
- ⏳ Da attivare con Stripe (vedi §9 punto 5 e roadmap): onboarding Connect embedded, webhook `account.updated`/`payment_intent.succeeded`, ripartizione 99/1 alla conferma della tratta, scrittura Economia "INCASSO RAPIDO".

### Logo Truck Radar sui camion (marketing)

Iniziativa di marketing/offline ("Powered by Truck Radar" sui mezzi dei clienti) valutata come canale di acquisizione B2B: social proof presso il target (hub logistici, interporti) e fidelizzazione. Studio costi/format disponibile in `C:\Users\Asus\Downloads\Loghi su camion per gestionali.md`: sticker in vinile CAST laminato per automezzi, formato jolly consigliato 60x30 cm o 45x45 cm sagomato; prezzi indicativi 18–25 €/pezzo (1–5), 10–15 €/pezzo (10–25), 5–8 €/pezzo (50+). Non è una funzionalità software: viene catalogata come leva di acquisizione fuori dall'app (off-label) da attivare quando esisteranno i primi clienti pilota/Design Partner.

## 9. Checklist operativa provider (da attivare, in ordine)

Nessun provider è ancora stato attivato. Questa checklist è l'ordine consigliato; ogni attivazione sblocca un'apposita implementazione nel codice. Quando viene creato un account, non incollare mai chiavi nella chat: verranno inserite nelle Environment Variables di Vercel.

1. **GitHub** — ❌ da fare: repository (`dev270409/truck-radar`) già pronto e pushato, impostare MFA e regole di protezione su `master`.
2. **Vercel** — ❌: importare `dev270409/truck-radar`, creare progetto `truck-radar`, collezionare domini `truckradar.it` e `app.truckradar.it`, variabili separate per Production/Preview/Development.
3. **Supabase** — ❌ (è già il DB attuale, ma serve un progetto production separato): regione UE, SSL, backup automatico e restore testato, restrizioni di rete, MFA.
4. **UploadThing** — ❌: progetto production, domini consentiti, limiti sui file.
5. **Stripe** — ❌ (modalità test nel codice; da passare a live): Billing + Connect + Identity. Implementazioni: checkout abbonamento, webhook firmati, payout e commissioni Connect, verifica KYC persona via Identity. Predisposte solo le basi dell'incasso rapido (§8.4): UI "In arrivo", lead gen e tabelle raw `StripeConnectProfile`/`StripeConnectLead` — l'attivazione Connect (onboarding embedded, split 99/1, webhook) avviene solo quando il committente attiva l'account.
6. **Provider identity (Clerk o equivalente)** — ❌: login, verifica email, reset password, MFA, inviti autista.
7. **Provider camerale / business verification (visura aziendale)** — ❌: verifica visura e dati societari, webhook/esito firmato.
8. **Resend/Postmark** — ❌: dominio `truckradar.it`, email transazionali (`noreply@truckradar.it`).
9. **Sentry** — ❌: error tracking, alert, DSN in variabili d'ambiente.

Ogni punto di questa lista, quando attivato, verrà convertito dal placeholder attuale in un'integrazione reale coerente con §2.1 (orchestriamo, non sostituiamo il provider) e con i criteri di go-live di §7.

## Decisione

Il prossimo prodotto da realizzare non è un'altra funzione di gestione: è la presenza pubblica e il percorso affidabile con cui un'azienda scopre Truck Radar, si registra, dimostra la propria identità aziendale e accede gradualmente al Network verificato. Stato: roadmap scritta, pubblica già esercitabile su `localhost`, regressione e2e 14/14 verde, webhook KYC e sicurezza di base pronti, incasso rapido annunciato "In arrivo" con DB Stripe predisposto; nessun provider esterno attivo; si attendono il feedback del committente e l'attivazione dei provider di §9 (blocco: attivazione degli account provider richiede l'utente).
