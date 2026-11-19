# Pro Connect — numero aziendale, email documenti e prezzi

Ricerca del 18/11/2026. Obiettivo: capire se il piano Pro può includere un numero di telefono aziendale e una casella email per i documenti, con attivazione automatica dai dati KYB, e come usarlo per spingere i piani superiori senza fare guerra sul prezzo.

**Verdetto: sì, è fattibile.** Non conviene però diventare operatore telefonico, registrar o provider di caselle email. Conviene usare partner (Telnyx/Twilio per voce, Postmark/Cloudflare per email in ingresso, Gemini/Document AI per i documenti) e vendere il **risultato**: documenti già classificati, telefonate già trascritte e collegate al viaggio.

## 1. Cosa deve fare il Pro

### Numero aziendale
- Numero dedicato all'azienda, italiano, visibile su sito/insegna/fatture.
- Chiamate in ingresso inoltrate al cellulare o all'ufficio, con orari e voicemail.
- Registro chiamate nella dashboard: chi ha chiamato, quando, durata, trascrizione, riassunto, cliente/viaggio collegato.
- SMS/WhatsApp in ingresso solo se il cliente li usa davvero; non automatizzare WhatsApp Web.
- Attivazione con dati KYB già presenti: ragione sociale, P.IVA, sede, rappresentante, documenti. L'utente conferma, il partner approva.

### Email documenti
- Indirizzo dedicato tipo `azienda@in.truck-radar.it` oppure `documenti@azienda.it` in inoltro.
- Classificazione automatica: DDT, fattura, bolla, ordine di ritiro, packing list, CMR, POD, libretto, patente/CQC, assicurazione, revisione, multa, ricevuta carburante, nota spese, visura, DURC, Albo, REN.
- Estrazione campi: cliente/fornitore, data, numero documento, targa, autista, viaggio, importo, IVA, scadenza.
- Coda di revisione solo per bassa confidenza; il resto va collegato a viaggio/mezzo/cliente/scadenza.
- Archivio ricercabile per targa, cliente, data, tipo, fonte.

### Regola di prodotto
Il Pro non deve vendere “più mezzi”. Deve vendere **meno lavoro manuale**:
- 1 numero aziendale attivo senza configurare centralini.
- 1 casella documenti che non richiede ricopiare fatture e DDT.
- 300 documenti/mese gestiti dall'AI.
- Telefonate e documenti già collegati alla dashboard.

## 2. Architettura consigliata

### Voce: Telnyx come primo fornitore
Telnyx è più adatto di Twilio per il caso italiano:
- Numero locale Italia da **2 USD/mese**.
- Voce in ingresso Italia: **0,008 USD/min** + **0,002 USD/min** di Voice API = circa **0,01 USD/min**.
- Registrazione chiamata: **0,002 USD/min**; storage incluso.
- SMS Italia: da **0,004 USD/part** + eventuali fee carrier (da verificare sul rate deck).
- KYC obbligatorio per numeri italiani: visura, P.IVA, indirizzo, documento del rappresentante, prova indirizzo entro 3 mesi.

Twilio resta un fallback:
- Non espone numeri locali italiani nel listino CSV: solo mobile “clean” a **45 USD/mese** e toll-free a **27 USD/mese**.
- SMS Italia: **0,0927 USD** outbound, **0,02 USD** inbound.
- Voce da EEA verso mobile Italia: **0,0445 USD/min**.
- Registrazione: **0,0025 USD/min** + storage; trascrizione Twilio: **0,05 USD/min** (da evitare, troppo cara).

**Attenzione legale:** Twilio vieta di sub-assegnare, trasferire, affittare o rivendere numeri italiani allocati a Twilio. Per il MVP non comprare numeri in nome Truck Radar e rivenderli. Usare:
1. numero del cliente in inoltro/portabilità, oppure
2. subaccount/contratto intestato al cliente, oppure
3. accordo di reseller scritto con il provider prima di vendere numeri.

La portabilità italiana richiede LOA, codice segreto del vecchio operatore e ultima fattura. Può richiedere giorni o settimane.

### Email: Postmark per partire, Cloudflare per scalare
- **Postmark Pro**: 16,50 USD/mese per 10.000 email, inbound incluso, webhook e allegati. È la strada più rapida per l'MVP.
- **Cloudflare Email Routing**: inbound illimitato gratis; Worker per parsare la mail. Workers Paid da 5 USD/mese, 3.000 email outbound incluse. Più economico a volume, più lavoro tecnico.
- **Cloudflare Email Routing** non è una casella: inoltra o passa a un Worker, non ha IMAP/webmail. Per questo va benissimo per “documenti in arrivo”, non per sostituire Gmail.
- Non chiedere la password della casella personale. Usare inoltro automatico, OAuth in sola lettura o app password revocabile.

### Dominio e casella
- **Pro**: indirizzo su dominio Truck Radar (`azienda@in.truck-radar.it`) + inoltro dal dominio del cliente. Nessun MX del cliente da cambiare, nessuna casella da ospitare.
- **Business**: dominio personalizzato completo e, se richiesto, casella reale.
- **Non fare il registrar nel Pro.** Se serve, rivendere tramite Openprovider o lasciare il dominio al cliente. Un `.it` retail costa circa 9–12 €/anno + IVA; il margine non vale il carico amministrativo.
- Se il cliente vuole una casella vera: Zoho Mail Lite **0,90 €/utente/mese** annuale (5 GB) o Google Workspace Business Starter **6,80 €/utente/mese** annuale. Rivendere solo con accordo partner; altrimenti “porta la tua casella”.

### AI documenti
- **Gemini diretto** per classificazione + estrazione: costo marginale molto basso, riusa il pattern già presente in `lib/kyb/ai.ts`.
- **Google Document AI Invoice Parser** come fallback per fatture difficili: **0,10 USD per documento fino a 10 pagine**; OCR **1,50 USD/1.000 pagine**; Form Parser/Custom Extractor **30 USD/1.000 pagine**.
- Budget prudente: **0,01–0,03 €/documento** con Gemini; **0,10 USD** solo sui documenti che falliscono la prima estrazione.
- 300 documenti/mese: circa **6–15 €/mese** di AI, non 300 €.

## 3. Costi reali per cliente Pro

Scenario: 1 numero, 300 minuti in ingresso, 200 minuti inoltrati al cellulare, 300 documenti, 5 utenti.

| Voce | Costo mensile stimato |
|---|---:|
| Numero Telnyx Italia | 2 USD |
| Ingresso voce 300 min × 0,01 USD | 3 USD |
| Inoltro 200 min × 0,0445 USD (stima conservativa) | 8,90 USD |
| Registrazione/trascrizione 300 min | 5–8 USD |
| Email inbound + storage | 1–2 USD |
| AI documenti 300 | 6–15 USD |
| Infrastruttura, storage, backup | 5 € |
| Supporto di primo livello | 10–15 € |
| Commissioni Stripe | 2–3 € |
| **Totale COGS** | **circa 40–55 €/mese** |

A **149 €/mese** il margine lordo è circa **63–73%**. A **179 €/mese** è circa **69–78%**. A **199 €/mese** è circa **72–80%**. Il numero non è il costo che uccide il margine: è l'inoltro vocale e il supporto. Per questo il Pro deve includere un fair use di minuti e spingere l'app/voce IP per l'uso intenso.

## 4. Prezzi consigliati

### Base — 59 €/mese
- Fino a **5 mezzi** e **5 autisti**.
- 2 utenti.
- Gestionale completo: viaggi, DDT, scadenze, flotta, documenti manuali, analytics di base.
- Caricamento documenti manuale.
- Nessun numero aziendale, nessuna casella AI.
- Supporto email.

Perché 5 e non 3: 3/3 sembra punitivo per una micro-flotta che ha già 4–5 mezzi e genera upgrade forzati prima che il cliente abbia visto valore. 5/5 copre il “micro” e lascia il vero salto al Pro, che non è più “più mezzi” ma “meno lavoro”.

### Pro — 179 €/mese (listino 199 €)
- Fino a **25 mezzi** e **25 autisti**.
- 5 utenti.
- **1 numero aziendale** con inoltro, voicemail, registro chiamate e trascrizione.
- **1 indirizzo documenti** su dominio Truck Radar + inoltro dal dominio del cliente.
- **300 documenti AI/mese** inclusi; extra a pacchetti.
- Coda “Da classificare / Da collegare / Da approvare”.
- Collegamento automatico a viaggio/mezzo/cliente/scadenza.
- Supporto prioritario.

### Business — 349 €/mese
- Fino a **100 mezzi** e **100 autisti**.
- 15 utenti.
- **3 numeri** e **3 indirizzi documenti**.
- **1.000 documenti AI/mese**.
- Dominio personalizzato completo, casella opzionale.
- WhatsApp Cloud API, API/ERP, SLA, onboarding dedicato.
- Multi-sede.

### Add-on
- Numero aggiuntivo: **9 €/mese** + traffico.
- 100 documenti AI: **9 €**.
- 100 minuti di trascrizione: **9 €**.
- Portabilità numero esistente: **49 €** una tantum.
- Dominio + casella: a costo + **5 €/mese** di gestione.
- WhatsApp: pacchetto da **15 €/500 messaggi** (i costi Meta sono separati e possono superare il pacchetto).

**Non inserire WhatsApp nel Pro base.** I messaggi marketing in Italia costano **0,0658 €** ciascuno e i utility/service **0,0248 €** dopo 1.000 risposte gratuite per numero/mese. Un cliente che fa campagne può bruciare il margine in un pomeriggio. Venderlo come add-on a consumo.

## 5. Gating: cosa mettere in Base, Pro, Business

| Funzione | Base | Pro | Business |
|---|---|---|---|
| Mezzi/autisti | 5/5 | 25/25 | 100/100 |
| Utenti | 2 | 5 | 15 |
| Documenti manuali | Sì | Sì | Sì |
| OCR libretto / TCO | Sì | Sì | Sì |
| Casella documenti AI | No | 1 | 3 |
| Documenti AI/mese | 0 | 300 | 1.000 |
| Numero aziendale | No | 1 | 3 |
| Trascrizione chiamate | No | 300 min | 1.000 min |
| Dominio personalizzato | No | Inoltro | Completo |
| WhatsApp | No | Add-on | Incluso a consumo |
| API/ERP | No | No | Sì |
| SLA/onboarding | No | Prioritario | Dedicato |

Regola commerciale: il Base deve essere **onesto e completo** per una micro-flotta. Il Pro deve sembrare un'assunzione in meno, non un limite in più. Il Business deve vendere multi-sede, API e volumi.

## 6. Attivazione automatica da KYB

Il KYB fornisce già i dati che servono al provider telefonico:
- ragione sociale, P.IVA, sede legale;
- rappresentante legale, documento, luogo/data di nascita;
- visura camerale, prova indirizzo;
- PEC, email, telefono.

Flusso:
1. L'admin completa il KYB.
2. Truck Radar precompila la richiesta numero con quei dati.
3. L'utente conferma indirizzo e rappresentante, carica la prova indirizzo se manca.
4. Il partner approva (1–3 giorni lavorativi).
5. Il numero viene attivato e appare in “Impostazioni > Numero aziendale”.
6. Per l'email basta creare l'indirizzo `slug@in.truck-radar.it`; nessun KYB aggiuntivo.

Non promettere attivazione istantanea: la revisione regolatoria italiana può richiedere giorni. Mostrare lo stato “In verifica”.

## 7. Compliance e rischi

### Numero e voce
- KYC per numero italiano: obbligatorio. Il numero deve essere intestato all'azienda che lo usa.
- Non rivendere numeri senza accordo scritto: Twilio vieta la sub-assegnazione dei numeri italiani; verificare Telnyx.
- Portabilità: LOA + codice segreto + fattura; tempi non istantanei.
- Chiamate registrate: in Italia chi partecipa può registrare, ma l'azienda deve dare informativa GDPR, definire base giuridica e retention. Per i dipendenti vale anche l'art. 4 Statuto dei Lavoratori.
- Registrare solo se serve (qualità, prova dell'ordine). Default: trascrizione senza audio o audio con retention 30 giorni.

### Email e documenti
- Non accedere alla casella personale con password. Solo inoltro/OAuth/app password revocabile.
- DPA con Postmark/Cloudflare/Google/Telnyx; aggiornare l'informativa.
- Retention documenti: 10 anni per fatture, ma solo se il cliente è titolare; Truck Radar è responsabile del trattamento.
- Antivirus/scansione allegati prima di aprirli; limiti dimensione (Cloudflare 25 MiB; Postmark ha limiti propri).
- Non addestrare modelli sui dati del cliente senza base contrattuale.

### WhatsApp
- Solo Cloud API ufficiale, mai WhatsApp Web automation.
- Numero fisso italiano verificabile via chiamata vocale; il numero non deve essere già attivo su WhatsApp.
- Messaggi marketing solo con opt-in; template approvati.
- Costi Meta: marketing 0,0658 €, utility/auth/service 0,0248 € per l'Italia; 1.000 risposte service gratuite per numero/mese; prezzi in vigore da ottobre 2026 e modificabili.

## 8. Piano di implementazione

### Fase 0 — 1–2 settimane, senza partner
1. Coda unica “Documenti in arrivo” con upload manuale e stati.
2. Campi `phone`, `documentEmail`, `customDomain`, `aiDocsUsed`, `phoneMinutesUsed` su Company/Subscription.
3. Gating Base/Pro con lock e messaggio “Disponibile in Pro”.
4. Precompilazione KYB per la richiesta numero.
5. Migrazione soft: clienti Base esistenti mantengono 15/15 per 12 mesi.

### Fase 1 — 2–4 settimane, email
1. Dominio `in.truck-radar.it` su Postmark o Cloudflare.
2. Webhook inbound → classificazione Gemini → estrazione → coda revisione.
3. Prima integrazione: DDT/fatture/ordini di ritiro.
4. Metriche: % classificati automaticamente, tempo medio per documento, errori.

### Fase 2 — 3–5 settimane, voce
1. Subaccount Telnyx o numero del cliente in inoltro.
2. Webhook chiamate, registrazione/trascrizione, riassunto AI.
3. Dashboard “Chiamate” con cliente/viaggio collegato.
4. Fair use e pacchetti minuti.

### Fase 3 — 4–6 settimane, dominio e WhatsApp
1. Dominio personalizzato completo.
2. Casella opzionale (Zoho/Google) solo per Business.
3. WhatsApp Cloud API con template e opt-in.
4. API/ERP e SLA per Business.

## 9. Cosa validare prima di costruire

Intervistare 5–10 padroncini/PMI con 3–20 mezzi:
- Quante chiamate al giorno? Chi le riceve? Quante perse?
- Il numero deve restare quello storico o va bene un numero nuovo?
- I documenti arrivano su email, WhatsApp o carta? Chi li ricopia?
- Quanti documenti al mese? Quali tipi?
- Quanto pagherebbe per non ricopiare DDT/fatture? 30, 50, 80 €/mese?
- Vuole una casella Truck Radar o vuole tenere Gmail/Outlook?
- È disposto a cambiare MX o preferisce un inoltro?

Metriche di successo:
- ≥ 70% documenti classificati senza intervento.
- ≤ 2 minuti per documento a bassa confidenza.
- ≥ 20% riduzione del tempo di data entry.
- ≥ 100 minuti/mese di chiamate sul numero Pro.
- ≥ 30% dei clienti Pro usa almeno una volta al mese la casella documenti.
- Churn Base < 3%/mese dopo il passaggio a 5/5.

## 10. Decisione consigliata

1. **Base 59 €, 5 mezzi/5 autisti, manuale.** Non 3/3: troppa frizione.
2. **Pro 179–199 €, 25/25, 1 numero + 1 casella + 300 documenti.** Il valore è l'automazione, non il limite.
3. **Business 349 €, 100/100, multi-numero/dominio/API/WhatsApp.**
4. **Email con Postmark per l'MVP; Cloudflare a volume.** Non ospitare caselle nel Pro.
5. **Voce con Telnyx, ma numero intestato al cliente o accordo reseller.** Non rivendere numeri Twilio Italia.
6. **WhatsApp solo add-on a consumo.** Non includerlo nel Pro.
7. **Nessun cambio di listino pubblico senza 5–10 interviste.** Usare i clienti esistenti come design partner e grandfathering.

## 11. Fonti

- Twilio — Italy regulatory guidelines: https://www.twilio.com/en-us/guidelines/it/regulatory
- Twilio — Italy voice pricing: https://www.twilio.com/en-us/voice/pricing/it
- Twilio — Italy SMS pricing: https://www.twilio.com/en-us/sms/pricing/it
- Twilio — Numbering requirements / divieto di sub-assegnazione: https://www.twilio.com/en-us/legal/numbering-requirements
- Twilio — Italy porting: https://help.twilio.com/articles/360052800694
- Telnyx — Italy numbers: https://telnyx.com/phone-numbers/italy
- Telnyx — Italy DID requirements: https://support.telnyx.com/en/articles/1311462-italy-did-requirements
- Telnyx — Voice API pricing: https://telnyx.com/pricing/voice-api
- Telnyx — SIP trunking pricing: https://telnyx.com/pricing/elastic-sip
- Telnyx — Messaging pricing: https://telnyx.com/pricing/messaging
- Postmark — Pricing: https://postmarkapp.com/pricing
- Cloudflare — Email Service pricing: https://developers.cloudflare.com/email-service/platform/pricing/
- Google Cloud — Document AI pricing: https://cloud.google.com/products/document-ai/pricing
- Meta — WhatsApp Business Platform pricing: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Meta — Business phone numbers: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers/
- Zoho Mail — Pricing: https://www.zoho.com/mail/zohomail-pricing.html
- Google Workspace — Pricing: https://workspace.google.com/business/
- Openprovider — .it requirements: https://openprovider.help/books/domains/page/it
- Stiva — competitor/prezzi: `docs/COMPETITOR_STIVA.md`
- Simplification research: `docs/SIMPLIFICATION_RESEARCH.md`

_Nota: prezzi provider in USD, IVA esclusa, verificati a novembre 2026. Non è consulenza legale: far validare KYC, registrazioni e DPA a un legale/consulente privacy prima del go-live._
