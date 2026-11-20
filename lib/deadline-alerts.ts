import { db } from "./db";
import { deadlineType } from "./deadline-catalog";
import { sendEmail } from "./email";
import {
  getDeadlineSettings,
  listUnifiedDeadlines,
  type DeadlineSettings,
} from "./deadline-settings";

interface AlertRow {
  id: string;
  companyId: string;
  deadlineKey: string;
  deadlineId: string;
  scope: string;
  tipo: string;
  subjectName: string | null;
  dataScadenza: Date;
  daysBefore: number;
  attempts: number;
}

function dayDiff(due: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(due);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export async function queueDeadlineAlerts(companyId: string): Promise<number> {
  const settings = await getDeadlineSettings(companyId);
  if (!settings.alertsEnabled || settings.alertEmails.length === 0) return 0;
  const deadlines = await listUnifiedDeadlines(companyId);
  let queued = 0;
  for (const deadline of deadlines) {
    const type = deadlineType(deadline.tipo);
    if (!type || settings.active[type.id] === false) continue;
    const days = dayDiff(deadline.dataScadenza);
    const thresholds = settings.alertDays.length ? settings.alertDays : type.alertDays;
    for (const daysBefore of thresholds) {
      if (days !== daysBefore && !(days < 0 && daysBefore === 1)) continue;
      const key = `${deadline.scope}:${deadline.subjectId}:${deadline.tipo}:${deadline.dataScadenza.slice(0, 10)}`;
      const inserted = (await db.$executeRawUnsafe(
        `INSERT INTO "DeadlineAlert"
           ("companyId", "deadlineKey", "deadlineId", scope, tipo, "subjectName", "dataScadenza", "daysBefore")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("companyId", "deadlineKey", "daysBefore") DO NOTHING`,
        companyId,
        key,
        deadline.id,
        deadline.scope,
        deadline.tipo,
        deadline.subjectName,
        new Date(deadline.dataScadenza),
        daysBefore
      )) as number;
      if (inserted > 0) queued++;
    }
  }
  return queued;
}

async function claimAlerts(companyId?: string): Promise<AlertRow[]> {
  const params = companyId ? [companyId] : [];
  const filter = companyId ? `AND "companyId" = $1` : "";
  const rows = (await db.$queryRawUnsafe(
    `WITH picked AS (
       SELECT id FROM "DeadlineAlert"
       WHERE status = 'PENDING' ${filter}
       ORDER BY "createdAt" ASC
       LIMIT 30
       FOR UPDATE SKIP LOCKED
     )
     UPDATE "DeadlineAlert" a
     SET status = 'SENDING', attempts = attempts + 1
     WHERE a.id IN (SELECT id FROM picked)
     RETURNING a.*`,
    ...params
  )) as AlertRow[];
  return rows;
}

function emailHtml(input: {
  subjectName: string;
  tipo: string;
  dataScadenza: Date;
  daysBefore: number;
}): { subject: string; html: string; text: string } {
  const type = deadlineType(input.tipo);
  const label = type?.label ?? input.tipo;
  const date = new Date(input.dataScadenza).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const overdue = input.daysBefore === 1 && new Date(input.dataScadenza).getTime() < Date.now();
  const subject = overdue
    ? `Scadenza superata: ${label} — ${input.subjectName}`
    : `Scadenza tra ${input.daysBefore} giorni: ${label} — ${input.subjectName}`;
  const text = [
    `Truck Radar — promemoria scadenza`,
    `Voce: ${label}`,
    `Soggetto: ${input.subjectName}`,
    `Data: ${date}`,
    overdue ? "La scadenza risulta superata." : `Mancano ${input.daysBefore} giorni.`,
    "Apri Scadenze e divieti per aggiornare il documento.",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1c2430">
    <h2 style="margin:0 0 12px">Promemoria scadenza</h2>
    <p><strong>${label}</strong><br>${input.subjectName}</p>
    <p>Data: <strong>${date}</strong><br>${overdue ? "La scadenza risulta superata." : `Mancano ${input.daysBefore} giorni.`}</p>
    <p><a href="https://www.truck-radar.it/dashboard/scadenze">Apri Scadenze e divieti</a></p>
  </div>`;
  return { subject, html, text };
}

export async function processDeadlineAlerts(companyId?: string): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const alerts = await claimAlerts(companyId);
  const settingsCache = new Map<string, DeadlineSettings>();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const alert of alerts) {
    let settings = settingsCache.get(alert.companyId);
    if (!settings) {
      settings = await getDeadlineSettings(alert.companyId);
      settingsCache.set(alert.companyId, settings);
    }
    if (!settings.alertsEnabled || settings.alertEmails.length === 0) {
      await db.$executeRawUnsafe(
        `UPDATE "DeadlineAlert"
         SET status='NOT_CONFIGURED', "lastError"=$2
         WHERE id=$1`,
        alert.id,
        settings.alertEmails.length === 0
          ? "Nessun destinatario configurato"
          : "Avvisi disattivati"
      );
      skipped++;
      continue;
    }
    const type = deadlineType(alert.tipo);
    const content = emailHtml({
      subjectName: alert.subjectName || type?.label || alert.tipo,
      tipo: alert.tipo,
      dataScadenza: alert.dataScadenza,
      daysBefore: alert.daysBefore,
    });
    const result = await sendEmail({
      to: settings.alertEmails,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (result.ok) {
      await db.$executeRawUnsafe(
        `UPDATE "DeadlineAlert"
         SET status='SENT', "sentAt"=now(), "lastError"=NULL
         WHERE id=$1`,
        alert.id
      );
      sent++;
    } else if (result.skipped) {
      await db.$executeRawUnsafe(
        `UPDATE "DeadlineAlert"
         SET status='NOT_CONFIGURED', "lastError"=$2
         WHERE id=$1`,
        alert.id,
        result.error ?? "Provider email non configurato"
      );
      skipped++;
    } else {
      await db.$executeRawUnsafe(
        `UPDATE "DeadlineAlert"
         SET status='FAILED', "lastError"=$2
         WHERE id=$1`,
        alert.id,
        result.error ?? "Errore invio email"
      );
      failed++;
    }
  }
  return { processed: alerts.length, sent, failed, skipped };
}

export async function runDeadlineAlerts(companyId?: string) {
  const queued = companyId ? await queueDeadlineAlerts(companyId) : 0;
  const processed = await processDeadlineAlerts(companyId);
  return { queued, ...processed };
}
