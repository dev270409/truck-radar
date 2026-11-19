# Truck Radar - Project Health Check

Data: 19/11/2026. Audit tecnico e di produzione. Non è una certificazione di sicurezza né un penetration test.

Riferimenti: OWASP ASVS 5.0 (Level 2 come target), checklist production-readiness SaaS, Prisma multi-tenancy, Next.js App Router, Stripe.

## 1. Esito sintetico

| Area | Esito | Note |
|---|---|---|
| Dipendenze | OK | `npm audit --omit=dev` = 0; Next 16.4.6; override `effect`/`@effect/platform` |
| TypeScript | OK | `npx tsc --noEmit` exit 0 |
| Build | OK | `npm run build` exit 0, 115 pagine |
| Prisma schema | OK | `npx prisma validate` exit 0 |
| Multi-tenancy | OK | `scripts/test-multi-tenancy.ts` |
| Smoke test | OK | pagine pubbliche/admin/autista + API |
| UI responsive | OK | 16 pagine × 1440/390, 0 overflow, 0 underscore |
| Header di sicurezza | OK | CSP, HSTS, X-Frame, X-Content-Type, Referrer, Permissions |
| Cookie sessione | OK | `__Host-`, Secure, HttpOnly, SameSite=Lax in produzione |
| Segreti nel repo | OK | `.env` non tracciato; nessuna chiave live trovata |
| Upload autenticati | OK | vehicle/DDT/inbox richiedono sessione; KYC pubblico con rate limit |
| URL pericolosi | OK | allowlist UploadThing per KYC; URL HTTP(S) per allegati |
| Riferimenti cross-tenant | OK sui flussi principali | mezzo, viaggio, cliente, cisterna, autista |
| Onboarding trial | OK | 21 giorni senza KYC/KYB; verifica alla scadenza |
| Ruoli | OK | attivi ADMIN e AUTISTA; COMMITTENTE/UFFICIO bloccati |
| KYC self-approval | RISOLTO | verifica gestita dal provider; endpoint manuale disattivato |
| Stripe Identity | DA ATTIVARE | codice pronto; manca flag/provider/webhook in produzione |
| Lint | APERTO | ~1995 problemi preesistenti; i file nuovi passano ESLint |
| MFA / verifica email | APERTO | da decidere prima del go-live |
| Rate limit distribuito | APERTO | in-memory, non affidabile su più istanze |
| Monitoraggio / backup | APERTO | mancano restore testato, alert, SLO |
| Latenza DB | ATTENZIONE | ~0,9-1,1 s per query dal computer di audit |

## 2. Correzioni fatte

1. **Next.js 16.3.5 → 16.4.6**, `eslint-config-next` allineato, `npm audit` a 0.
2. **Override `effect@3.22.2` e `@effect/platform@0.97.2`** per chiudere le vulnerabilità transitive di UploadThing; build e upload reale verificati.
3. **Build ID statico rimosso** da `next.config.ts`.
4. **Service Worker**: cache `truck-radar-v2`; niente cache per `/dashboard`, `/portale`, `/tracking`, `/api`.
5. **UploadThing**: vehicle/DDT/inbox richiedono sessione; KYC pubblico con rate limit 20/ora.
6. **URL e allegati**: `lib/url-safety.ts`; KYC/KYB solo host UploadThing; documenti, POD, ordini e portale solo HTTP(S).
7. **Cross-tenant**: `lib/tenant-refs.ts` e controlli su costi, scadenze, cisterne, rifornimenti, manutenzione, ispezioni, piani di carico, ordini, preventivi.
8. **API riservate**: trips/users/deadlines non accessibili all'autista; `POST /api/vehicles` solo ADMIN/UFFICIO; test ruoli admin 200 / autista 403.
9. **Stripe webhook**: idempotenza `invoice.paid`; aggiornamento piano BASE/PRO; firma obbligatoria in produzione.
10. **Checkout Stripe**: `NEXTAUTH_URL`/`AUTH_URL` obbligatorio in produzione.
11. **Registrazione**: password 8-72, email valida, P.IVA 11 cifre o CF 16, verifica P.IVA server-side.
12. **Tracking pubblico**: query viaggio filtrata anche per `companyId`.
13. **`/api/test-multi-tenancy`**: solo `NODE_ENV=development`.
14. **Nuova pagina `/dashboard/documenti`**: coda manuale documenti, upload, classificazione, collegamento, archiviazione.
15. **Onboarding**: registrazione in 3 step senza upload; trial 21 giorni con accesso completo; al giorno 21 gate su `/onboarding/verifica`.
16. **KYB**: verifica P.IVA/CF con VIES e, se configurato, Openapi Registro Imprese.
17. **KYC**: sessione Stripe Identity (`document` + selfie) e webhook `identity.verification_session.*`; nessun documento/selfie conservato da Truck Radar.
18. **Auto-approvazione KYC rimossa**: `/api/kyc/[id]` non permette più al tenant di approvarsi; pagina KYC in sola lettura.
19. **Ruoli**: login consentito solo ad ADMIN/AUTISTA; creazione utenti solo AUTISTA; COMMITTENTE/UFFICIO bloccati.

## 3. Evidenze eseguite

- `npx tsc --noEmit` → exit 0.
- `npm run build` → exit 0, 115 pagine, Next 16.4.6.
- `npx prisma validate` → schema valido.
- `npm audit --omit=dev` → 0 vulnerabilità.
- `npx tsx scripts/test-multi-tenancy.ts` → TEST 1 e TEST 2 PASS.
- `npx tsx scripts/smoke-local.ts` → tutte le pagine e API PASS.
- `node scripts/audit-ui.cjs` → 16 pagine × 1440/390: overflow 0, underscore 0.
- E2E onboarding: registrazione 200, dashboard trial 200, status trialActive=true, COMMITTENTE 400, KYC self 403, trial scaduto 307 → `/onboarding/verifica`, pagina verifica 200.
- Upload autenticato su `/dashboard/documenti` riuscito; documento di test eliminato.
- Header produzione `https://www.truck-radar.it`: CSP, HSTS, X-Frame DENY, nosniff, Referrer, Permissions; cookie `__Host-` Secure/HttpOnly/Lax.
- DB: 22 company, 30 utenti, 11 mezzi, 48 viaggi, 44 KYC (41 in attesa, 3 verificati), 0 documenti inbox; 0 orfani/cross-tenant; 0 targhe duplicate.
- Latenza DB locale: 5 ping tra 0,9 e 2,4 s; audit sequenziale ~41 s.

## 4. Aperti prima del go-live

### ALTO - Attivare Stripe Identity
Il codice è pronto, ma servono:
1. attivazione Stripe Identity nell'account Stripe;
2. `STRIPE_IDENTITY_ENABLED=true` in produzione;
3. eventi webhook `identity.verification_session.*`;
4. test con documento reale in sandbox/test mode.
Senza questi passi la pagina di verifica mostra il provider come non disponibile.

### ALTO - Gate trial anche sulle API
La dashboard reindirizza i trial scaduti, ma le API non controllano ancora il trial a ogni chiamata. Un utente con sessione valida potrebbe chiamare direttamente le API. Serve un controllo server-side condiviso (o token/session aggiornato dopo la verifica).

### ALTO - MFA, verifica email e revoca sessioni
Non ci sono MFA, verifica email obbligatoria né invalidazione delle sessioni JWT dopo cambio password/reset.

### ALTO - Rate limit distribuito
`lib/rate-limit.ts` usa una `Map` per istanza. Su Vercel o multi-istanza il limite è aggirabile. Serve Redis/Upstash.

### ALTO - Webhook KYC generico
`app/api/webhooks/kyc/route.ts` è ancora boilerplate: controlla solo la presenza della firma, non la validità. Non attivarlo con un provider reale finché non c'è HMAC/secret verification.

### MEDIO - KYC Level 2 / marketplace
La verifica Level 2 (licenza, Albo, REN, CMR, DURC, delega) non ha un revisore piattaforma. Se attivi la Borsa Carichi, serve un ruolo/reviewer separato o un provider KYB.

### MEDIO - Pagamento dopo il trial
Dopo la verifica l'utente può scegliere un piano, ma non è ancora deciso se il trial scaduto debba essere read-only, sospeso o bloccato fino al pagamento. Oggi la dashboard resta accessibile con sezioni premium bloccate.

### MEDIO - CSP
La CSP usa `'unsafe-inline'` e `'unsafe-eval'`. Next in produzione spesso non richiede `unsafe-eval`; testare Stripe/UploadThing/Geotab prima di rimuoverlo.

### MEDIO - Latenza database
~1 s per query dal computer di audit. Verificare regione Vercel/Supabase, pooler, cold start e `connection_limit`.

### MEDIO - Lint
`npm run lint` fallisce con ~1995 problemi preesistenti. I nuovi file onboarding passano ESLint. Serve una baseline o una pulizia progressiva.

### MEDIO - Monitoraggio, backup e incident response
Mancano error tracking, uptime check, alert a una persona, restore testato, SLO/RPO/RTO e runbook.

### MEDIO - SEO e metadata
Mancano `app/robots.ts`, `app/sitemap.ts` e metadata specifici per le pagine pubbliche. L'immagine OpenGraph è un SVG, non supportato da molte piattaforme.

### MEDIO - Test automatici
Non ci sono test unitari/integration nel repository. Esistono script e2e manuali, ma non una CI che li esegua su ogni push.

### BASSO - Dipendenze major
Prisma 5, Stripe 22, next-auth beta e React 19.2.8 restano indietro. Non sono vulnerabilità note, ma vanno pianificati upgrade con test.

## 5. Check ancora da eseguire

- Penetration test autenticato (API + UI) su ASVS Level 2.
- Test di ripristino backup con data e durata registrate.
- Uptime/error monitoring e alert reali.
- Test di carico 5-10× il traffico atteso.
- Audit accessibilità WCAG 2.2 AA con axe o equivalente.
- Verifica DPA e sub-responsabili (Supabase, Vercel, UploadThing, Google, Stripe, Openapi).
- Policy di retention per KYC, DDT, fatture e chiamate.
- Verifica email e reset password con provider transazionale (SPF/DKIM/DMARC).
- MFA per ADMIN e ruoli sensibili.
- CI con lint baseline, typecheck, build, test multi-tenancy e smoke.
- Decisione su Level 2 review e pagamento post-trial.

## 6. Comandi

```bash
npx tsc --noEmit
npm run build
npx prisma validate
npm audit --omit=dev
npx tsx scripts/test-multi-tenancy.ts
npx tsx scripts/smoke-local.ts
node scripts/audit-ui.cjs
```

`scripts/audit-ui.cjs` richiede `puppeteer-core` con `npm install --no-save puppeteer-core` e Microsoft Edge.

## 7. Fonti

- OWASP ASVS 5.0.0: https://asvs.owasp.org/
- OWASP ASVS GitHub: https://github.com/OWASP/ASVS
- Production readiness SaaS: https://www.t-matglobal.com/blog/production-readiness-checklist-saas-startups
- SaaS launch checklist: https://launchsaas.dev/resources/production-saas-checklist
- Prisma multi-tenant: https://www.prisma.io/postgres/multi-tenant-saas-database
- Next.js headers: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- Stripe webhook signature: https://docs.stripe.com/webhooks/signature
- Stripe Identity: https://stripe.com/identity
- GDPR / Garante: https://www.garanteprivacy.it/

_Nota: non sostituisce penetration test, consulenza legale/privacy o verifica formale ASVS._
