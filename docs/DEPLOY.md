# Deploy: come funziona adesso

Aggiornato il 20/11/2026. Serve a evitare la confusione tra i due progetti Vercel.

## 1. Regola in una riga

**La produzione è il progetto Vercel `truck-radar`, dominio `www.truck-radar.it`, branch `master`.** Ogni push su `master` crea ora un deploy di produzione automatico.

## 2. Cosa c'era che non andava

- Il repository GitHub `dev270409/truck-radar` era collegato a **due** progetti Vercel: `truck-radar` e `transport-saas`.
- `truck-radar` aveva il branch di produzione impostato su **`main`**, ma il repository usa **`master`**: i push finivano in Preview, non in produzione.
- `transport-saas` riceveva i deploy dal repository ma non ha un dominio di produzione: era un doppione che generava confusione e minuti di build.
- I deploy di produzione reali venivano creati a mano con `vercel --prod`.

## 3. Configurazione attuale

| Progetto | Ruolo | Git | Dominio | Azione |
|---|---|---|---|---|
| `truck-radar` | Produzione | `dev270409/truck-radar`, branch `master` | `www.truck-radar.it` | Deploy automatico a ogni push |
| `transport-saas` | Legacy/scollegato | nessuno | `transport-saas-six.vercel.app` | Ignorarlo; eliminabile in futuro |

Modifiche fatte:

1. `truck-radar` → Settings → Environments → Production → Branch Tracking = **`master`**.
2. `transport-saas` → Settings → Git → **Remove Git Connection**.

## 4. Deploy quotidiano

```bash
git add -A
git commit -m "feat: ..."
git push origin master
```

Vercel crea automaticamente il deploy Production su `truck-radar`. Controllo:

```bash
vercel ls --environment production
```

L'ultimo deploy deve avere progetto `truck-radar`, ambiente `Production`, stato `Ready`.

## 5. Deploy manuale (hotfix o rollback)

```bash
vercel whoami          # deve rispondere dev270409
vercel --prod --yes    # usa .vercel/project.json → truck-radar
```

Non usare `transport-saas`: non è più collegato al repository.

## 6. Verifica live

- `https://www.truck-radar.it/login` → 200
- `https://www.truck-radar.it/dashboard` → 307 verso login se non autenticato (è corretto)
- `/api/...` senza sessione → 401 (è corretto)
- Asset pubblici (`/tutorials/...`, logo) → 200

## 7. Database

Prisma CLI `migrate`/`db push` non è disponibile in locale. Dopo aver aggiunto tabelle o colonne raw:

```bash
npm run db:raw
```

Lo script è idempotente: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, indici e seed. Eseguirlo **prima** del deploy se il codice usa nuove colonne.

## 8. Variabili d'ambiente

- Produzione e Preview si gestiscono da Vercel → progetto `truck-radar` → Settings → Environment Variables.
- In locale: `.env.local` (non committare).
- Chiavi attualmente usate in produzione: Stripe, UploadThing, NextAuth, Google Gemini, Openapi.
- Per gli avvisi scadenze mancano ancora `RESEND_API_KEY`, `EMAIL_FROM` e `CRON_SECRET`: senza queste gli avvisi restano `NOT_CONFIGURED` e il cron risponde 401.

## 9. Errori tipici

| Sintomo | Causa | Soluzione |
|---|---|---|
| Il push non aggiorna il sito | branch di produzione errato | Settings → Environments → Production → branch `master` |
| “No Production Deployment” | progetto sbagliato (`transport-saas`) | usare `truck-radar` o `vercel --prod` |
| 307 su una pagina dashboard | sessione assente | è il redirect al login, non un errore |
| 401 sulle API | nessuna sessione | fare login o usare un client autenticato |
| Build fallita per colonna mancante | `db:raw` non eseguito | `npm run db:raw` e ridistribuire |
| UploadThing 500 | token/regione errati | controllare `UPLOADTHING_TOKEN` e regione `sea1` |

## 10. Cron

`vercel.json` pianifica `/api/cron/deadlines` ogni giorno alle 06:00. Vercel invia `Authorization: Bearer ${CRON_SECRET}` solo se la variabile è impostata. Senza secret l'endpoint risponde 401: è voluto.
