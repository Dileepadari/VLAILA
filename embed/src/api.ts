/**
 * API client.
 *
 * Every call degrades rather than throws. The widget's contract with the lab
 * page is that it never breaks the experiment, so a failed request means a
 * quieter assistant, never a console full of errors or a blocked interaction.
 */

import type { ClientRules } from './rules';
import type { ExperimentRef } from './detect';
import type { StepEvent } from './observer';

export interface AgentResponse {
  verdict: 'NO_ACTION' | 'WARN' | 'HINT' | 'CONCEPT';
  severity: 'fatal' | 'recoverable' | 'info';
  title?: string;
  message?: string;
  concept?: string;
  step_id?: string;
  correction_step_id?: string;
  highlight_selector?: string;
  highlight_frame?: string;
  hint_level: number;
  confidence: number;
  intervention_id?: string;
  actions: { label: string; kind: string }[];
  tier: string;
  latency_ms: number;
  progress?: {
    completed_steps: string[];
    current_step_id?: string;
    total_steps: number;
    percent: number;
    deviations: number;
    hints_shown: number;
  };
}

export interface StartResponse {
  session_id: string;
  experiment_id: string;
  kb_found: boolean;
  kb_version?: string;
  title?: string;
  tasks: string[];
  total_steps: number;
  rules?: ClientRules;
}

export interface Summary {
  session_id: string;
  experiment_title: string;
  duration_seconds: number;
  steps_completed: number;
  steps_total: number;
  precision_score: number;
  hints_used: number;
  deviations: number;
  deviations_recovered: number;
  narrative: string;
  concepts_to_review: string[];
  quiz: {
    id: string;
    question: string;
    options: string[];
    answer_index: number;
    explanation: string;
  }[];
}

export class Api {
  constructor(
    private base: string,
    private timeoutMs = 8000,
  ) {}

  private async post<T>(path: string, body: unknown, timeoutMs?: number): Promise<T | null> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs);
    try {
      const res = await fetch(`${this.base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        // No cookies: the session is pseudonymous and cross-origin by design.
        credentials: 'omit',
        mode: 'cors',
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  startSession(
    ref: ExperimentRef,
    extras: { role?: string; userKey?: string; institution?: string; locale?: string },
  ): Promise<StartResponse | null> {
    return this.post<StartResponse>('/session/start', {
      experiment: {
        experiment_id: ref.experimentId,
        lab_id: ref.labId,
        origin: ref.origin,
        discipline: ref.discipline,
        institute: ref.institute,
        experiment_title: ref.experimentTitle,
      },
      role: extras.role ?? 'student',
      user_key: extras.userKey,
      institution: extras.institution,
      locale: extras.locale ?? 'en',
      client_version: '1.0.0',
    });
  }

  sendEvent(sessionId: string, event: StepEvent): Promise<AgentResponse | null> {
    return this.post<AgentResponse>(
      '/session/event',
      {
        session_id: sessionId,
        action: event.action,
        task: event.task,
        selector: event.selector,
        frame: event.frame,
        value: event.value,
        numeric_value: event.numericValue,
        elapsed_ms: event.elapsedMs,
      },
      // Tight budget: the student is mid-interaction. If the server cannot
      // answer in time the local rules engine has already covered the case.
      2500,
    );
  }

  /**
   * Report the behavioural read.
   *
   * Fire-and-forget and deliberately low-frequency: this is aggregate shape
   * (scores and counts), never content, and nothing in the widget waits on the
   * reply. It feeds the instructor heatmap and gives the agent context on the
   * next real event.
   */
  behaviour(sessionId: string, snapshot: unknown, signals: unknown[]): Promise<unknown | null> {
    return this.post('/session/behaviour', {
      session_id: sessionId,
      snapshot,
      signals,
    });
  }

  feedback(sessionId: string, interventionId: string, outcome: string, note?: string) {
    return this.post('/session/feedback', {
      session_id: sessionId,
      intervention_id: interventionId,
      outcome,
      note,
    });
  }

  endSession(sessionId: string, reason = 'completed'): Promise<Summary | null> {
    return this.post<Summary>('/session/end', { session_id: sessionId, reason }, 25000);
  }

  submitQuiz(sessionId: string, answers: Record<string, number>) {
    return this.post<{
      score: number;
      total: number;
      per_question: Record<string, boolean>;
      feedback: Record<string, string>;
    }>('/session/quiz', { session_id: sessionId, answers });
  }

  /** Streaming chat. Falls back to the non-streaming endpoint on failure. */
  async *chat(
    sessionId: string,
    message: string,
    history: { role: string; text: string }[],
  ): AsyncGenerator<{ delta?: string; done?: boolean; citations?: unknown[] }> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/chat/stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message, history }),
        credentials: 'omit',
        mode: 'cors',
      });
    } catch {
      yield { delta: 'I could not reach the assistant service just now.', done: true };
      return;
    }

    if (!res.ok || !res.body) {
      const fallback = await this.post<{ text: string }>('/chat', {
        session_id: sessionId,
        message,
        history,
      });
      yield {
        delta: fallback?.text ?? 'I could not reach the assistant service just now.',
        done: true,
      };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        try {
          yield JSON.parse(line.slice(5).trim());
        } catch {
          /* a partial frame; the next read completes it */
        }
      }
    }
  }
}
