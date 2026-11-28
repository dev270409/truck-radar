import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

/**
 * Empty state operativo: una sola azione primaria.
 * Usato nelle pagine con tabelle per evitare messaggi passivi
 * ("Nessun dato") che non dicono all'utente cosa fare.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  tone = "var(--brand)",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  tone?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{ background: "var(--surface-soft)", color: tone }}
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="max-w-md">
        <p className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-label)" }}>
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="ops-btn ops-btn--primary ops-btn--sm">
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="ops-btn ops-btn--primary ops-btn--sm">
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
