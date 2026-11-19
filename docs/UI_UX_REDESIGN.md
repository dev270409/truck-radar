# Truck Radar — UI/UX redesign "Radar Ops"

Data: 12/11/2026. Direzione applicata dopo l'installazione di `design-taste-frontend` (Taste Skill) in `.agents/skills/design-taste-frontend`.

## 1. Direzione

- **Pubblico**: carta calda, inchiostro, palette originale Truck Radar ripristinata (blu notte, arancio segnale, teal, ambra). Sito chiaro, editoriale, con product UI reale.
- **Dashboard**: grafite caldo, sempre scura, pannelli solidi, hairline, zero vetro e zero gradienti. L'accento arancio marca azioni, stato attivo e link.
- **Regola**: 90–95% neutro, un solo accento, una sola famiglia di bottoni, una sola scala di spaziature, una sola tipografia.
- **Anti-AI**: righe operative al posto delle griglie di card, sezione "Per chi è", numeri reali in evidenza, pricing e integrazioni a tabella, meno elementi decorativi.

## 2. Token

In `app/globals.css`:

- `--brand` / `--accent`: arancio `#c74312` (light) / `#e8541f` (dark).
- `--success` teal, `--warning` ambra, `--danger` rosso, `--info` blu.
- superfici: `--surface`, `--surface-soft`, `--surface-border`, `--surface-shadow`.
- testo: `--text`, `--text-soft`, `--text-label`, `--text-label-soft`.
- radius: `--radius-base` 10, `--radius-card` 16.
- tema: `:root` chiaro (pubblico), `[data-theme="dark"]` scuro (dashboard).

## 3. Tipografia

- Display: **Archivo** (`--font-archivo`).
- Testo: **Inter** (`--font-inter`).
- Numeri e targhe: **JetBrains Mono** (`--font-jetbrains`).
- Titoli con tracking negativo, corpo 14–16px, label 11px senza maiuscoletto forzato.

## 4. Componenti

Classi introdotte in `globals.css`:

- `.ops-card`, `.ops-card--flat`, `.ops-card--soft`, `.ops-divider`
- `.ops-btn`, `.ops-btn--primary`, `.ops-btn--secondary`, `.ops-btn--ghost`, `.ops-btn--sm`, `.ops-btn--block`
- `.ops-input`, `.ops-select`, `.ops-textarea`, `.ops-label`
- `.ops-title`, `.ops-subtitle`, `.ops-eyebrow`, `.ops-meta`
- `.ops-page`, `.ops-page-head`, `.ops-kpi`, `.ops-kpi__label`, `.ops-kpi__value`
- `.ops-table`, `.ops-empty`
- `.app-frame`, `.app-frame__bar`, `.app-frame__side`, `.app-frame__dot`

## 5. Cosa è cambiato

- `app/layout.tsx`: font Archivo/Inter/JetBrains Mono, rimosso ThemeProvider/prompt tema e script anti-FOUC. Tema deciso per sezione: pubblico chiaro, dashboard scuro.
- `app/globals.css`: nuovo sistema "Radar Ops"; rimossi vetro e gradienti; override scoped per le vecchie classi slate dentro `.dashboard-dark` e `.register-dark`.
- `components/OpsTopbar.tsx`: barra solida 64px, ricerca, CTA "Nuovo viaggio", rimosso toggle tema.
- `components/BottomNav.tsx`: 5 voci operative (Home, Viaggi, Carico, Preventivi, Ordini), stato attivo arancio.
- `components/SidebarNav.tsx`: nuova navigazione a gruppi con stato attivo, badge PRO/SOON, icone tinte.
- `app/dashboard/layout.tsx`: usa `SidebarNav`, avvolge la dashboard in `data-theme="dark"` e `.dashboard-dark`.
- `app/page.tsx`: landing riscritta con hero, product UI frame, funzioni, carico→margine, network, integrazioni, prezzi, FAQ e CTA.
- `app/(auth)/login/page.tsx`: login split-screen, form con label visibili, input 44px, un solo bottone primario.
- `app/(auth)/register/RegisterForm.tsx`: wrapper `register-dark` e tema scuro coerente.

## 6. Verifica

- `npx tsc --noEmit` → pulito.
- `npm run build` → pulito, 106 pagine generate.
- Il build ha richiesto la rimozione del BOM UTF-8 da `app/globals.css` (Lightning CSS/Turbopack falliva con "Invalid dangling combinator in selector").

## 7. Note

- `ThemeProvider.tsx` e `ThemeToggle.tsx` restano nel repo ma non sono più montati. Possono essere rimossi in un secondo momento.
- Le pagine dashboard che usano ancora `bg-slate-*` vengono armonizzate dagli override scoped; le pagine nuove possono adottare direttamente `.ops-card`, `.ops-btn`, `.ops-input`.
- Taste Skill installato con `npx skills add ...`; l'installer ha segnalato "Critical Risk" (Gen) e "Med Risk" (Snyk). Usare solo le linee guida e gli asset, non eseguire script del kit senza revisione.
- Prossimo passo consigliato: QA visiva con Chrome headless (1440/1024/768/390) su landing, login, dashboard e pagina carico; poi applicare `.ops-*` alle pagine dashboard rimanenti.
