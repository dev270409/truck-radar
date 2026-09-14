# 🚚 LogiFlow SaaS — Piattaforma SaaS di Gestione Trasporti & Flotte

Una piattaforma SaaS multi-tenant enterprise per la gestione completa di trasporti merci, flotte aziendali, documenti KYC, autisti e contratti, sviluppata con la seguente stack tecnologica:

- **Frontend / Backend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **ORM & Database**: Prisma ORM, PostgreSQL (Supabase)
- **Autenticazione**: NextAuth.js v5 (Auth.js) con Credentials Provider e JWT Scoped
- **Pagamenti**: Stripe (Test Mode SDK + Webhooks handler)
- **File Upload**: UploadThing (per documenti KYC, revisioni veicoli e foto DDT)
- **Sicurezza**: Multi-tenancy isolata a livello di QUERY database (`companyId`), hashing bcrypt.

---

## 🛠️ 1. Configurazione Database PostgreSQL (Supabase)

Il progetto utilizza **esclusivamente PostgreSQL**. Per connettere un database gratuito su Supabase:

1. Vai su [Supabase](https://supabase.com) e crea un nuovo progetto gratuito.
2. Vai in **Project Settings** -> **Database** -> **Connection String**.
3. Seleziona la modalità **URI** (o **Transaction Pooler**).
4. Copia l'URL di connessione (esempio):
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbooster=true"
   ```
5. Apri il file `.env.local` nella radice del progetto ed incolla la tua stringa `DATABASE_URL`.

---

## 🚀 2. Guida Rapida di Avvio

Dalla cartella del progetto (`transport-saas`):

### 1. Applicare lo Schema Prisma su PostgreSQL
Esegui la sincronizzazione dello schema PostgreSQL:
```bash
npx prisma db push
```

*(Oppure per generare le migrazioni ufficiali)*:
```bash
npx prisma migrate dev --name init
```

### 2. Eseguire lo Script di Seed Data
Popola il DB con l'azienda demo, utenti Admin ed Autista (con veicolo collegato), veicoli e tariffe:
```bash
npx tsx prisma/seed.ts
```
*(oppure `npm run seed`)*

### 3. Avviare il Server di Sviluppo
```bash
npm run dev
```
La piattaforma sarà accessibile all'indirizzo **`http://localhost:3000`**.

---

## 🧪 3. Istruzioni per Collaudo e Testing

### A. Testing del LOGIN con Credenziali Seeded
1. Apri il browser a **`http://localhost:3000/login`**.
2. **Accesso ADMIN**:
   - **Email**: `admin@demo.com`
   - **Password**: `Demo123!`
   - *Verifica*: Verrai reindirizzato alla Dashboard (`/dashboard`) dove potrai visualizzare le metriche della flotta, la gestione veicoli ed aggiungere nuovi utenti.
3. **Accesso AUTISTA**:
   - **Email**: `autista@demo.com`
   - **Password**: `Demo123!`
   - *Verifica*: Noterai che l'utente autista `Giuseppe Verdi` è collegato direttamente al veicolo `AB123CD` tramite il campo `vehicleId`.

---

### B. Testing della REGISTRAZIONE MULTI-STEP
1. Vai su **`http://localhost:3000/register`**.
2. **Step A (Azienda)**: Inserisci la Ragione Sociale (es. *Trasporti Veloce Srl*), P.IVA (*98765432101*), Indirizzo e Telefono.
3. **Step B (Utente Admin)**: Inserisci Nome, Cognome, Email (*admin@veloce.it*) e Password (*Password123!*).
4. **Step C (Documenti KYC)**: Seleziona o simula il caricamento dei 3 documenti obbligatori (*Partita IVA*, *Licenza Conto Terzi*, *Iscrizione Albo*).
5. **Step D (Conferma)**: Clicca su **Completa Registrazione**.
   - Verrai confermato in uno stato iniziale **TRIAL (30 Giorni)** e documenti KYC in stato **IN_ATTESA**.
6. Torna alla pagina di Login ed accedi con `admin@veloce.it` / `Password123!`.

---

### C. Testing dell'Isolamento Multi-Tenant (Sicurezza)
Per verificare che nessun utente/azienda possa accedere ai dati di un'altra company:
- Esegui lo script di test di sicurezza automatizzato:
  ```bash
  npx tsx scripts/test-multi-tenancy.ts
  ```
- Oppure effettua una chiamata GET all'endpoint **`http://localhost:3000/api/test-multi-tenancy`**.
- *Risultato atteso*: Qualsiasi tentativo di richiedere un veicolo o dato appartenente ad un'altra `companyId` restituisce immediatamente **HTTP 404 (Not Found)** / **HTTP 403 (Forbidden)**.

---

## 📂 Struttura del Progetto

```
transport-saas/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Login con NextAuth Credentials
│   │   └── register/page.tsx        # Wizard Registrazione Multi-Step (A, B, C, D)
│   ├── api/
│   │   ├── auth/[...nextauth]/      # Auth.js Handler
│   │   ├── register/route.ts        # Endpoint Registrazione Azienda & Admin
│   │   ├── vehicles/                # API Flotta Veicoli (Scoped per Tenant)
│   │   ├── users/                   # API Gestione Autisti (Admin only)
│   │   ├── webhooks/stripe/         # Endpoint Webhook Stripe
│   │   └── uploadthing/             # Endpoints UploadThing KYC/DDT
│   └── dashboard/                   # Dashboard Protetta
├── lib/
│   ├── db.ts                        # Singleton Prisma Client
│   ├── tenant.ts                    # Engine di isolamento Multi-Tenancy
│   ├── hash.ts                      # Password Hashing Bcrypt
│   └── stripe.ts                    # Helper e Client Stripe
├── prisma/
│   ├── schema.prisma                # Schema 13 Entità PostgreSQL
│   └── seed.ts                      # Script di popolamento DB Demo
└── scripts/
    └── test-multi-tenancy.ts        # Automated Security Multi-Tenant Test
```
