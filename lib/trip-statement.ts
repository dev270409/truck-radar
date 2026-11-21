import { extractText, getDocumentProxy } from "unpdf";

/**
 * Import dei rendiconti viaggi periodici (es. Energy Trucks / TAROS).
 * Il documento elenca, per giorno, i viaggi con codice, tratta, committente
 * e prezzo. L'estrazione è deterministica: se il layout cambia, il parser
 * restituisce un warnings e l'import si blocca invece di creare viaggi errati.
 */

export interface ParsedTripLine {
  code: string;
  date: string;
  pickupTime: string;
  pickupTimeExplicit: boolean;
  description: string;
  customer: string;
  amount: number;
  raw: string;
}

export interface ParsedTripStatement {
  provider: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  declaredTrips: number | null;
  declaredDays: number | null;
  declaredTotal: number | null;
  lines: ParsedTripLine[];
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

const DAY_NAMES = "LUNEDÌ|MARTEDÌ|MERCOLEDÌ|GIOVEDÌ|VENERDÌ|SABATO|DOMENICA";
const DAY_RE = new RegExp(
  `^(${DAY_NAMES})\\s+(\\d{1,2})\\s+([A-Z]+)(?:\\s*·\\s*PARTENZA\\s+(\\d{1,2}):(\\d{2}))?`,
  "i"
);
const CODE_RE = /^([A-Z]\d{5,})\b(.*)$/;
const PRICE_RE = /^(.*?)\s*([\d.]+,\d{2})\s*€$/;

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseAmount(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function addHours(time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + hours * 60, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function labelValue(lines: string[], label: string): string | null {
  const target = label.replace(/\s+/g, "").toUpperCase();
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].replace(/\s+/g, "").toUpperCase() === target) return lines[i + 1];
  }
  return null;
}

function parsePeriod(value: string | null) {
  if (!value) return { start: null, end: null };
  const match = value.match(/(\d{1,2})\s*[—–-]\s*(\d{1,2})\s+([a-zàèéìòù]+)\s+(\d{4})/i);
  if (!match) return { start: null, end: null };
  const startDay = Number(match[1]);
  const endDay = Number(match[2]);
  const month = MONTHS[match[3].toLowerCase()];
  const year = Number(match[4]);
  if (!month) return { start: null, end: null };

  let endMonth = month;
  let endYear = year;
  if (endDay < startDay) {
    endMonth += 1;
    if (endMonth > 12) {
      endMonth = 1;
      endYear += 1;
    }
  }
  return {
    start: dateKey(year, month, startDay),
    end: dateKey(endYear, endMonth, endDay),
  };
}

function splitRoute(description: string): { pickup: string; delivery: string } {
  const text = compact(description);
  const ritiroConsegna = text.match(/RITIRO\s+(.+?)\s+[-–]\s+CONSEGNA\s+(.+)/i);
  if (ritiroConsegna) {
    return { pickup: ritiroConsegna[1].trim(), delivery: ritiroConsegna[2].trim() };
  }
  const x = text.split(/\s+x\s+/i);
  if (x.length >= 2) {
    return { pickup: x[0].trim(), delivery: x.slice(1).join(" x ").trim() };
  }
  const presso = text.match(/Consegna\s+(?:in diretta\s+)?presso\s+(.+)/i);
  if (presso) {
    return { pickup: text.slice(0, presso.index).trim() || text, delivery: presso[1].trim() };
  }
  return { pickup: text, delivery: text };
}

export function parseTripStatement(text: string): ParsedTripStatement {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);

  const warnings: string[] = [];
  const periodRaw = labelValue(rawLines, "PERIODO");
  const period = parsePeriod(periodRaw);
  if (!period.start || !period.end) {
    warnings.push("Periodo del rendiconto non riconosciuto.");
  }

  const declaredTripsRaw = labelValue(rawLines, "VIAGGI");
  const declaredDaysRaw = labelValue(rawLines, "GIORNATE");
  const declaredTotalRaw = labelValue(rawLines, "TOTALE");
  const declaredTrips = declaredTripsRaw && /^\d+$/.test(declaredTripsRaw) ? Number(declaredTripsRaw) : null;
  const declaredDays = declaredDaysRaw && /^\d+$/.test(declaredDaysRaw) ? Number(declaredDaysRaw) : null;
  const declaredTotal = declaredTotalRaw && /^[\d.]+,\d{2}\s*€$/.test(declaredTotalRaw)
    ? parseAmount(declaredTotalRaw.replace("€", "").trim())
    : null;

  const lower = text.toLowerCase();
  const provider = lower.includes("energytrucks.it")
    ? "Energy Trucks"
    : lower.includes("taros")
      ? "TAROS"
      : null;

  const lines: ParsedTripLine[] = [];
  let currentDay: {
    year: number;
    month: number;
    day: number;
    departure: string | null;
    explicit: boolean;
  } | null = null;
  let dayTripIndex = 0;
  let block: { code: string; lines: string[] } | null = null;

  const finalize = (blockValue: { code: string; lines: string[] }, amount: number) => {
    if (!currentDay) {
      warnings.push(`Viaggio ${blockValue.code}: giorno non riconosciuto.`);
      return;
    }
    const parts = blockValue.lines.map(compact).filter(Boolean);
    if (parts.length === 0) {
      warnings.push(`Viaggio ${blockValue.code}: descrizione mancante.`);
      return;
    }
    const customer = parts.length > 1 ? parts[parts.length - 1] : "";
    const description = (parts.length > 1 ? parts.slice(0, -1) : parts).join(" ").trim();
    const pickupTime = addHours(currentDay.departure ?? "08:00", dayTripIndex * 4);
    lines.push({
      code: blockValue.code,
      date: dateKey(currentDay.year, currentDay.month, currentDay.day),
      pickupTime,
      pickupTimeExplicit: currentDay.explicit && dayTripIndex === 0,
      description,
      customer,
      amount,
      raw: [blockValue.code, ...parts].join(" "),
    });
    dayTripIndex += 1;
  };

  for (const line of rawLines) {
    const day = line.match(DAY_RE);
    if (day) {
      const dayNumber = Number(day[2]);
      const month = MONTHS[day[3].toLowerCase()] ?? (period.start ? Number(period.start.slice(5, 7)) : null);
      const year = period.start ? Number(period.start.slice(0, 4)) : new Date().getFullYear();
      if (!month) {
        currentDay = null;
        block = null;
        continue;
      }
      currentDay = {
        year,
        month,
        day: dayNumber,
        departure: day[4] && day[5] ? `${pad(Number(day[4]))}:${day[5]}` : null,
        explicit: Boolean(day[4] && day[5]),
      };
      dayTripIndex = 0;
      block = null;
      continue;
    }

    const codeMatch = line.match(CODE_RE);
    if (codeMatch) {
      block = { code: codeMatch[1], lines: codeMatch[2].trim() ? [codeMatch[2].trim()] : [] };
      continue;
    }

    if (!block) continue;

    const price = line.match(PRICE_RE);
    if (price) {
      const prefix = price[1].trim();
      if (prefix) block.lines.push(prefix);
      finalize(block, parseAmount(price[2]));
      block = null;
      continue;
    }

    block.lines.push(line);
  }

  if (block) {
    warnings.push(`Viaggio ${block.code} senza prezzo: riga ignorata.`);
  }

  const uniqueCodes = new Set(lines.map((line) => line.code));
  if (uniqueCodes.size !== lines.length) {
    warnings.push("Il documento contiene codici viaggio duplicati.");
  }
  if (declaredTrips !== null && lines.length !== declaredTrips) {
    warnings.push(`Viaggi dichiarati: ${declaredTrips}, righe lette: ${lines.length}.`);
  }
  const total = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  if (declaredTotal !== null && Math.abs(total - declaredTotal) > 0.01) {
    warnings.push(`Totale dichiarato ${declaredTotal.toFixed(2)} €, righe lette ${total.toFixed(2)} €.`);
  }

  return {
    provider,
    periodStart: period.start,
    periodEnd: period.end,
    declaredTrips,
    declaredDays,
    declaredTotal,
    lines,
    warnings,
  };
}

export async function extractTripStatementText(buffer: Uint8Array): Promise<string> {
  // pdf.js può trasferire il buffer al worker: passiamo una copia per poter
  // riusare lo stesso PDF nel fallback AI (scansioni senza testo).
  const pdf = await getDocumentProxy(buffer.slice());
  const result = await extractText(pdf, { mergePages: true });
  return result.text;
}

/**
 * Converte data e ora del rendiconto in un istante UTC corretto per l'Italia.
 * Senza questo, un viaggio delle 10:54 finirebbe alle 12:54 italiane.
 */
export function romeDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = romeOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60_000);
}

export function romeDayKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function romeOffsetMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return (asUtc - date.getTime()) / 60_000;
}

export { splitRoute };
