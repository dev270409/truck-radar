import Link from "next/link";
import {
  MapPin,
  ShieldCheck,
  FileCheck,
  Mail,
  Clock,
  Hammer,
} from "lucide-react";

export default function InformativaAutistiPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <Link href="/privacy" className="ml-3 text-sm text-blue-400 hover:text-blue-300">&larr; Privacy Policy</Link>
        <h1 className="mt-6 text-3xl font-bold">Informativa per Autisti e Conducenti</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tracking di mezzi e conducenti — bozza da validare legalmente (GDPR, Reg. UE 2016/679, e art. 4 Statuto dei Lavoratori).
        </p>

        <div className="prose-invert mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Perché trattiamo la tua posizione</h2>
              <p>
                La piattaforma registra posizione e stato del veicolo durante i viaggi per consentire al
                committente di seguire la consegna e ottimizzare i chilometri (es. smart return). Questi dati
                possono riferirsi anche al conducente e, per lo svolgimento dell&apos;attività lavorativa,
                rientrano nella disciplina del <b>controllo a distanza dei lavoratori</b>.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Base giuridica</h2>
              <p>
                Esecuzione del contratto di lavoro e/o di servizio e legittimo interesse dell&apos;azienda alla
                gestione delle operazioni. Laddove configuri controllo a distanza (art. 4 l. 300/1970), deve
                essere preceduto da accordo sindacale o autorizzazione dell&apos;Ispettorato del lavoro ed è
                obbligatoria la consegna di un&apos;informativa dedicata ai lavoratori.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <FileCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Quali dati</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Anagrafica (nome, cognome, contatti, patente/abilitazione eventuali).</li>
                <li>Assegnazione a veicolo e gestione dei suoi viaggi.</li>
                <li>Posizione e stato consegna aggiornati in corso di viaggio.</li>
                <li>Documentazione DDT/firma inerente le consegne.</li>
                <li>Metriche operative (km percorsi, eventi, puntualità).</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Conservazione</h2>
              <p>
                I dati di progetto sono conservati per la durata del rapporto e dei relativi obblighi; i dati
                di posizione per finalità operative e statistiche per il tempo strettamente necessario. La
                durata esatta di ogni categoria va definita nella versione definitiva.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <Mail className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">I tuoi diritti</h2>
              <p>
                Puoi richiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione.
                Contattaci all&apos;indirizzo da indicare qui. Puoi inoltre proporre reclamo al Garante privacy.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start space-x-3">
            <Hammer className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-100 mb-2">Da completare con il tuo legale</h2>
              <p>
                Questa pagina è un modello preliminare: va completata con denominazioni, contatti, accordo
                sindacale/autorizzazione art. 4, tempi di conservazione precisi e consegna certificata
                dell&apos;informativa ai lavoratori prima dell&apos;uso produttivo (§63 del paper).
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}