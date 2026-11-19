# Truck Radar — Assetto societario e incentivi

Documento di sintesi delle valutazioni fatte su forma giuridica, incentivi e requisiti dei fondatori. Non sostituisce il parere di commercialista, notaio o perito.

## 1. Forma giuridica consigliata

- **Fase 1 — solo gestionale in abbonamento (BASE 59€/PRO 199€, trial 21 giorni): SRLS sufficiente.**
  - È una società di capitali: responsabilità limitata, può fatturare B2B, aprire Stripe Billing ed essere titolare del trattamento GDPR.
  - Capitale da 1€ a 9.999,99€, interamente versato in denaro; solo soci persone fisiche; statuto standard; nessuna personalizzazione delle clausole.
  - Costi di costituzione e gestione più bassi rispetto alla SRL ordinaria.
- **Quando passare alla SRL ordinaria (o Startup Innovativa):**
  - investitori, soci con vesting/patti parasociali, piani di incentivazione;
  - marketplace, subappalto, commissioni, Stripe Connect;
  - esigenza di clausole personalizzate o categorie di quote.
- **SPA:** solo in fase VC/exit (capitale 50.000€ e governance più pesante).
- **Ditta individuale: esclusa** (responsabilità illimitata, minore credibilità B2B, incompatibile con il percorso fintech/invoice trading).
- **Separazione dei ruoli:** la newco del software deve restare distinta dall'azienda di trasporti di famiglia. Il codice/IP va intestato alla newco; verso l'azienda di famiglia serve un contratto di beta test/licenza a condizioni di mercato. Se la SRLS la costituiscono i genitori, il figlio sviluppatore deve essere socio o avere un contratto scritto di cessione IP/licenza.

## 2. Informazioni da dare al commercialista

1. **Soci/fondatori:** nome, cognome, codice fiscale, data e luogo di nascita, residenza, cittadinanza, documento, quota, conferimento, eventuale accordo tra soci.
2. **Società:** 2-3 denominazioni alternative, sede legale, PEC, email, telefono, sito, ATECO (62.01.00 produzione software; 62.02.00 consulenza IT; 63.11.00/63.12.00 hosting/piattaforme web), codice SDI, regime IVA ordinario.
3. **Capitale e governance:** importo capitale, versamento in denaro, amministratore unico/consiglio, poteri, firma, eventuali procuratori, banca.
4. **Business:** SaaS B2B, abbonamenti BASE/PRO, trial, clienti Italia/UE/extra-UE, incassi Stripe, costi provider esteri (Supabase, Vercel, UploadThing, Google, Openapi, Resend), previsioni 12-24 mesi, collaboratori/dipendenti.
5. **Agevolazioni:** Startup Innovativa, Fondo di garanzia PMI, credito d'imposta R&S, bandi Emilia-Romagna/Ferrara-Ravenna, eventuale regime IVA OSS/IOSS.
6. **Documenti:** documenti identità, PEC, firma digitale, conto bancario, contratto beta/licenza con l'azienda di famiglia, cessione IP alla SRLS, privacy/termini/cookie, DPA fornitori, RC professionale/prodotto.

## 3. Fondatori: cittadinanza, residenza, età

- Cittadinanza rumena + residenza fiscale italiana: nessun problema. Cittadini UE; servono codice fiscale, documento valido, PEC e assenza di cause di inibizione.
- Nessun limite di età per costituire una SRLS.
- L'età rileva solo per bandi specifici: padre (1980) fuori dai programmi under 35; madre (1983), come donna, può rientrare in alcuni bandi ON/imprenditoria femminile, da verificare sul singolo avviso.
- Ferrara: esclusa da Resto al Sud/ZES; rientra nei bandi nazionali ed Emilia-Romagna e nei voucher della Camera di Commercio Ferrara-Ravenna.

## 4. Transizione 5.0 / Iperammortamento 2026

- **Non esiste una "certificazione Trasporto 5.0".** La vecchia Transizione 5.0 (contributo con requisito di risparmio energetico 3%/5%) è chiusa dal 31/12/2025.
- Dal 2026 vale il **Nuovo Piano Transizione 5.0 — Iperammortamento** (L. 199/2025; DL 38/2026): investimenti dal 1/1/2026 al 30/9/2028, maggiorazione del costo ai fini IRES/IRPEF, nessun requisito di risparmio energetico.
- **La certificazione è dell'investimento, non del software:** perizia tecnica asseverata + certificazione contabile + comunicazioni al GSE.
- **SaaS in abbonamento escluso.** Sono agevolabili i software acquistati come beni ammortizzabili (licenza capitalizzata B.I.3/B.I.4), nuovi e interconnessi al sistema aziendale.
- **Possibile inquadramento del TMS:** Allegato V, lettera bb) della L. 199/2025 — software per gestione e coordinamento della logistica con elevata integrazione dei servizi (logistica di fabbrica, movimentazione, spedizione, catena di fornitura). La classificazione va confermata dal perito.
- **Percorso consigliato:** offrire anche una licenza Enterprise on-prem/perpetua (il repo ha già il release pack Docker/self-hosted), distinta dal SaaS. La SRLS di famiglia acquista la licenza, la capitalizza e può accedere all'iperammortamento; la newco fattura la licenza.
- **Vincoli:** il bene deve essere nuovo (non già in uso), destinato a struttura produttiva italiana, con documentazione tecnica e pagamenti tracciati; se fornitore e cliente sono collegati, il prezzo deve essere di mercato.
- **Natura del beneficio:** l'iperammortamento è una deduzione fiscale, non un contributo in cash; rende solo in presenza di utili.
- **Alternative più immediate:** Bando Doppia Transizione della Camera di Commercio Ferrara-Ravenna (50% fino a 5.000€, spese minime 3.000€, ammette software/cloud/SaaS; edizione 2026 chiusa il 25/09/2026, monitorare la prossima) e Nuova Sabatini per licenze software capitalizzate (non canoni SaaS).

## 5. Riferimenti utili

- MIMIT — Nuovo Piano Transizione 5.0 / Iperammortamento 2026.
- L. 30/12/2025 n. 199, Allegati IV e V.
- DL 27/03/2026 n. 38, convertito in L. 22/05/2026 n. 88.
- Nuova Sabatini — FAQ MIMIT su software e beni immateriali.
- Camera di Commercio Ferrara-Ravenna — Bando Doppia Transizione.
