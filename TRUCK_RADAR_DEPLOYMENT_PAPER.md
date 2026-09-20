# TRUCK RADAR

## Paper di lancio, distribuzione web e onboarding verificato

**Stato:** piano successivo al completamento del Mega Paper Master

Truck Radar è il Transport Operating System per aziende di trasporto: gestione di mezzi, autisti e viaggi; documenti e DDT; dati, network, marketplace e Smart Return.

## 1. Esito del controllo del Mega Paper Master

La checklist funzionale attuale è completa: non risultano task `[ ]` o `[FAILED]`.

Sono già disponibili account aziendale e ruoli, multi-tenancy, mezzi, autisti con credenziali, viaggi, PWA autista, DDT, documenti, tracking, integrazioni, abbonamenti, verifica account, marketplace, subappalto, Smart Return, analytics, reputazione, community ed ESG.

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

## Decisione

Il prossimo prodotto da realizzare non è un'altra funzione di gestione: è la presenza pubblica e il percorso affidabile con cui un'azienda scopre Truck Radar, si registra, dimostra la propria identità aziendale e accede gradualmente al Network verificato.
