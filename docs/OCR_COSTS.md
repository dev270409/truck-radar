# OCR e scansioni: costi, free tier e scelta per Truck Radar

Ricerca del 21/11/2026. I prezzi cambiano: verificare sempre la pagina ufficiale prima di attivare un provider.

## 1. Prima distinzione: testo vs scansione

- **PDF con testo** (come il rendiconto TAROS): non serve OCR. `unpdf` estrae il testo gratis e in locale. Costo: **0**.
- **PDF scansionato** (immagini): serve OCR/vision. Qui entrano i provider sotto.

Truck Radar usa già entrambi:
- deterministico con `unpdf`;
- fallback **Gemini** per le scansioni (`lib/trip-statement-ai.ts`), testato su una versione immagine del rendiconto TAROS: 24/24 viaggi, 7.790 €.

## 2. Confronto costi

| Provider | Free tier | Costo indicativo | API | Note |
|---|---|---|---|---|
| **Tesseract** | illimitato (self-hosted) | 0 € + server | no cloud, libreria | Open source; layout complessi e tabelle meno precisi |
| **PaddleOCR** | illimitato (self-hosted) | 0 € + server | Python/ONNX | Migliore di Tesseract su tabelle, richiede GPU/CPU dedicata |
| **Gemini API (Flash-Lite)** | free tier con limiti | frazioni di centesimo per PDF di 3 pagine; listino ~$0,15–0,25 / 1M token input | sì | Già configurato; legge PDF nativamente; qualità molto buona sui rendiconti |
| **Mistral OCR 3** | — | $2 / 1.000 pagine; batch $1 / 1.000 | sì | Buon rapporto qualità/prezzo; OCR 4 sale a $4 ($2 batch) |
| **Azure Document Intelligence** | **F0: 500 pagine/mese** | S0 Read ~$1,50 / 1.000 pagine | sì | Free tier limitato; verificare il limite di pagine per richiesta |
| **AWS Textract** | primi 3 mesi: 1.000 pagine/mese (testo) | ~$1,50 / 1.000 pagine (testo); form/tabelle costano più | sì | Free tier temporaneo, non permanente |
| **OCR.space** | 25.000 richieste/mese, 500/giorno | PRO ~$30/mese | sì | Limite 1 MB e 3 pagine per richiesta: ok per ricevute, non per rendiconti multi-pagina |
| **Google Document AI** | free tier variabile per modello | ~$1,50–3 / 1.000 pagine | sì | Più adatto a form strutturati; più complesso da configurare |

Fonti:
- Gemini: https://ai.google.dev/gemini-api/docs/pricing
- Mistral OCR 3: https://mistral.ai/news/mistral-ocr-3
- Mistral OCR 4: https://mistral.ai/news/ocr-4
- Azure Document Intelligence: https://azure.microsoft.com/en-us/pricing/details/document-intelligence/
- AWS Textract: https://aws.amazon.com/textract/pricing
- OCR.space: https://ocr.space/ocrapi
- Tesseract: https://github.com/tesseract-ocr/tesseract
- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR

## 3. Scelta consigliata per Truck Radar

1. **PDF con testo** → `unpdf`, costo zero. È già il percorso principale.
2. **PDF scansionato, volume basso/medio** → **Gemini** (già integrato). Free tier + costo marginale quasi nullo. È la scelta giusta per iniziare.
3. **Volume alto e necessità di zero costi variabili** → **Tesseract/PaddleOCR** su un worker dedicato (non su Vercel serverless). Aggiunge manutenzione e infrastruttura.
4. **Volume alto e qualità prioritaria** → **Mistral OCR batch** ($1–2 / 1.000 pagine) o Azure F0/S0.
5. **OCR.space** → utile solo per ricevute singole (1 MB/3 pagine), non per rendiconti.

Stima pratica: un rendiconto di 3 pagine inviato a Gemini costa una frazione di centesimo; 100 rendiconti al mese restano nell'ordine di pochi centesimi/euro. Il collo di bottiglia è la qualità della scansione, non il costo.

## 4. Privacy

Le scansioni possono contenere dati di clienti e autisti. Prima di attivare un provider:
- DPA e base giuridica;
- minimizzazione (solo le pagine necessarie);
- retention del file e dell'estrazione;
- preferenza per provider UE o con garanzie adeguate;
- log di accesso e cancellazione.

Gemini è già usato per il KYB; la stessa informativa va estesa ai rendiconti viaggi.

## 5. Stato implementazione

- Fallback AI nel parse: attivo, `parserMode: "AI"` sulla pratica.
- Prompt dedicato ai rendiconti italiani.
- Validazione delle righe (codice, data, importo) e warning di verifica.
- Test su PDF scansionato: `scripts/e2e-trip-statement-ai.ts` → 5/5 PASS.
- Se l'AI non è configurata o fallisce, resta il parser deterministico e l'import si blocca con un errore esplicito invece di creare dati errati.
