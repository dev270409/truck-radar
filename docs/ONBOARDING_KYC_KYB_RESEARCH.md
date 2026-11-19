# Onboarding, trial, KYC/KYB e deleghe esterne

Ricerca del 19/11/2026. Obiettivo: capire quando chiedere KYC/KYB, quanto leggerli, cosa delegare a terzi e come modificare la registrazione di Truck Radar.

**Decisione consigliata:** trial di 21 giorni senza KYC/KYB, registrazione normale, verifica solo alla scadenza o al passaggio a un piano. KYC delegato a un provider identity; KYB leggero con P.IVA/CF + registro/VIES. Nessuna auto-approvazione da parte del tenant.

## 1. Perché spostare KYC/KYB dopo il trial

- Il trial serve a provare il prodotto, non a completare una pratica compliance. Chiedere visura e documento al signup riduce la conversione senza aumentare la sicurezza in modo decisivo.
- La verifica ha senso quando l'utente vuole continuare: è un **workflow gate**, non un allegato alla registrazione.
- Il rischio principale del trial è l'abuso (account multipli, email temporanee, uso intensivo di AI/export), non l'identità del titolare. Si controlla con:
  - email verification;
  - rate limit su registrazione/login/AI;
  - cap sulle funzioni costose;
  - device/IP risk analysis;
  - carta di credito solo se il tasso di abuso lo richiede.
- Stripe raccomanda un approccio risk-based: frizione bassa per i segnali puliti, verifica extra solo per quelli rischiosi.

**Quindi la tua intuizione è corretta:** 21 giorni senza KYC/KYB, poi verifica per continuare.

## 2. Quanto deve essere “leggero” il KYB

Per un SaaS di gestione flotta, il KYB minimo ragionevole è:

1. **P.IVA o Codice Fiscale** dell'azienda (11 cifre o 16 caratteri).
2. **Verifica ufficiale** del dato: VIES per la P.IVA, Registro Imprese/Openapi per il CF o per dati più completi.
3. **Coerenza** tra ragione sociale, sede e identificativo.
4. **Legale rappresentante** verificato tramite KYC.

Non serve, per ora:
- UBO/titolare effettivo;
- screening PEP/sanzioni;
- monitoraggio AML continuo;
- visura storica o bilanci.

Questi servono se Truck Radar diventa:
- marketplace con pagamenti/escrow;
- soggetto obbligato AML;
- piattaforma che gestisce fondi di terzi;
- o se un cliente enterprise li chiede contrattualmente.

**P.IVA da sola non è una verifica:** è solo un formato. Va confrontata con una fonte ufficiale (VIES/Registro Imprese) e con il legale rappresentante.

## 3. KYC: meglio delegare

Sì, conviene delegare. Costruire un sistema di documenti + selfie + liveness + antifrode significa:
- raccogliere e conservare documenti e biometrico;
- gestire frodi, template falsi, deepfake, retry;
- gestire review manuale e audit;
- rispettare retention e data minimization.

Per un team piccolo è un costo e un rischio inutile.

### Confronto provider

| Provider | Prezzo pubblico | Minimo | Note |
|---|---|---|---|
| **Stripe Identity** | ~1,50 USD / 1,25 € per documento+selfie | Nessuno; prime 50 gratis | Già dentro Stripe, webhook e dashboard esistenti; integrazione più rapida |
| Veriff | 0,80 USD/verifica (Essential) | 49 USD/mese | Economico a volume; review umana nei piani Plus/Premium |
| Sumsub | 1,35 USD/verifica (Basic) | 149 USD/mese | Buono se servono AML, PoA, monitoraggio |
| Persona | da 250 USD/mese, 500 verifiche incluse | 12 mesi | Flussi configurabili, review queue |
| Onfido/Entrust | preventivo | — | Enterprise, più complesso |

**Scelta consigliata: Stripe Identity** per la prima fase. Motivi:
- Stripe è già usato per gli abbonamenti;
- hosted flow e webhook `identity.verification_session.*`;
- 50 verifiche gratuite;
- non dobbiamo conservare documenti/selfie: riceviamo solo l'esito;
- se in futuro serve AML/UBO, si passa a Sumsub o si aggiunge un provider KYB.

**Attenzione:** Stripe Identity va attivato nell'account Stripe, configurando webhook e `STRIPE_IDENTITY_ENABLED=true`. Finché non è attivo, la pagina di verifica mostra il provider come non disponibile.

### SPID/CIE

SPID/CIE sono validi per l'identificazione remota (SPID livello 2 è accettato ai fini AML), ma:
- richiedono convenzione AgID o un aggregatore;
- SPID non restituisce il ritratto;
- CIE/IT-Wallet hanno regole e tempi propri;
- non sono la strada più rapida per il primo go-live.

**Consiglio:** Stripe Identity ora; SPID/CIE come opzione italiana in una fase successiva, se i clienti la chiedono.

## 4. Flusso implementato

1. **Registrazione normale** in 3 step: azienda, admin, conferma. Nessun upload KYC/KYB.
2. **Trial 21 giorni** con accesso completo.
3. Al giorno 21, se il trial è scaduto e la verifica non è completa:
   - dashboard bloccata;
   - redirect a `/onboarding/verifica`.
4. Nella pagina di verifica:
   - **KYB**: P.IVA/CF → VIES e, se configurato, Openapi Registro Imprese;
   - **KYC**: Stripe Identity hosted flow;
   - stato e ultimo errore visibili.
5. Quando entrambe sono verificate:
   - l'utente può scegliere un piano;
   - nessun ADMIN tenant può approvare i propri documenti.
6. Ruoli attivi: **ADMIN** e **AUTISTA**. COMMITTENTE e UFFICIO non possono accedere; la creazione utenti è limitata ad AUTISTA.

## 5. Perché non auto-approvare il KYC

Il vecchio endpoint permetteva a un ADMIN della stessa azienda di approvare i propri documenti e attivare l'abbonamento. Era un bypass:
- il cliente poteva auto-certificarsi;
- il trial poteva diventare ACTIVE senza pagamento;
- un documento falso veniva “approvato” dal tenant stesso.

Ora la verifica manuale è disattivata. L'esito arriva solo dal provider KYC (Stripe Identity) o da un revisore piattaforma separato, che non esiste ancora come ruolo.

## 6. Deleghe consigliate: cosa esternalizzare

### Da delegare subito
- **KYC**: Stripe Identity.
- **KYB P.IVA**: VIES + Openapi Registro Imprese.
- **Pagamenti/abbonamenti**: Stripe.
- **Email transazionale**: Postmark/Resend.
- **Storage documenti**: UploadThing/S3.
- **AI documenti**: Gemini/Document AI.
- **Monitoraggio errori**: Sentry.
- **Rate limit distribuito**: Upstash Redis.
- **Firma POD**: firmare su canvas va bene; per contratti usare SignWell/DocuSign.

### Da delegare quando serve
- **MFA**: Auth0/Clerk/WorkOS o TOTP interno.
- **SPID/CIE**: aggregatore AgID.
- **AML/UBO/PEP**: Sumsub o Know Your Customer.
- **Fatturazione elettronica**: Fatture in Cloud/Aruba/Openapi SDI.
- **PEC/SDI**: provider accreditato.
- **Telefono/WhatsApp**: Telnyx/Twilio (vedi ricerca Pro Connect).
- **Mappe/geocoding**: Google Maps/Mapbox.
- **Telemetria**: Geotab.
- **Supporto**: Crisp/Intercom.
- **E-signature**: SignWell/DocuSign.
- **Backup/uptime**: Supabase backup + Better Stack/Sentry.

### Da NON delegare
- logica di viaggio, DDT, ordini, margine, scadenze;
- matching e regole del network;
- dati operativi e workflow interno;
- ownership del dato e DPA.

## 7. Costi indicativi

| Voce | Costo |
|---|---|
| Stripe Identity | 1,25 € per verifica (prime 50 gratis) |
| VIES | gratis (endpoint UE) |
| Openapi IT-start | 0,05 € / richiesta (scalare a volume) |
| Openapi UBO Italia | 1,10 € / richiesta |
| Visura ordinaria | 2,30–4,90 € / documento |
| Veriff Essential | 0,80 USD + 49 USD/mese |
| Sumsub Basic | 1,35 USD + 149 USD/mese |
| SPID | primi 1.000 utenti gratis per IdP, poi ~0,40 €/anno (auth liv. 1-2) |

Per 100 nuovi clienti al mese:
- Stripe Identity: ~125 € (dopo le prime 50);
- VIES: 0 €;
- Openapi IT-start: ~5 €;
- totale verifiche: ~130 €/mese, trascurabile rispetto a un piano Pro.

## 8. Compliance e limiti

- Questo non è parere legale. Se Truck Radar gestirà pagamenti/escrow o diventerà marketplace, far valutare a un legale se scatta il D.Lgs. 231/2007.
- Anche senza obblighi AML, il GDPR si applica: base giuridica, informativa, DPA con Stripe/Openapi, retention, data minimization.
- Non conservare immagini di documenti o selfie se il provider le gestisce: salva solo esito, data, provider e riferimento.
- UBO e screening PEP/sanzioni solo quando richiesti da contratto o da normativa.
- Il Registro dei Titolari Effettivi italiano ha avuto problemi di accesso; non costruire il flusso solo su quello.

## 9. Cosa manca per andare live

1. Attivare Stripe Identity nell'account Stripe.
2. Impostare `STRIPE_IDENTITY_ENABLED=true` in produzione.
3. Configurare gli eventi webhook `identity.verification_session.*` sullo stesso endpoint Stripe.
4. Configurare `OPENAPI_API_KEY` per il KYB italiano (VIES funziona anche senza).
5. Decidere se dopo la verifica l'utente deve pagare subito o può restare in trial/read-only.
6. Aggiungere un revisore piattaforma separato se si vogliono verificare manualmente documenti Level 2.
7. Applicare il gate anche a livello API, non solo dashboard (un trial scaduto non deve poter chiamare le API direttamente).
8. Email verification al signup per ridurre trial abuse.

## 10. Fonti

- Stripe Identity e prezzi: https://stripe.com/identity
- Stripe Identity docs: https://docs.stripe.com/identity
- Stripe — free trial abuse: https://stripe.com/en-ca/resources/more/free-trial-abuse
- Veriff pricing: https://www.veriff.com/pricing
- Sumsub pricing: https://sumsub.com/pricing
- Persona pricing: https://withpersona.com/pricing
- Openapi Company Italia: https://openapi.com/products/start-data-italian-company
- Openapi prezzi: https://openapi.com/pricing
- VIES REST API: https://ec.europa.eu/taxation_customs/vies/technicalInformation.html
- SPID/CIE per imprese: https://www.agid.gov.it/it/piattaforme/spid
- D.Lgs. 231/2007 e AML Italia: https://www.complify.it/en/normativa
- GDPR / Garante: https://www.garanteprivacy.it/
