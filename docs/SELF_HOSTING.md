# Truck Radar — Guida Self-Hosting

Questa guida descrive come installare, licenziare e mantenere Truck Radar su
un'infrastruttura di proprietà del cliente. In questa modalità l'azienda che
ospita il servizio è **titolare del trattamento** dei dati; il fornitore del
software non accede ai dati dei clienti finali.

## 1. Requisiti

- Un server (VM/container host) con Docker e Docker Compose, oppure Node.js 20+.
- PostgreSQL 14+ (incluso in `docker-compose.yml`).
- Un dominio con certificato HTTPS davanti all'app (reverse proxy / load balancer).
- Account **UploadThing** (upload documenti) — opzionale ma consigliato.

## 2. Installazione con Docker (consigliata)

```bash
git clone <repo> truck-radar && cd truck-radar
cp .env.example .env
```

Modifica `.env` e imposta almeno:

| Variabile | Descrizione |
| --- | --- |
| `AUTH_SECRET` | segreto casuale (es. `openssl rand -base64 32`) |
| `NEXTAUTH_SECRET` | stesso valore di `AUTH_SECRET` |
| `NEXTAUTH_URL` / `AUTH_URL` | URL pubblico (es. `https://app.example.com`) |
| `TRUCK_RADAR_SELF_HOSTED` | `true` |
| `TRUCK_RADAR_LICENSE` | license key emessa dal fornitore |
| `UPLOADTHING_TOKEN` | token UploadThing (per KYC e DDT) |

Avvia:

```bash
docker compose up --build -d
docker compose logs -f app
```

All'avvio l'entrypoint (`docker/entrypoint.sh`) esegue automaticamente:

1. `prisma db push` — crea schema ed enum;
2. `scripts/ensure-raw-tables.ts` — crea le tabelle raw e i seed di sistema;
3. `prisma/seed.ts` — solo se `SEED_DEMO=true` (dati dimostrativi).

## 3. Installazione manuale (Node.js)

```bash
npm install
cp .env.example .env.local     # compila DATABASE_URL e segreti
npm run selfhost:setup         # prisma db push + ensure-raw-tables
npm run build
npm start
```

## 4. Variabili d'ambiente

Riferimento completo: [`.env.example`](../.env.example). Le più importanti:

- **Database**: `DATABASE_URL`
- **Auth**: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_URL`
- **Licenza**: `TRUCK_RADAR_SELF_HOSTED`, `TRUCK_RADAR_LICENSE`
- **Upload**: `UPLOADTHING_TOKEN`
- **KYC/KYB opzionali**: `KYC_WEBHOOK_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `OPENAPI_API_KEY`
- **Demo (non in produzione)**: `NEXT_PUBLIC_SHOW_DEMO_CREDS`, `ALLOW_DEMO_LOGIN`

> Non usare i valori di esempio in produzione. Non committare mai `.env` reali.

## 5. Licenza

Il sistema di licenza usa crittografia a chiave asimmetrica **Ed25519**: il
fornitore firma, il cliente verifica con una chiave pubblica incorporata in
`lib/license.ts`. Il cliente non può forgiare licenze.

### 5.1 Generazione chiavi (fornitore, una sola volta)

```bash
npm run license:keygen
```

- Crea `license-keys/public.pem` e `license-keys/private.pem`.
- Incolla la **chiave pubblica** in `lib/license.ts` (`EMBEDDED_PUBLIC_KEY`).
- Conserva `license-keys/private.pem` in luogo sicuro (è in `.gitignore` via `*.pem`).

### 5.2 Emissione licenza (fornitore)

```bash
npm run license:issue -- --licensee "Acme Trasporti Srl" --plan PRO \
    --vehicles 50 --drivers 50 --months 12
```

Opzioni: `--licensee` (obbligatorio), `--plan` (`BASE|PRO|ENTERPRISE`),
`--vehicles`, `--drivers`, `--months`, `--features`.

### 5.3 Attivazione (cliente)

```env
TRUCK_RADAR_SELF_HOSTED=true
TRUCK_RADAR_LICENSE=<license-key>
```

Riavvia l'app. Lo stato è visibile in **Dashboard → Licenza** (solo ADMIN).
Una licenza **scaduta** o **assente** porta l'installazione in trial (2 mezzi /
2 autisti) e blocca le sezioni premium, senza cancellare dati.

### 5.4 Rotazione/aggiornamento licenza

Per rinnovare basta sostituire `TRUCK_RADAR_LICENSE` e riavviare. Per cambiare
la coppia di chiavi: rigenera le chiavi, aggiorna `EMBEDDED_PUBLIC_KEY` nel
codice, ridistribuisci la build e riemetti tutte le licenze.

## 6. Backup e manutenzione

- **Database**: `docker compose exec db pg_dump -U truckradar truckradar > backup.sql`
  (o policy di backup del provider gestito). Testare periodicamente il restore.
- **Upload**: i file restano su UploadThing; verificarne la retention.
- **Aggiornamenti**: `git pull` + `docker compose up --build -d`. L'entrypoint
  riapplica schema e tabelle raw in modo idempotente.
- **Segreti**: conservare in un secret manager; ruotare periodicamente.

## 7. Sicurezza

- Serve l'app dietro HTTPS (header di sicurezza già configurati in `next.config.ts`).
- Limita l'accesso al database alla rete dell'app.
- Non esporre mai `.env`, `license-keys/`, log con dati sensibili.
- Gli account `@demo.com` sono bloccati in produzione (override solo con `ALLOW_DEMO_LOGIN=true`).

## 8. Troubleshooting

| Sintomo | Causa probabile | Rimedio |
| --- | --- | --- |
| App parte in trial (2/2) | licenza assente/invalida/scaduta | verifica `TRUCK_RADAR_LICENSE` e scadenza |
| `Firma non valida` | chiave pubblica diversa da quella del fornitore | allinea `EMBEDDED_PUBLIC_KEY` |
| Upload documenti fallisce | `UPLOADTHING_TOKEN` mancante/errato | reimposta il token |
| Errore DB all'avvio | `DATABASE_URL` errato o DB non pronto | verifica connessione; l'entrypoint riprova |
| Sezioni premium bloccate | abbonamento/trial o licenza non valida | attiva licenza o abbonamento |
