# Truck Radar — Transport Operating System

Piattaforma per la gestione digitale di aziende di trasporto: **mezzi, autisti e
viaggi** da un unico ambiente, con DDT digitale, documenti, tracking, integrazioni
API, analytics, borsa carichi, subappalto, Smart Return, reputazione, community ed ESG.

## Per riprendere il lavoro

Leggi [`START_HERE.md`](START_HERE.md), poi [`docs/SESSION_HANDOFF.md`](docs/SESSION_HANDOFF.md).
Mappa del repository: [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md).

Questo repository è distribuibile come **prodotto self-hosted**: l'azienda cliente
installatela sulla propria infrastruttura (proprio database, proprio dominio) e ne
resta titolare dei dati.

## Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript + Tailwind CSS 4
- **Prisma 5** + **PostgreSQL**
- **NextAuth v5** (Auth.js) con Credentials Provider e JWT scoped
- **UploadThing** (upload documenti KYC, veicoli, DDT)
- **Stripe** (abbonamenti SaaS — opzionale in self-hosted)
- **Licenza self-hosted** firmata Ed25519 (`lib/license.ts`)

## Avvio rapido (Docker)

Requisiti: Docker + Docker Compose.

```bash
cp .env.example .env
# Imposta almeno AUTH_SECRET / NEXTAUTH_SECRET (openssl rand -base64 32)
docker compose up --build
```

L'app sarà su `http://localhost:3000`. Al primo avvio l'entrypoint applica lo
schema Prisma, crea le tabelle raw e avvia il server.

## Avvio manuale (Node)

Requisiti: Node 20+, PostgreSQL raggiungibile.

```bash
npm install
cp .env.example .env.local     # compila DATABASE_URL e i segreti
npm run selfhost:setup         # prisma db push + tabelle raw
npm run dev                    # http://localhost:3000
```

Per popolare dati dimostrativi (azienda/utenti demo): `npm run seed`.

## Licenza self-hosted

Il prodotto è attivabile con una **license key** firmata. Il flusso:

```bash
# 1. (solo una volta, da parte del fornitore) genera la coppia di chiavi Ed25519
npm run license:keygen
#    -> copia la chiave pubblica in lib/license.ts (EMBEDDED_PUBLIC_KEY)
#    -> la chiave privata resta in license-keys/private.pem (gitignored)

# 2. emetti una licenza per un cliente
npm run license:issue -- --licensee "Acme Trasporti Srl" --plan PRO --months 12
```

Sul server del cliente imposta:

```env
TRUCK_RADAR_SELF_HOSTED=true
TRUCK_RADAR_LICENSE=<license-key-emessa>
```

Senza licenza valida l'installazione resta in **trial** (2 mezzi / 2 autisti) e le
sezioni premium non sono accessibili. Lo stato è visibile in **Dashboard → Licenza**.
Guida completa: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md).

## Verifiche

```bash
npx tsc --noEmit     # type-check
npm run build        # build di produzione
npm run license:e2e  # test sistema di licenza
```

## Struttura

```
app/            pagine (landing, auth, dashboard) e route API
components/     componenti UI (shell, mappe, card, widget)
lib/            logica di dominio (tenant, piani, licenza, marketplace, fleet, kyb…)
prisma/         schema Prisma e seed
scripts/        bootstrap DB, e2e, generazione/emissione licenze
docs/           documentazione (self-hosting, KYC, Stripe Connect, piano prodotto)
docker/         entrypoint container
```

## Note di sicurezza

- Multi-tenancy isolata a livello di query (`companyId`); nessun tenant vede i dati altrui.
- Credenziali delle integrazioni cifrate (AES-256-GCM), segreti mai nei log.
- Webhook firmati e idempotenti; rate limit su auth, registrazione e webhook.
- Non committare mai file `.env` reali né `license-keys/private.pem`.
