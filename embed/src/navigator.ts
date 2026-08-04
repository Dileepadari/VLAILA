/**
 * Navigator mode.
 *
 * On an experiment page the assistant has a knowledge base to reason against.
 * Everywhere else -- the portal, the broad-area listings, a lab's own pages,
 * the dashboards -- there is no procedure to validate, so the job changes: it
 * becomes the person at the front desk who knows where everything is.
 *
 * That is worth doing because the platform is large (1500+ experiments across
 * ten disciplines) and its own navigation is a nested hierarchy. The most
 * common failure on the portal is not doing a step wrong; it is not finding
 * the lab at all.
 *
 * Everything here is derived from the page in front of it. There is no second
 * knowledge base to maintain: the links, headings and lab rows on the page are
 * the index.
 */

export type PageKind =
  | 'home'
  | 'broad-area'
  | 'lab'
  | 'institutes'
  | 'about'
  | 'contact'
  | 'dashboard'
  | 'other';

export interface PageContext {
  kind: PageKind;
  title: string;
  /** Navigable destinations found on the page, deduped and ranked. */
  targets: { label: string; href: string; group?: string }[];
}

const MAX_TARGETS = 40;

export function classify(): PageKind {
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '' || path === '/') return 'home';
  if (/broad-area/.test(path)) return 'broad-area';
  if (/\/labs?\//.test(path) || document.querySelector('.vlabs-page-main')) return 'lab';
  if (/participating-institutes|partners/.test(path)) return 'institutes';
  if (/about/.test(path)) return 'about';
  if (/contact/.test(path)) return 'contact';
  if (/dashboard|faculty|admin|studio/.test(path)) return 'dashboard';
  return 'other';
}

/**
 * Read the page's own links as the index.
 *
 * Restricted to same-origin, in-content links: the header, footer and any
 * social or external link would otherwise swamp the useful destinations.
 */
export function scanTargets(): PageContext['targets'] {
  const seen = new Set<string>();
  const out: PageContext['targets'] = [];

  const scopes = [
    document.querySelector('.ba-text'),
    document.querySelector('.vlabs-page-content'),
    document.querySelector('#menu'),
    document.querySelector('main'),
    document.body,
  ].filter(Boolean) as Element[];

  for (const scope of scopes) {
    for (const a of Array.from(scope.querySelectorAll('a[href]'))) {
      if (out.length >= MAX_TARGETS) break;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        continue;
      }
      // Skip the chrome: these are on every page and are never the answer to
      // "where do I find X".
      if (a.closest('header,footer,.footer,.ftr,.navbar,.sm-hdr-top,nav.navbar')) continue;

      const label = (a.textContent || '').trim().replace(/\s+/g, ' ');
      if (!label || label.length < 3 || label.length > 90) continue;

      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const group =
        a.closest('.labs')
          ? 'Lab'
          : a.closest('.ba-text')
            ? 'Discipline'
            : a.closest('#menu')
              ? 'This lab'
              : undefined;

      out.push({ label, href, group });
    }
    if (out.length >= MAX_TARGETS) break;
  }

  return out;
}

export function pageContext(): PageContext {
  const kind = classify();
  const heading =
    document.querySelector('.innerhead-text')?.textContent?.trim() ||
    document.querySelector('.vlabs-page-content h2')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title;

  return { kind, title: heading || document.title, targets: scanTargets() };
}

/** What the assistant offers when it is opened with nothing else to say. */
export function greeting(ctx: PageContext): { title: string; message: string } {
  switch (ctx.kind) {
    case 'home':
      return {
        title: 'Looking for a particular lab?',
        message:
          'There are ten disciplines here and over 1500 experiments. Tell me a subject — “half adder”, “titration”, “pendulum” — and I will take you to the lab that covers it.',
      };
    case 'broad-area':
      return {
        title: `${ctx.title}`,
        message: `This page lists the labs in ${ctx.title.toLowerCase()}, each hosted by the institute that built it. Tell me what you want to practise and I will pick the lab, or say “what is in this area?” for a summary.`,
      };
    case 'lab':
      return {
        title: 'Inside a lab',
        message:
          'Introduction and Objective set up the theory; List of experiments is where the actual simulators are. Once you open an experiment I switch from guide to lab assistant and start watching the steps with you.',
      };
    case 'institutes':
      return {
        title: 'Participating institutes',
        message:
          'Each crest opens the labs that institute maintains. If you are looking for a subject rather than an institute, ask me and I will search across all of them.',
      };
    case 'dashboard':
      return {
        title: 'Your dashboard',
        message:
          'This is where your sessions, assignments and progress live. Ask me things like “what am I behind on?” or “which experiment did I struggle with?”.',
      };
    case 'about':
    case 'contact':
      return {
        title: 'About Virtual Labs',
        message:
          'Happy to answer questions about the platform. If you would rather get started, ask me for a subject and I will take you to a lab.',
      };
    default:
      return {
        title: 'I can help you find your way',
        message:
          'Tell me a subject, a lab or an experiment and I will take you there. On an experiment page I become a lab assistant and watch the steps with you.',
      };
  }
}

/**
 * Resolve a free-text request against the page's own links.
 *
 * Scored rather than exact-matched: a student asking for "adder" should reach
 * "Half Adder / Full Adder", and one asking for "titration" should reach
 * "Acid Base Titration". Substring hits on a whole word rank above scattered
 * character matches, which keeps nonsense from resolving to something.
 */
export function resolve(
  query: string,
  targets: PageContext['targets'],
): { label: string; href: string; score: number }[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  const scored = targets.map((t) => {
    const label = t.label.toLowerCase();
    let score = 0;
    if (label === q) score += 100;
    if (label.includes(q)) score += 40;
    for (const w of words) {
      if (label.includes(w)) score += 12;
      // Word-boundary hits are much stronger evidence than a bare substring.
      if (new RegExp(`\\b${escapeRe(w)}`).test(label)) score += 8;
    }
    return { label: t.label, href: t.href, score };
  });

  return scored
    .filter((s) => s.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
