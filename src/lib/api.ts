/**
 * Client for the VLAILA API.
 *
 * The console is a read-mostly surface over the same API the embedded widget
 * uses -- there is no second backend and no parallel data model, so what an
 * instructor sees on a dashboard is exactly what the agent recorded.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const API_BASE =
  (typeof window !== "undefined" && (window as any).__VLAILA_API__) ||
  import.meta.env?.VITE_VLAILA_API ||
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const STAFF_KEY_STORAGE = "vlaila_staff_key";

/**
 * The credential for the instructor and admin endpoints.
 *
 * Read at call time from localStorage (or an injected global), deliberately
 * NOT from a VITE_ variable: anything with that prefix is inlined into the
 * built bundle, so the "secret" would be readable by anyone who loads the
 * page. The console has no authentication of its own - this key is the whole
 * boundary - so it is supplied per browser instead.
 */
export function getStaffKey(): string | null {
  if (typeof window === "undefined") return null;
  const injected = (window as any).__VLAILA_STAFF_KEY__;
  if (typeof injected === "string" && injected) return injected;
  try {
    return window.localStorage.getItem(STAFF_KEY_STORAGE);
  } catch {
    // Private mode, blocked site data.
    return null;
  }
}

export function setStaffKey(key: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (key) window.localStorage.setItem(STAFF_KEY_STORAGE, key);
    else window.localStorage.removeItem(STAFF_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const staffKey = getStaffKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(staffKey ? { "X-API-Key": staffKey } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(detail || res.statusText, res.status);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------- types ----

export interface Health {
  status: string;
  version: string;
  knowledge_base_entries: number;
  experiments: string[];
  llm_provider: string;
  llm_configured: boolean;
  degraded: boolean;
}

export interface KbSummary {
  experiment_id: string;
  lab_id: string;
  title: string;
  origin: string;
  discipline: string;
  institute: string;
  steps: number;
  errors: number;
  chunks: number;
  quiz: number;
  estimated_minutes: number;
  kb_version: string;
}

export interface StepHeatCell {
  step_id: string;
  title: string;
  order: number;
  attempts: number;
  confusion: number;
  dropoff: number;
  avg_seconds: number;
}

export interface FrictionCount {
  kind: string;
  label: string;
  sessions: number;
  share: number;
}

/**
 * The cohort's behavioural read: how the class found the experiment, as
 * distinct from which step they got wrong. Session-scoped, so it sits beside
 * the step heatmap rather than inside it.
 */
export interface BehaviourAggregate {
  sessions_reporting: number;
  avg_struggle: number;
  avg_focus: number;
  avg_confidence: number;
  strained_sessions: number;
  friction: FrictionCount[];
  students_to_check: string[];
}

export interface ClassAnalytics {
  experiment_id: string;
  experiment_title: string;
  sessions: number;
  completion_rate: number;
  avg_duration_seconds: number;
  steps: StepHeatCell[];
  worst_step: string | null;
  behaviour: BehaviourAggregate | null;
}

export interface OrgStats {
  active_sessions_30d: number;
  sessions_all_time: number;
  sessions_this_month: number;
  avg_session_minutes: number;
  daily: { day: string; sessions: number }[];
  by_discipline: { name: string; sessions: number }[];
  trending: { experiment_id: string; sessions: number }[];
  struggling: { experiment_id: string; sessions: number; completion: number; abandon: number }[];
}

export interface AgentHealth {
  interventions: number;
  accepted: number;
  dismissed: number;
  reported_wrong: number;
  acceptance_rate: number;
  false_positive_rate: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  tier_mix: Record<string, number>;
  flagged_experiments: { experiment_id: string; interventions: number; dismiss_rate: number }[];
}

export interface NLQueryResult {
  answer: string;
  sql: string | null;
  columns: string[];
  rows: unknown[][];
  chart: { type: string; x: string; y: string; data: Record<string, unknown>[] } | null;
}

export interface CustomHint {
  id?: string;
  experiment_id: string;
  step_id: string;
  institution: string;
  author: string;
  text: string;
  level: "nudge" | "specific";
}

export interface ScenarioResult {
  results: {
    event: Record<string, unknown>;
    verdict: string;
    severity: string;
    title: string | null;
    message: string | null;
    step_id: string | null;
    error_id: string | null;
    hint_level: number;
  }[];
  final_state: {
    completed_steps: string[];
    shown_errors: string[];
    hint_levels: Record<string, number>;
  };
}

// ---------------------------------------------------------------- hooks ----

/** Everything polls on a slow interval: dashboards go stale, they don't break. */
const REFRESH = 30_000;

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => request<Health>("/health"),
    refetchInterval: REFRESH,
    retry: 1,
  });
}

export function useKnowledgeBase() {
  return useQuery({
    queryKey: ["kb"],
    queryFn: () => request<KbSummary[]>("/kb"),
    staleTime: 5 * 60_000,
  });
}

export function useKbEntry(experimentId: string | undefined) {
  return useQuery({
    queryKey: ["kb", experimentId],
    queryFn: () => request<Record<string, any>>(`/kb/${experimentId}`),
    enabled: Boolean(experimentId),
  });
}

export function useOrgStats(institution?: string) {
  const qs = institution ? `?institution=${encodeURIComponent(institution)}` : "";
  return useQuery({
    queryKey: ["org-stats", institution ?? null],
    queryFn: () => request<OrgStats>(`/admin/stats${qs}`),
    refetchInterval: REFRESH,
  });
}

export function useAgentHealth() {
  return useQuery({
    queryKey: ["agent-health"],
    queryFn: () => request<AgentHealth>("/admin/health"),
    refetchInterval: REFRESH,
  });
}

export function useClassAnalytics(experimentId: string, institution?: string) {
  const params = new URLSearchParams({ experiment_id: experimentId });
  if (institution) params.set("institution", institution);
  return useQuery({
    queryKey: ["class-analytics", experimentId, institution ?? null],
    queryFn: () => request<ClassAnalytics>(`/instructor/analytics?${params}`),
    enabled: Boolean(experimentId),
    refetchInterval: REFRESH,
  });
}

export function useTeachingSuggestion(experimentId: string, institution?: string) {
  const params = new URLSearchParams({ experiment_id: experimentId });
  if (institution) params.set("institution", institution);
  return useQuery({
    queryKey: ["suggestion", experimentId, institution ?? null],
    queryFn: () =>
      request<{ suggestion: string; worst_step: string | null }>(
        `/instructor/suggestion?${params}`,
      ),
    enabled: Boolean(experimentId),
  });
}

export function useStudents(experimentId: string, institution?: string) {
  const params = new URLSearchParams({ experiment_id: experimentId });
  if (institution) params.set("institution", institution);
  return useQuery({
    queryKey: ["students", experimentId, institution ?? null],
    queryFn: () =>
      request<
        {
          student: string;
          sessions: number;
          completed: number;
          avg_deviations: number;
          avg_hints: number;
          /** Flagged by the behavioural read as worth following up. */
          strained: boolean;
        }[]
      >(`/instructor/students?${params}`),
    enabled: Boolean(experimentId),
  });
}

export function useCustomHints(experimentId: string, institution: string) {
  return useQuery({
    queryKey: ["hints", experimentId, institution],
    queryFn: () =>
      request<CustomHint[]>(
        `/instructor/hints?experiment_id=${encodeURIComponent(experimentId)}&institution=${encodeURIComponent(institution)}`,
      ),
    enabled: Boolean(experimentId && institution),
  });
}

export function useCreateHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hint: CustomHint) =>
      request<CustomHint>("/instructor/hints", {
        method: "POST",
        body: JSON.stringify(hint),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hints"] }),
  });
}

export function useDeleteHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<{ ok: boolean }>(`/instructor/hints/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hints"] }),
  });
}

export function useNaturalLanguageQuery() {
  return useMutation({
    mutationFn: (question: string) =>
      request<NLQueryResult>("/admin/query", {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
  });
}

export function useScenarioRunner() {
  return useMutation({
    mutationFn: ({
      experimentId,
      payload,
    }: {
      experimentId: string;
      payload: Record<string, unknown>;
    }) =>
      request<ScenarioResult>(`/kb/${experimentId}/simulate`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

/** Exports stream a file, so they bypass the JSON helper. */
export async function downloadReport(question: string, fmt: "csv" | "pdf") {
  const res = await fetch(`${API_BASE}/admin/export?fmt=${fmt}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vlaila-report.${fmt}`;
  a.click();
  URL.revokeObjectURL(url);
}
