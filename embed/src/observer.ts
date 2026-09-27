/**
 * The Screen Observer.
 *
 * Attaches to the host page and to every reachable simulator frame, and turns
 * raw user interaction into normalized StepEvents.
 *
 * Design constraints that shaped this, all of them consequences of running
 * inside pages we do not own:
 *
 *   - Delegated listeners on the document, never per-element bindings. Several
 *     Virtual Labs simulators rebuild their DOM wholesale on every action, so
 *     anything bound to an element is gone after the first click.
 *   - A MutationObserver re-scans for simulator frames, because the frame is
 *     often not in the DOM when the script first runs, and some labs swap the
 *     frame's document when the student picks a sub-simulator.
 *   - Capture phase and `passive: true`, so we never interfere with the lab's
 *     own handlers or delay its rendering. VLAILA must be unobservable to the
 *     experiment it is watching.
 *   - Debounced input and a hard event ceiling, so a simulator with a
 *     `mousemove`-driven canvas cannot flood the API.
 */

import { currentTask, simulatorFrames } from "./detect";

export interface StepEvent {
  action: string;
  task?: string;
  selector?: string;
  frame: string;
  value?: string;
  numericValue?: number;
  elapsedMs?: number;
}

type Emit = (event: StepEvent) => void;

const MAX_EVENTS_PER_MINUTE = 60;

/** A stable, readable selector for an element: id, else tag.class, else tag. */
function describe(el: Element): string {
  if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
  const cls = (el.getAttribute("class") || "")
    .split(/\s+/)
    .filter((c) => c && !/^(ng-|is-|active$|selected$)/.test(c))
    .slice(0, 2)
    .join(".");
  if (cls) return `${el.tagName.toLowerCase()}.${cls}`;
  const href = el.getAttribute("href");
  if (href) return `${el.tagName.toLowerCase()}[href="${href}"]`;
  return el.tagName.toLowerCase();
}

/** The element's accessible label, so a KB author can target it by text. */
function labelOf(el: Element): string | undefined {
  const input = el as HTMLInputElement;
  if (input.value && (el.tagName === "INPUT" || el.tagName === "BUTTON")) {
    return input.value.trim().slice(0, 80);
  }
  const aria = el.getAttribute("aria-label") || el.getAttribute("title");
  if (aria) return aria.trim().slice(0, 80);
  const text = (el as HTMLElement).innerText || el.textContent || "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

const INTERACTIVE =
  'a,button,input,select,textarea,label,img,canvas,[role="button"],md-select,md-option,md-slider';

/**
 * Duck-typed, deliberately.
 *
 * `target instanceof Element` looks like the obvious check and is wrong here:
 * an element inside the simulator iframe belongs to that frame's realm, so it
 * is an instance of the *iframe's* Element constructor, not this window's, and
 * the check silently fails for every interaction that matters most. Test for
 * the shape instead.
 */
function closestInteractive(target: EventTarget | null): Element | null {
  const node = target as Element | null;
  if (!node || node.nodeType !== 1 || typeof node.closest !== "function") return null;
  return node.closest(INTERACTIVE) ?? node;
}

export class Observer {
  private emit: Emit;
  private attached = new WeakSet<Document>();
  private frameNames = new WeakMap<Document, string>();
  private lastEventAt = Date.now();
  private budget: number[] = [];
  private inputTimers = new Map<string, number>();
  private mutationObserver?: MutationObserver;
  private rescanTimer?: number;

  constructor(emit: Emit) {
    this.emit = emit;
  }

  start(): void {
    this.attach(document, "host");
    this.scanFrames();

    // Frames arrive late and get replaced; re-scan on DOM change, coalesced.
    this.mutationObserver = new MutationObserver(() => {
      window.clearTimeout(this.rescanTimer);
      this.rescanTimer = window.setTimeout(() => this.scanFrames(), 400);
    });
    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Frames also finish loading without mutating the parent DOM.
    window.setTimeout(() => this.scanFrames(), 1200);
    window.setTimeout(() => this.scanFrames(), 3000);
  }

  stop(): void {
    this.mutationObserver?.disconnect();
  }

  /** Seconds since the student last did anything we recognised. */
  idleSeconds(): number {
    return (Date.now() - this.lastEventAt) / 1000;
  }

  private scanFrames(): void {
    for (const { name, doc } of simulatorFrames()) {
      if (this.attached.has(doc)) continue;
      this.frameNames.set(doc, name);
      this.attach(doc, name);
    }
  }

  private attach(doc: Document, frame: string): void {
    if (this.attached.has(doc)) return;
    this.attached.add(doc);
    this.frameNames.set(doc, frame);

    const opts: AddEventListenerOptions = { capture: true, passive: true };

    doc.addEventListener("click", (e) => this.onClick(e, frame), opts);
    doc.addEventListener("change", (e) => this.onChange(e, frame), opts);
    doc.addEventListener("input", (e) => this.onInput(e, frame), opts);
    doc.addEventListener("submit", (e) => this.onSubmit(e, frame), opts);
  }

  private allow(): boolean {
    const now = Date.now();
    this.budget = this.budget.filter((t) => now - t < 60_000);
    if (this.budget.length >= MAX_EVENTS_PER_MINUTE) return false;
    this.budget.push(now);
    return true;
  }

  private send(event: StepEvent): void {
    this.lastEventAt = Date.now();
    if (!this.allow()) return;
    this.emit(event);
  }

  private onClick(e: Event, frame: string): void {
    const el = closestInteractive(e.target);
    if (!el) return;

    // An in-page link to another task page is a navigation, not a click: it
    // tells us the student is moving between Aim / Theory / Simulation, which
    // is what the KB's navigate detectors key on.
    const href = el.getAttribute?.("href");
    if (href && /\.html?($|[?#])/.test(href) && !href.startsWith("http")) {
      const task = this.taskFromHref(href);
      if (task) {
        this.send({ action: "navigate", task, frame, selector: describe(el) });
        return;
      }
    }

    const input = el as HTMLInputElement;
    if (input.type === "file") return; // handled by change

    this.send({
      action: "click",
      task: currentTask(),
      selector: describe(el),
      frame,
      value: labelOf(el),
    });
  }

  private onChange(e: Event, frame: string): void {
    const el = e.target as HTMLInputElement | HTMLSelectElement | null;
    if (!el || !el.tagName) return;

    if ((el as HTMLInputElement).type === "file") {
      this.send({
        action: "upload",
        task: currentTask(),
        selector: describe(el),
        frame,
        value: (el as HTMLInputElement).files?.[0]?.name,
      });
      return;
    }

    const action = el.tagName === "SELECT" ? "select" : "change";
    const raw = (el as HTMLInputElement).value;
    const numeric = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : undefined;

    this.send({
      action,
      task: currentTask(),
      selector: describe(el),
      frame,
      value: raw?.slice(0, 120),
      numericValue: numeric,
    });
  }

  private onInput(e: Event, frame: string): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
    if (el.type === "file") return;

    // Debounce: a student typing "220" must produce one event, not three.
    const key = `${frame}:${describe(el)}`;
    window.clearTimeout(this.inputTimers.get(key));
    this.inputTimers.set(
      key,
      window.setTimeout(() => {
        const raw = el.value;
        const numeric = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : undefined;
        this.send({
          action: "input",
          task: currentTask(),
          selector: describe(el),
          frame,
          value: raw?.slice(0, 120),
          numericValue: numeric,
        });
      }, 600),
    );
  }

  private onSubmit(e: Event, frame: string): void {
    const el = e.target as Element | null;
    this.send({
      action: "submit",
      task: currentTask(),
      selector: el ? describe(el) : undefined,
      frame,
    });
  }

  private taskFromHref(href: string): string | undefined {
    const file = href.split("/").pop()?.split(/[?#]/)[0]?.replace(".html", "").toLowerCase();
    const map: Record<string, string> = {
      index: "Aim",
      theory: "Theory",
      pretest: "Pretest",
      procedure: "Procedure",
      simulation: "Simulation",
      posttest: "Posttest",
      references: "References",
      feedback: "Feedback",
    };
    return file ? map[file] : undefined;
  }

  /** Resolve a KB `frame` name to a live document, for highlighting. */
  documentFor(frame: string | undefined): Document {
    if (!frame || frame === "host") return document;
    for (const { name, doc } of simulatorFrames()) {
      if (name === frame) return doc;
    }
    // `sim` in the KB means "anywhere in the simulator"; take the outermost.
    if (frame === "sim") {
      const first = simulatorFrames()[0];
      if (first) return first.doc;
    }
    return document;
  }
}
