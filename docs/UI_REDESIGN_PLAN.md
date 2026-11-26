# Direzione redesign — landing e gestionale

Aggiornato: 26 novembre 2026. Pagina type: **software**. Nessuna modifica in questa pianificazione autorizza l'uso di dati TAROS privati nella landing.

## Direzione in cinque righe

- **Prodotto:** Truck Radar collega flotta, viaggi, rendiconti, documenti e costi per le aziende di autotrasporto.
- **Carattere:** operativo, preciso, concreto.
- **Mondo visivo:** dispatch office, documenti di trasporto, telemetria e strade italiane.
- **Momenti:** anteprima prodotto (flusso rendiconto → match → assegnazione) e benchmark con copertura/fonti leggibili.
- **Firma:** una linea di percorso blu; arancio solo per l'eccezione che richiede attenzione.

## Audit iniziale

### Pubblico: `app/page.tsx`, `app/prezzi/page.tsx`, `public/dashboard-preview.svg`

- Dati inventati nel preview: aziende, targhe, tratte, margini, KPI; badge `Live` fa credere che siano dati reali.
- `dashboard-preview.svg` mostra un'altra dashboard con numeri e menu obsoleti, ma è l'Open Graph corrente.
- Claim “Dati in UE” non corretto come promessa generale: il DB è UE, ma alcuni fornitori e servizi AI non hanno la stessa residenza.
- Claim “Supporto in italiano”, “non devi cambiare GPS/TMS/ERP” e alcune integrazioni non hanno fonte/attivazione garantita.
- Borsa, subappalto e Smart Return vengono presentati come disponibili senza chiarire i gate di verifica/piano.
- Headline in frammenti/contrasti ripetuti (“Meno telefono. Meno Excel.”, “Non sei solo. Sei in rete.”).
- Due piani BASE/PRO mandano entrambi a `/register`, ma l'API crea sempre BASE.
- `/prezzi` duplica i prezzi, ha stile legacy, testo con mojibake e ripete i claim UE. Il contenuto deve avere una sola fonte.

### Gestionale

- Home (`app/dashboard/page.tsx`): “Benvenuto, Mario”, card Prossima azione e forecast sono utili, ma seguono 4 contatori + 4 KPI + grafico + flotta + scadenze + integrazioni + KYC; troppe priorità simultanee.
- Benchmark (`app/dashboard/benchmark/page.tsx`): dati corretti ma un solo mese importato copre circa il 4% dei viaggi Geotab. La copertura deve precedere il margine, e il trend mensile non è visibile.
- Viaggi (`app/dashboard/trips/page.tsx`): lista lunga, mancano filtri rapidi e una chiara coda “Da assegnare”.
- Registrazione usa il form API corretto ma visivamente è più legacy del login; la richiesta server include dati aziendali obbligatori, non vanno rimossi senza cambiare il contratto.
- CSS globale usa `transition: all` in alcuni punti, classi `enter-up`, etichette maiuscole e stili legacy in alcune pagine. Fare una migrazione mirata, non una riscrittura indiscriminata.

## Uso concreto delle risorse

| Risorsa | Licenza/stato verificato | Decisione per questo redesign |
|---|---|---|
| `skills.sh` / `vercel-labs/skills` | CLI per installare skill in scope globale; non è runtime | Usata per installare `unslop`, `web-design-guidelines` e `vercel-react-best-practices` globalmente. |
| Taste Skill | Skill locale già presente in `.agents/` e bloccata da `skills-lock.json` | Usata per copy, preview, gerarchia, responsive e gate; non copiare il kit nel bundle. |
| Unslop | CC BY 4.0 | Usata per audit e direzione. Nessuna schermata/demo o materiale del kit è stato copiato. |
| Vercel Web Interface Guidelines | Snapshot locale versionato | Applicate su focus, form, riduzione del movimento e stato dei dati. |
| Motion for React | MIT; React 18/19 supportati nella release verificata | Valutato, non installato: i micro-movimenti scelti sono realizzati con CSS nativo e `prefers-reduced-motion`, senza un runtime client in più. |
| Anime.js v4 | MIT | Valutato, non installato: il singolo percorso SVG si disegna con CSS e ha uno stato finale statico per reduced motion. |
| Bklit UI | Componenti chart MIT; Studio proprietario. Il line chart documenta dipendenze `d3-*` e Motion | Non integrato: l’API benchmark espone aggregati, non una serie mensile attendibile. Il grafico esistente usa dati reali e non richiede una libreria. Rivalutare quando esiste lo storico mensile. |
| Kokonut UI | Repo pubblico MIT; Pro è separato | Non integrato: nessun componente gratuito individuato aggiunge valore operativo distinto dai controlli esistenti; la libreria non è un design system per il gestionale. |
| ARTEX | AGPL-3.0; applicazione di penetration testing | Escluso: non è OCR né UI. |
| Baidu Unlimited-OCR | Modello MIT, con serving Python/GPU e percorso `trust_remote_code` | Non integrato: costi/operatività non giustificati per l’uso attuale; resta il flusso esistente `unpdf` + Gemini per scansioni. |

Nessun pacchetto UI/chart runtime viene aggiunto. Nessun servizio a pagamento o immagine generata viene attivato.

### Fonti OSS

- [Motion for React](https://motion.dev/docs/react) · [Anime.js](https://animejs.com/documentation/)
- [Bklit UI: repository/licenze](https://github.com/bklit/bklit-ui) · [Line chart e dipendenze](https://bklit.com/docs/components/line-chart)
- [Kokonut UI: repository/licenza](https://github.com/kokonut-labs/kokonutui)
- [skills.sh](https://skills.sh/) · [Unslop](https://github.com/heydamir/unslop)
- [ARTEX](https://github.com/BaaRai/ARTEX) · [Unlimited-OCR](https://github.com/baidu/Unlimited-OCR)

## Sequenza di implementazione

1. **Landing/funnel — applicato:** claim non dimostrati tolti; preview anonima senza KPI o aziende finte; BASE/PRO passano alla registrazione e l’API salva il piano scelto; `/prezzi` porta alla sezione prezzi canonica.
2. **Home — applicato:** intestazione contestuale, un’azione primaria, coda delle eccezioni, tre metriche; rimossi pannelli duplicati di flotta/KYC/integrazioni dalla home, senza togliere le pagine di gestione.
3. **Benchmark — applicato:** copertura e avvisi precedono i valori; il KPI di margine è stato sostituito dalla copertura; costo/km è marcato come potenzialmente stimato.
4. **Viaggi — applicato:** ricerca per tratta, cliente, targa o autista e filtri per da assegnare, attivi e completati; assegnazione manuale invariata.
5. **Auth — applicato in parte:** piano visibile e inviato al server; campi con autocomplete e stati di errore più accessibili. Restano da rifinire i dettagli visuali del form.

## Verifica

- Next.js 16.4.6 locale: leggere guide pertinenti in `node_modules/next/dist/docs/` prima di cambiare codice.
- Test: `npx tsc --noEmit`, `npm run build`, ESLint mirato e controlli HTTP locali; nessun test ha scritto sul database live.
- Landing: screenshot production a 1440, 1024, 820, 768 e 390; copy e funnel controllati. Web Interface Guidelines applicate a focus, form e reduced motion.
- Gestionale: home, benchmark e viaggi aggiornati; lo smoke visivo autenticato delle pagine protette resta da fare. Nessun dato TAROS reale è stato inserito nella landing o nei mock pubblici.
- Gli artefatti `.taste-skill/` restano locali e ignorati; il bundle non importa tutta la skill/UI library.

### Gate Taste — stato

L’ultima esecuzione locale ha restituito `GATE: FAIL 59` (round 2/3); non ho aggiunto waiver né dichiarato il gate superato. I rilievi principali sono la diversa struttura del design system (`.ops-*` invece del kit `.hero/.wrap` completo), l’assenza del loader dei momenti del kit e le altezze delle sezioni; il checker classifica inoltre FAQ e prezzi senza foto come `no-visual`, benché siano eccezioni consentite dalle sue regole. Il responsive è stato controllato separatamente con screenshot a 390, 768, 820, 1024 e 1440px.
