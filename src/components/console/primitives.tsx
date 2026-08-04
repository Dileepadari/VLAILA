/**
 * Shared console primitives.
 *
 * Live dashboards spend most of their life in a non-happy state -- loading,
 * empty, or unable to reach the API -- so those states get first-class
 * components rather than being an afterthought bolted onto each route.
 */

import type { ReactNode } from "react";
import { AlertTriangle, Loader2, ServerCrash } from "lucide-react";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    default: "text-vlabs-blue",
    good: "text-vlabs-green",
    warn: "text-vlabs-amber",
    bad: "text-vlabs-rose",
  }[tone];
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white border rounded-xl ${className}`}>
      {(title || actions) && (
        <header className="flex items-center gap-3 px-4 py-3 border-b">
          {title && <h3 className="font-semibold text-sm">{title}</h3>}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}

/**
 * The API being down is the single most likely failure in this console, and
 * "start the API" is a more useful message than a red toast.
 */
export function ApiDown({ error }: { error: unknown }) {
  return (
    <div className="bg-white border border-vlabs-rose/40 rounded-xl p-6 text-sm">
      <div className="flex items-center gap-2 font-semibold text-vlabs-rose mb-2">
        <ServerCrash className="w-4 h-4" /> Can't reach the VLAILA API
      </div>
      <p className="text-muted-foreground">
        Start it with{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">docker compose up</code>, or{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
          uvicorn app.main:app --port 8000
        </code>{" "}
        from <code className="bg-muted px-1.5 py-0.5 rounded text-xs">server/</code>.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        {error instanceof Error ? error.message : String(error)}
      </p>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-10 px-4">
      <AlertTriangle className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
      <div className="font-medium text-sm">{title}</div>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
    </div>
  );
}

export function Bar({ value, max, tone = "rose" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.round((value * 100) / max) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-vlabs-${tone} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
