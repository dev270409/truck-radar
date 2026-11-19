import { createPublicKey, verify as cryptoVerify } from "node:crypto";

/**
 * Sistema di licenza per l'installazione self-hosted di Truck Radar.
 *
 * Modello: il fornitore (vendor) firma un payload JSON con la propria chiave
 * privata Ed25519; il cliente riceve una "license key" (`payload.signature`,
 * entrambi base64url) e la imposta nella variabile d'ambiente
 * `TRUCK_RADAR_LICENSE`. L'app verifica la firma con la chiave PUBBLICA
 * incorporata qui sotto: il cliente non può forgiare licenze perché non
 * possiede la chiave privata.
 *
 * Attivazione: `TRUCK_RADAR_SELF_HOSTED=true`. Se attivo e la licenza è
 * assente/scaduta/non valida, l'installazione resta in modalità "trial"
 * (limiti ridotti) finché non viene inserita una licenza valida.
 *
 * Nessuna dipendenza da database: la verifica è sincrona e cache-ata, così può
 * essere usata anche al login e nelle route API.
 */

export interface LicensePayload {
  /** Versione formato licenza. */
  v: 1;
  /** Intestatario (ragione sociale/dominio del cliente). */
  licensee: string;
  /** Piano concesso dalla licenza. */
  plan: "BASE" | "PRO" | "ENTERPRISE";
  /** Massimo numero di mezzi gestibili. */
  vehicleLimit: number;
  /** Massimo numero di autisti gestibili. */
  driverLimit: number;
  /** Data di emissione (ISO). */
  issuedAt: string;
  /** Data di scadenza (ISO). */
  expiresAt: string;
  /** Feature opzionali (future). */
  features?: string[];
}

export interface LicenseState {
  /** Una license key è stata fornita (anche se non valida). */
  configured: boolean;
  /** Firma valida e licenza non scaduta. */
  valid: boolean;
  /** Motivo in caso di licenza non valida. */
  reason?: string;
  /** Payload decodificato (presente anche se scaduta, per mostrare i dati). */
  payload?: LicensePayload;
  source: "env" | "none";
  selfHosted: boolean;
}

/**
 * Chiave pubblica Ed25519 del vendor (generata con `scripts/license-keygen.ts`).
 * Sicura da distribuire: serve solo a verificare, non a firmare.
 * Sostituiscila con la tua chiave pubblica prima di vendere.
 */
const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAgzpdVU0+ldl3we44qotxpL/pjbTbF9vZ1z4HN4cnBds=
-----END PUBLIC KEY-----`;

/** Limiti applicati a un'installazione self-hosted senza licenza valida. */
export const UNLICENSED_SELF_HOSTED_LIMITS = { vehicleLimit: 2, driverLimit: 2 };

export function isSelfHosted(): boolean {
  return process.env.TRUCK_RADAR_SELF_HOSTED === "true";
}

function resolvePublicKeyPem(): string {
  // In sviluppo/test è possibile iniettare una chiave pubblica dedicata
  // (usata dagli e2e). In produzione vale sempre la chiave incorporata.
  const override = process.env.TRUCK_RADAR_LICENSE_PUBLIC_KEY;
  if (override && process.env.NODE_ENV !== "production") return override;
  return EMBEDDED_PUBLIC_KEY;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function verifyLicenseKey(
  key: string,
  publicKeyPem: string = resolvePublicKeyPem()
): { valid: boolean; reason?: string; payload?: LicensePayload } {
  const trimmed = String(key).trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) {
    return { valid: false, reason: "Formato chiave non valido" };
  }

  const payloadB64 = trimmed.slice(0, dot);
  const signatureB64 = trimmed.slice(dot + 1);

  let payload: LicensePayload;
  try {
    payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8")) as LicensePayload;
  } catch {
    return { valid: false, reason: "Payload non decodificabile" };
  }

  let signature: Buffer;
  try {
    signature = decodeBase64Url(signatureB64);
  } catch {
    return { valid: false, reason: "Firma non decodificabile" };
  }

  let verified = false;
  try {
    const keyObject = createPublicKey(publicKeyPem);
    verified = cryptoVerify(
      null,
      Buffer.from(payloadB64, "utf8"),
      keyObject,
      signature
    );
  } catch {
    return { valid: false, reason: "Chiave pubblica non valida" };
  }

  if (!verified) return { valid: false, reason: "Firma non valida" };
  if (payload.v !== 1) return { valid: false, reason: "Versione licenza non supportata", payload };
  if (
    !payload.expiresAt ||
    new Date(payload.expiresAt).getTime() < Date.now()
  ) {
    return { valid: false, reason: "Licenza scaduta", payload };
  }

  return { valid: true, payload };
}

let cache: LicenseState | null = null;

/** Stato licenza corrente (cache-ato: le env non cambiano a runtime). */
export function getLicenseState(): LicenseState {
  if (cache) return cache;

  const selfHosted = isSelfHosted();
  const key = process.env.TRUCK_RADAR_LICENSE;

  if (!key) {
    cache = {
      configured: false,
      valid: false,
      reason: selfHosted ? "Nessuna licenza configurata" : undefined,
      source: "none",
      selfHosted,
    };
    return cache;
  }

  const result = verifyLicenseKey(key);
  cache = {
    configured: true,
    valid: result.valid,
    reason: result.reason,
    payload: result.payload,
    source: "env",
    selfHosted,
  };
  return cache;
}

/** Limiti concessi dalla licenza, se valida. */
export function getLicensedLimits(): { vehicleLimit: number; driverLimit: number } | null {
  const state = getLicenseState();
  if (state.valid && state.payload) {
    return {
      vehicleLimit: state.payload.vehicleLimit,
      driverLimit: state.payload.driverLimit,
    };
  }
  return null;
}

/** Reset della cache (solo test). */
export function __resetLicenseCache(): void {
  cache = null;
}
