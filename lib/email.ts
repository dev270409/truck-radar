export interface EmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(input: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Truck Radar <noreply@truck-radar.it>";
  if (!key) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY non configurata" };
  }
  if (input.to.length === 0) {
    return { ok: false, skipped: true, error: "Nessun destinatario configurato" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };
    if (!response.ok) {
      return { ok: false, error: data.message || data.error || `Errore email ${response.status}` };
    }
    return { ok: true, id: data.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
