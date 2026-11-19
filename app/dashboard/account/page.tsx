"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Le due nuove password non coincidono.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La nuova password deve avere almeno 8 caratteri.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel cambio password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password aggiornata.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="ops-label">Account</p>
        <h1 className="ops-title mt-1 text-2xl">Sicurezza e password</h1>
        <p className="ops-subtitle mt-2">
          Cambia la password del tuo account. Se l’hai dimenticata, un amministratore della tua azienda può reimpostarla.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <form onSubmit={submit} className="ops-card space-y-4 p-5">
        <div>
          <label htmlFor="current" className="ops-label">Password attuale</label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="ops-input mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="new" className="ops-label">Nuova password</label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="ops-input mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="ops-label">Ripeti la nuova password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="ops-input mt-1.5"
          />
        </div>
        <button type="submit" disabled={saving} className="ops-btn ops-btn--primary ops-btn--block">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Aggiorna password
        </button>
        <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-label)" }}>
          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
          Minimo 8 caratteri. La password viene salvata solo come hash.
        </p>
      </form>
    </div>
  );
}
