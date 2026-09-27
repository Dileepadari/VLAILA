/**
 * Zero-configuration experiment detection.
 *
 * Every Virtual Labs experiment page is generated from the same `ph3-lab-mgmt`
 * template, and that template already publishes everything VLAILA needs to
 * identify itself. Verified against pp-iiith.vlabs.ac.in (Design Engineering),
 * de-iitr.vlabs.ac.in (Electronics) and ds1-iiith.vlabs.ac.in (Computer
 * Science) -- different labs, different institutes, identical markers:
 *
 *   window.dataLayer[0]                 labName, discipline, college, expName
 *   <meta name="experiment-short-name"> the experiment slug
 *   <meta name="task-name">             which page of the experiment we are on
 *   <meta name="developer-institute">   the developing institute
 *
 * That is why integration is one script tag and no configuration. The fallback
 * chain below exists only for the long tail of labs that predate the template.
 */

export interface ExperimentRef {
  experimentId: string;
  labId?: string;
  origin: string;
  discipline?: string;
  institute?: string;
  experimentTitle?: string;
  task?: string;
}

interface DataLayerEntry {
  labName?: string;
  discipline?: string;
  college?: string;
  phase?: string;
  expName?: string;
  expShortName?: string;
}

function meta(name: string): string | undefined {
  const el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const value = el?.getAttribute("content")?.trim();
  return value || undefined;
}

function dataLayerEntry(): DataLayerEntry {
  const layer = (window as unknown as { dataLayer?: DataLayerEntry[] }).dataLayer;
  if (!Array.isArray(layer)) return {};
  // The template pushes lab metadata as the first entry; GTM appends its own
  // events after it, so scan for the first entry that carries expShortName.
  return layer.find((e) => e && (e.expShortName || e.labName)) ?? {};
}

/** Derive a lab slug from the subdomain: `pp-iiith.vlabs.ac.in` -> `pp-iiith`. */
function labFromHost(): string | undefined {
  const host = location.hostname;
  if (!host.endsWith("vlabs.ac.in")) return undefined;
  const sub = host.split(".")[0];
  return sub && sub !== "www" ? sub : undefined;
}

/** `/exp/<slug>/simulation.html` -> `<slug>` */
function experimentFromPath(): string | undefined {
  const match = location.pathname.match(/\/exp\/([a-z0-9-]+)\//i);
  return match?.[1];
}

/**
 * Which task page we are on.
 *
 * `<meta name="task-name">` is authoritative and present on every template
 * page. The filename fallback covers the classic eight-page layout; note the
 * learning-unit labs (ds1-iiith and friends) define their own task names such
 * as Demo, Practice and Exercise, which is exactly why we read the meta tag
 * rather than hard-coding a list.
 */
export function currentTask(): string | undefined {
  const fromMeta = meta("task-name");
  if (fromMeta) return fromMeta;

  const file = location.pathname.split("/").pop()?.replace(".html", "").toLowerCase();
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

/** Explicit overrides, for a lab that needs to correct the auto-detection. */
function scriptOverrides(): Partial<ExperimentRef> & { api?: string } {
  const script =
    document.currentScript ?? document.querySelector<HTMLScriptElement>('script[src*="vlaila"]');
  if (!script) return {};
  const d = (script as HTMLScriptElement).dataset;
  return {
    experimentId: d.vlailaExperiment,
    labId: d.vlailaLab,
    discipline: d.vlailaDiscipline,
    institute: d.vlailaInstitute,
    api: d.vlailaApi,
  };
}

export function detect(): { ref: ExperimentRef | null; apiOverride?: string } {
  const overrides = scriptOverrides();
  const dl = dataLayerEntry();

  const experimentId =
    overrides.experimentId ||
    meta("experiment-short-name") ||
    dl.expShortName ||
    experimentFromPath();

  if (!experimentId) return { ref: null, apiOverride: overrides.api };

  const title =
    dl.expName ||
    meta("learning-unit") ||
    document.querySelector(".vlabs-page-content h2")?.textContent?.trim() ||
    document.title;

  return {
    ref: {
      experimentId,
      labId: overrides.labId || labFromHost(),
      origin: location.origin,
      discipline: overrides.discipline || dl.discipline,
      institute: overrides.institute || dl.college || meta("developer-institute"),
      experimentTitle: title || undefined,
      task: currentTask(),
    },
    apiOverride: overrides.api,
  };
}

/**
 * The simulator frame.
 *
 * The template renders the simulator into `iframe#fraDisabled`, served from
 * the same origin (`src="simulation/index.html"`), so its DOM is fully
 * readable. That single fact is why the Screen Observer works on real
 * interaction events rather than screenshots, and why the vision fallback the
 * original proposal budgeted for is a long-tail concern rather than the
 * critical path.
 */
export function simulatorFrames(): { name: string; doc: Document }[] {
  const found: { name: string; doc: Document }[] = [];
  const seen = new Set<Document>();

  const walk = (root: Document, prefix: string, depth: number) => {
    if (depth > 3) return;
    const frames = Array.from(root.querySelectorAll("iframe"));
    for (const frame of frames) {
      let doc: Document | null = null;
      try {
        doc = frame.contentDocument;
      } catch {
        // Cross-origin: nothing readable here. Silently skip -- an analytics
        // iframe on a lab page is normal and not an error condition.
        continue;
      }
      if (!doc || seen.has(doc) || !doc.body) continue;
      const src = frame.getAttribute("src") || "";
      if (/googletagmanager|doubleclick|analytics/.test(src)) continue;

      seen.add(doc);
      const leaf = src.split("/").pop()?.replace(".html", "") || `frame${found.length}`;
      const name = depth === 0 ? "sim" : `${prefix}:${leaf}`;
      found.push({ name, doc });
      // Several labs nest a chooser page inside the simulator frame -- the
      // half-adder lab is sim -> Simulator.html -> half_adder.html -- so the
      // real controls are two levels down.
      walk(doc, name, depth + 1);
    }
  };

  walk(document, "sim", 0);
  return found;
}
