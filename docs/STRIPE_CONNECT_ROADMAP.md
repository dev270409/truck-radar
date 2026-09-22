# Stripe Connect — Incasso rapido (roadmap embedded finance)

Stato: **annunciato come "In arrivo"** nella Borsa Carichi ed Economia. Nessuna
funzione finanziaria live, nessun flusso di fondi. Stripe Connect verrà
attivato in un secondo momento (v. `TRUCK_RADAR_DEPLOYMENT_PAPER.md` §9).

## Modello di business

- Commissione fissa **1%** su ogni transazione della borsa carichi.
- I fondi **non transitano mai dai conti di Truck Radar**: split automatico
  Stripe Connect (99% al vettore, 1% a Truck Radar come `application_fee`).
- Truck Radar orchestra, non è istituto di pagamento: nessuna licenza
  bancaria/IMEL richiesta (art. 131/132 TUB evitati via segregazione dei ruoli).

## Schema dati già predisposto (SQL raw idempotente)

Tabella `StripeConnectProfile` (`scripts/ensure-raw-tables.ts`):

| Campo | Scopo |
| --- | --- |
| `companyId` (UNIQUE) | tenant collegato |
| `stripeAccountId` | account Express/Custom fornito da Stripe all'onboarding |
| `onboardingComplete` | onboarding KYC del vettore completato |
| `payoutsEnabled` | account pronto a ricevere payout |
| `featureActive` | flag operativo per abilitare a specifici utenti |

Tabella `StripeConnectLead` (`scripts/ensure-raw-tables.ts`): lead gen
"Avvisami quando disponibile" (UNIQUE per `companyId`, stato `INTERESSATA`).

API: `POST /api/finance/stripe-lead` registra l'interesse (auth richiesta,
idempotente, rate limit 5/min, log redatti).

## Flusso da attivare (solo dopo provider)

1. `POST /v1/account_links` (Stripe Connect onboarding embedded).
2. Webhook `account.updated` → aggiorna `StripeConnectProfile`.
3. Al completamento di un viaggio con carico: button "Incassa subito" →
   crea PaymentIntent con `application_fee_amount` (1%) e i costi Stripe,
   oppure uso di conti Express con `transfer_data`.
4. Webhook `payment_intent.succeeded` → marca la tratta "Anticipata" e
   registra la scrittura in Economia (tipo `INCASSO_RAPIDO`).

## Vincoli

- Mantenere il pulsante disabilitato con badge "In arrivo" finché
  `featureActive` non è true per il tenant (o flag globale).
- Portare i segreti Stripe solo nelle Environment Variables di Vercel.
- KYC/onboarding vettori tramite widget Stripe (nessun dato sensibile salvato).