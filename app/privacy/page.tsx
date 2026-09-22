import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Eraser,
  Lock,
  Clock,
  KeyRound,
  UserCheck,
} from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ultimo aggiornamento: bozza — testo destinato alla validazione legale (GDPR Reg. UE 2016/679).
        </p>

        <div className="prose-invert mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Chi siamo (Titolare del trattamento)</h2>
              <p>
                Truck Radar opera come piattaforma software (Transport Operating System) per aziende di
                trasporto. La società titolare del trattamento va indicata qui con denominazione, sede legale
                P.IVA e contatti (DPO se previsto).
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Finalità e base giuridica</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Erogazione del gestionale (contratto): anagrafiche, mezzi, autisti, viaggi, documenti.</li>
                <li>Verifica dell&apos;account e del Network (legittimo interesse / obbligo di legge): documenti KYC, identità del rappresentante.</li>
                <li>Fatturazione e pagamenti (obbligo legale): dati fiscali aziendali, transazioni.</li>
                <li>Tracking di autisti e mezzi: rientra nella disciplina del controllo a distanza dei lavoratori (art. 4 Statuto dei Lavoratori; richiede accordo o informazioni sindacali e informativa dedicata).</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <Eraser className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Dati trattati</h2>
              <p>
                Dati aziendali di contatto, dati identificativi del rappresentante (AI/visura), dati di viaggio
                (origine, destinazione, merce, km), posizione/stato del mezzo, documenti veicoli, KYC, dati di
                fatturazione. Non trattiamo, di norma, categorie particolari di dati (art. 9 GDPR).
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Strumenti di trattamento (Responsabili esterni)</h2>
              <p>
                I dati sono trattati avvalendosi di fornitori qualificati quali provider di hosting e database
                (hosting, DB in cloud), pagamenti (Stripe), storage documenti (provider di upload) e verifica
                identità. Ciascuno opera in qualità di Responsabile (art. 28 GDPR) tramite accordi dedicati.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Sicurezza</h2>
              <p>
                Password con hashing (bcrypt), sessioni criptate, isolamento dei dati tra aziende (multi-tenancy),
                credenziali API esterne cifrate, rate limiting, logging di sicurezza e audit trail. Backup e
                disaster recovery sono responsabilità della piattaforma cloud sottostante e vanno descritti nel
                testo definitivo.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Conservazione</h2>
              <p>
                Durata del contratto più eventuali obblighi fiscali/legali (10 anni per la documentazione
                fiscale). I dati di tracking sono conservati per finalità operative e statistiche per il tempo
                strettamente necessario, da definire con precisione in fase di validazione legale.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <UserCheck className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Diritti dell&apos;interessato</h2>
              <p>
                Accesso, rettifica, cancellazione, limitazione, portabilità e opposizione (artt. 15–21 GDPR).
                Reclamo al Garante per la protezione dei dati personali. Contatti per l&apos;esercizio dei diritti
                da indicare nel testo definitivo.
              </p>
            </div>
          </section>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Questo documento è una struttura preliminare: va completato e validato con consulenza legale prima
          dell&apos;utilizzo produttivo (v. §63 del paper). Per i dettagli sul trattamento dei dati degli autisti
          vedi <Link href="/informativa-autisti" className="text-blue-400 hover:text-blue-300">l&apos;informativa dedicata</Link>.
        </p>
      </div>
    </main>
  );
}