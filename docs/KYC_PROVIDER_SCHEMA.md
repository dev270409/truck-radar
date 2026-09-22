# KYC Truck Radar — Schema dati interno per esiti provider

Documento interno. Obiettivo: collegare gli esiti di Stripe Identity (verifica persona)
e di un provider camerale (visura/azienda) senza salvare materiale identitario non necessario.
Riferimento: `TRUCK_RADAR_DEPLOYMENT_PAPER.md` §2.1, §4 (Fasi D/E) e roadmap Sprint 2.

## Principio

- La raccolta documentale avviene **presso il provider** (sessioni ospitate).
- Truck Radar conserva **solo esiti, riferimenti e minimi attributi** per decidere l'accesso al Network.
- I webhook sono firmati, verificati lato server, idempotenti.
- Nessun documento di identità, URL temporaneo o dato sensibile nei log o nel profilo pubblico.

## Modello dati (concettuale)

La tabella KYC esistente (`KycDocument`, in Prisma) resta per i documenti caricati
direttamente (UploadThing) dove il provider non può raccoglierli. A fianco si aggiunge
una **tabella esiti provider** (da creare via SQL raw idempotente, vedi `scripts/ensure-raw-tables.ts`):

```sql
CREATE TABLE IF NOT EXISTS "KycVerification" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'PERSONA' | 'VISURA'
  "providerRef" TEXT,              -- riferimento verifica/provider (es. sei_ id Stripe)
  status TEXT NOT NULL,            -- BOZZA|IN_ATTESA|IN_REVISIONE|VERIFICATO|RIFIUTATO|SCADUTO
  "verifiedAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,         -- scadenza/riesame
  "rejectionReason" TEXT,
  "reviewedById" TEXT,             -- operatore autorizzato (solo eccezioni)
  "reviewedAt" TIMESTAMPTZ,
  "rawPayload" JSONB,              -- solo esito minimale del provider, MAI documenti
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "KycVerification_companyId_idx" ON "KycVerification"("companyId");
```

## Flusso

1. **Richiesta**: admin avvia verifica → Truck Radar chiama il provider e ne conserva solo il riferimento (`providerRef`) e lo stato `IN_ATTESA`.
2. **Esecuzione**: il rappresentante legale completa la sessione ospitata dal provider (Stripe Identity per la persona, provider camerale per la visura).
3. **Webhook**: provider invia esito firmato (`event.type`, `verification.status`); handler verifica firma, idempotenza, mappa l'evento allo stato:
   - `requires_input` / `processing` → `IN_REVISIONE`
   - `verified` → `VERIFICATO` (+ `expiresAt` = scadenza provider, `verifiedAt`)
   - `unverified` / documenti non validi → `RIFIUTATO` con `rejectionReason` minimale
4. **Scadenza**: job/verifica lato GET: se `expiresAt` superato → `SCADUTO` e sospendi l'accesso Network.
5. **Accesso Network**: `verified = account verificato && visura VERIFICATO && persona VERIFICATO` (si aggancia a `lib/marketplace.ts` / `computeBadges`).
6. **Audit**: ogni transizione scrive `AuditLog` (action, entity, entityId, payload senza dati sensibili) con `safeLog` di `lib/safe-log.ts` che redige la parte sensibile.

## Mapping eventi (placeholder fino all'integrazione reale)

| Evento provider (es. Stripe Identity) | Stato Truck Radar |
| --- | --- |
| `verification_session.requires_input` | IN_REVISIONE |
| `verification_session.processing` | IN_REVISIONE |
| `verification_session.verified` | VERIFICATO |
| `verification_session.unverified` | RIFIUTATO |
| `verification_session.canceled` | RIFIUTATO (motivo: annullata) |

Per la visura aziendale: stesso pattern con `providerRef` del provider camerale e attributi minimi
(ragione sociale, partita IVA, iscrizione/REA) confrontati con la richiesta; mai salvare l'intera visura se non richiesto da normativa.

## Vincoli

- Non inserire chiavi provider in repository/log.
- `rawPayload` ammette solo i dati minimi necessari; rimuovere documenti e URL.
- Gli operatori con accesso ai dati KYC sono solo i revisori autorizzati (ruolo admin/ufficio con permesso specifico).
- Il consenso alle policy e al trattamento dati viene registrato prima di avviare ogni verifica.