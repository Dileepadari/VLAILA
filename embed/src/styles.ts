/**
 * Widget styles.
 *
 * Injected into a Shadow root, so none of this leaks out and none of the host
 * page's Bootstrap leaks in. That isolation is non-negotiable when injecting
 * into ~200 sites nobody on this team controls: the labs style bare `button`,
 * `h1` and `.btn` globally, and without a shadow boundary VLAILA would inherit
 * a different look on every lab.
 *
 * The palette is anchored on the platform's own blue (#4076e0 in their theme
 * colour, #0B6493 in their headers) and extended into an OKLCH ramp so tints
 * stay perceptually even. Type uses the system stack: the widget adds zero
 * network requests to a page it does not own.
 */

export const CSS = /* css */ `
:host {
  --vl-accent: oklch(0.55 0.14 240);
  --vl-accent-strong: oklch(0.46 0.15 245);
  --vl-accent-soft: oklch(0.96 0.02 240);
  --vl-warn: oklch(0.72 0.15 75);
  --vl-warn-soft: oklch(0.96 0.05 80);
  --vl-danger: oklch(0.58 0.19 25);
  --vl-danger-soft: oklch(0.96 0.04 25);
  --vl-ok: oklch(0.62 0.14 155);
  --vl-ok-soft: oklch(0.95 0.05 155);

  --vl-bg: oklch(1 0 0);
  --vl-bg-sunken: oklch(0.975 0.003 250);
  --vl-fg: oklch(0.24 0.02 255);
  --vl-fg-muted: oklch(0.52 0.02 255);
  --vl-border: oklch(0.90 0.008 255);

  --vl-shadow-1: 0 2px 6px oklch(0.25 0.03 255 / 0.14), 0 8px 24px oklch(0.25 0.03 255 / 0.10);
  --vl-shadow-2: 0 1px 2px oklch(0.25 0.03 255 / 0.08), 0 12px 32px oklch(0.25 0.03 255 / 0.16);

  --vl-radius: 14px;
  --vl-ease: cubic-bezier(.32,.72,0,1);
  --vl-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  all: initial;
  font-family: var(--vl-font);
  color: var(--vl-fg);
  -webkit-font-smoothing: antialiased;
}

/* Dark theme is driven by the host page, not by the OS.
   The widget is a guest on someone else's page: a dark panel floating over a
   white lab page reads as a browser extension that got loose, not as part of
   the experiment. The data-theme attribute is set from the page's own
   background -- see detectHostTheme() in ui.ts. */
:host([data-theme="dark"]) {
    --vl-accent: oklch(0.70 0.13 235);
    --vl-accent-strong: oklch(0.78 0.12 235);
    --vl-accent-soft: oklch(0.30 0.04 245);
    --vl-warn-soft: oklch(0.32 0.06 80);
    --vl-danger-soft: oklch(0.32 0.07 25);
    --vl-ok-soft: oklch(0.30 0.06 155);
    --vl-bg: oklch(0.21 0.015 255);
    --vl-bg-sunken: oklch(0.26 0.018 255);
    --vl-fg: oklch(0.96 0.005 255);
    --vl-fg-muted: oklch(0.72 0.015 255);
    --vl-border: oklch(1 0 0 / 0.14);
    --vl-shadow-1: 0 2px 6px oklch(0 0 0 / 0.4), 0 8px 24px oklch(0 0 0 / 0.35);
    --vl-shadow-2: 0 1px 2px oklch(0 0 0 / 0.3), 0 12px 32px oklch(0 0 0 / 0.45);
    color-scheme: dark;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.root {
  position: fixed;
  inset: auto 0 0 auto;
  z-index: 2147483000;
  pointer-events: none;
}
.root > * { pointer-events: auto; }

/* ---------------------------------------------------- the lab assistant --- */

.stage {
  position: fixed;
  right: 16px;
  bottom: 0;
  width: 142px;
  height: 238px;
  border: none; padding: 0; margin: 0;
  background: transparent;
  cursor: pointer;
  display: block;
  -webkit-tap-highlight-color: transparent;
  animation: vl-arrive .7s var(--vl-ease) both;
}
.stage:focus-visible { outline: 3px solid var(--vl-accent); outline-offset: 4px; border-radius: 12px; }
.stage .vl-figure { display: block; width: 142px; height: 234px; overflow: visible; }

@keyframes vl-arrive {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: none; }
}

/* Breathing. Slow, small, and on the torso only -- a whole-figure bob reads
   as a bouncing sticker, whereas a 4-second chest rise reads as a person
   standing still. */
.vl-body { transform-box: view-box; transform-origin: 100px 300px; animation: vl-breathe 4.2s ease-in-out infinite; }
@keyframes vl-breathe {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50%      { transform: translateY(-1.4px) scaleY(1.007); }
}

/* Joints. Poses are rotations about these origins, set from JS. */
.vl-arm-left  { transform-box: view-box; transform-origin: 78px 112px;  transition: transform .5s var(--vl-ease); }
.vl-arm-right { transform-box: view-box; transform-origin: 122px 112px; transition: transform .5s var(--vl-ease); }
.vl-head      { transform-box: view-box; transform-origin: 100px 82px;  transition: transform .5s var(--vl-ease); }
.vl-brows     { transform-box: view-box; transition: transform .3s var(--vl-ease); }
.vl-mouth     { transition: d .3s var(--vl-ease); }
.vl-clipboard { transition: opacity .35s var(--vl-ease); }

/* Blink: the lid rect drops and lifts. Timing is deliberately irregular
   between the two eyes by a few milliseconds -- perfectly synchronous blinks
   look mechanical. */
.vl-lid { animation: vl-blink 5.4s infinite; }
.vl-lid:nth-of-type(2) { animation-delay: .04s; }
@keyframes vl-blink {
  0%, 92%, 100% { height: 0; }
  94%, 96%      { height: 13px; }
}

/* Talking: a small mouth pulse while text streams in. */
.stage[data-pose="talking"] .vl-mouth {
  transform-box: fill-box; transform-origin: center;
  animation: vl-speak .34s ease-in-out infinite;
}
@keyframes vl-speak {
  0%, 100% { transform: scaleY(1); }
  50%      { transform: scaleY(1.55); }
}

/* State tint on the ground shadow -- a quiet, ambient signal that does not
   require looking at the character's face. */
.vl-ground { transition: fill .4s var(--vl-ease); }
.stage[data-state="warn"] .vl-ground { fill: oklch(0.50 0.10 25 / .17); }
.stage[data-state="hint"] .vl-ground { fill: oklch(0.58 0.08 75 / .16); }
.stage[data-state="ok"]   .vl-ground { fill: oklch(0.52 0.07 155 / .15); }

/* Unread count, pinned to the assistant's shoulder. */
.stage .badge {
  position: absolute; top: 46px; left: 2px;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 999px;
  background: var(--vl-danger); color: #fff;
  font-size: 11px; font-weight: 700; line-height: 20px; text-align: center;
  box-shadow: 0 0 0 2px var(--vl-bg), var(--vl-shadow-1);
}
.stage .badge[hidden] { display: none; }

/* A single attention beat when the assistant has something new to say. */
@keyframes vl-nudge {
  0%, 100% { transform: translateY(0) rotate(0); }
  25%      { transform: translateY(-7px) rotate(-1.6deg); }
  60%      { transform: translateY(-2px) rotate(.8deg); }
}
.stage.is-alerting .vl-body { animation: vl-nudge .62s var(--vl-ease), vl-breathe 4.2s ease-in-out infinite .62s; }


/* ------------------------------------------------------------- thought ---- */

/*
 * The default way the assistant says anything.
 *
 * A thought is not a chat message: it hovers beside their head, it is short,
 * and it trails down to them so it reads as coming out of their head rather
 * than arriving from a notification system. Clicking it opens the full panel.
 */
.thought {
  position: fixed;
  right: 118px;
  bottom: 196px;
  width: 252px;
  max-width: calc(100vw - 150px);
  background: var(--vl-bg);
  color: var(--vl-fg);
  border: 1px solid var(--vl-border);
  /* Uneven radii read as hand-drawn rather than as a dialog box. */
  border-radius: 26px 26px 8px 26px;
  padding: 12px 15px 13px;
  box-shadow: var(--vl-shadow-2);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transform-origin: bottom right;
  animation: vl-think-in .34s var(--vl-ease) both;
  z-index: 2;
}
.thought[hidden] { display: none; }
.thought:hover { border-color: var(--vl-accent); }
.thought:focus-visible { outline: 3px solid var(--vl-accent); outline-offset: 3px; }

@keyframes vl-think-in {
  from { opacity: 0; transform: scale(.7) translate(14px, 14px); }
  to   { opacity: 1; transform: none; }
}

/* The bumps along the top edge that make a rounded box read as a cloud. */
.thought::before {
  content: '';
  position: absolute;
  top: -7px; left: 26px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--vl-bg);
  border: 1px solid var(--vl-border);
  border-bottom-color: transparent;
  border-right-color: transparent;
  transform: rotate(-45deg);
}
.thought::after {
  content: '';
  position: absolute;
  top: -5px; right: 46px;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--vl-bg);
  border: 1px solid var(--vl-border);
  border-bottom-color: transparent;
  border-right-color: transparent;
  transform: rotate(-45deg);
}

.thought .t-kind {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--vl-accent-strong);
  display: block;
  margin-bottom: 4px;
}
.thought[data-kind="warn"] .t-kind { color: var(--vl-danger); }
.thought[data-kind="hint"] .t-kind { color: oklch(0.45 0.11 70); }
.thought[data-kind="concept"] .t-kind { color: oklch(0.42 0.10 155); }

.thought .t-text {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--vl-fg);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.thought .t-more {
  display: block;
  margin-top: 7px;
  font-size: 10.5px;
  color: var(--vl-fg-muted);
}

/* The tail: three shrinking circles running down to the assistant's head. */
.thought .t-dots {
  position: absolute;
  right: -22px;
  bottom: -30px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}
.thought .t-dots i {
  display: block;
  border-radius: 50%;
  background: var(--vl-bg);
  border: 1px solid var(--vl-border);
}
.thought .t-dots i:nth-child(1) { width: 13px; height: 13px; margin-left: 0; }
.thought .t-dots i:nth-child(2) { width: 9px;  height: 9px;  margin-left: 10px; }
.thought .t-dots i:nth-child(3) { width: 6px;  height: 6px;  margin-left: 18px; }

@media (max-width: 640px) {
  .thought { right: 96px; bottom: 128px; width: 210px; }
}

/* --------------------------------------------------------- avatar picker -- */

.who {
  display: flex;
  gap: 4px;
  padding: 2px;
  background: var(--vl-bg-sunken);
  border: 1px solid var(--vl-border);
  border-radius: 999px;
}
.who button {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 3px 9px;
  font: inherit;
  font-size: 11px;
  font-weight: 550;
  color: var(--vl-fg-muted);
  cursor: pointer;
}
.who button[aria-pressed="true"] {
  background: var(--vl-accent);
  color: #fff;
}
.who button:focus-visible { outline: 2px solid var(--vl-accent); outline-offset: 1px; }

/* --------------------------------------------------------------- panel ---- */

.panel {
  position: fixed;
  right: 162px;
  bottom: 34px;
  width: 340px;
  max-width: calc(100vw - 40px);
  max-height: min(620px, calc(100vh - 120px));
  display: flex; flex-direction: column;
  background: var(--vl-bg);
  border: 1px solid var(--vl-border);
  border-radius: var(--vl-radius);
  box-shadow: var(--vl-shadow-2);
  /* Visible, not hidden: the tail lives outside the panel box, and
     overflow:hidden would clip the one element that makes this read as
     speech. The corners are rounded on the first and last children instead. */
  overflow: visible;
  transform: translateY(8px) scale(.98);
  opacity: 0;
  transition: opacity .18s var(--vl-ease), transform .18s var(--vl-ease);
}
.panel.is-open { opacity: 1; transform: none; }
.panel[hidden] { display: none; }

/* The tail is what turns a floating card into something the assistant is
   saying. Two stacked triangles fake a 1px border on the diagonal, which a
   single clip-path cannot do. */
.panel::after,
.panel::before {
  content: '';
  position: absolute;
  right: -11px;
  bottom: 42px;
  width: 0; height: 0;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 11px solid var(--vl-border);
}
.panel::after {
  right: -9px;
  border-left-color: var(--vl-bg);
}

/* Thought bubble: proactive nudges are the assistant thinking out loud rather
   than addressing the student, so they trail dots instead of a spoken tail. */
.panel[data-mode="thought"] { border-radius: 20px; }
.panel[data-mode="thought"]::before,
.panel[data-mode="thought"]::after { display: none; }

.thought-trail {
  position: absolute;
  right: -6px;
  bottom: -26px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.thought-trail i {
  display: block; border-radius: 999px;
  background: var(--vl-bg);
  border: 1px solid var(--vl-border);
}
.thought-trail i:nth-child(1) { width: 13px; height: 13px; }
.thought-trail i:nth-child(2) { width: 8px;  height: 8px; }
.thought-trail i:nth-child(3) { width: 5px;  height: 5px; }
.panel:not([data-mode="thought"]) .thought-trail { display: none; }

.panel-head {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--vl-border);
  background: var(--vl-bg-sunken);
  border-radius: calc(var(--vl-radius) - 1px) calc(var(--vl-radius) - 1px) 0 0;
}
.panel-head .mark {
  width: 26px; height: 26px; border-radius: 8px;
  display: grid; place-items: center;
  background: var(--vl-accent); color: #fff;
  font-size: 12px; font-weight: 700; letter-spacing: -.02em;
}
.panel-head .title { font-size: 13px; font-weight: 650; letter-spacing: -.01em; }
.panel-head .sub { font-size: 11px; color: var(--vl-fg-muted); margin-top: 1px; }
.panel-head .spacer { flex: 1; }

.icon-btn {
  border: none; background: transparent; cursor: pointer;
  width: 28px; height: 28px; border-radius: 8px;
  color: var(--vl-fg-muted); font-size: 15px; line-height: 1;
  display: grid; place-items: center;
}
.icon-btn:hover { background: var(--vl-border); color: var(--vl-fg); }
.icon-btn:focus-visible { outline: 2px solid var(--vl-accent); outline-offset: 1px; }

.progress {
  height: 3px; background: var(--vl-border); position: relative; overflow: hidden;
}
.progress i {
  position: absolute; inset: 0 auto 0 0;
  background: var(--vl-accent);
  transition: width .5s var(--vl-ease);
}

.tabs { display: flex; border-bottom: 1px solid var(--vl-border); }
.tabs button {
  flex: 1; border: none; background: transparent; cursor: pointer;
  padding: 9px 4px; font: inherit; font-size: 12px; font-weight: 550;
  color: var(--vl-fg-muted);
  border-bottom: 2px solid transparent;
}
.tabs button[aria-selected="true"] { color: var(--vl-accent); border-bottom-color: var(--vl-accent); }
.tabs button:focus-visible { outline: 2px solid var(--vl-accent); outline-offset: -2px; }

.body {
  flex: 1; overflow-y: auto; overscroll-behavior: contain;
  border-radius: 0 0 calc(var(--vl-radius) - 1px) calc(var(--vl-radius) - 1px);
}
.body:has(+ .composer) { border-radius: 0; }
.body::-webkit-scrollbar { width: 8px; }
.body::-webkit-scrollbar-thumb { background: var(--vl-border); border-radius: 8px; }

/* -------------------------------------------------------- intervention ---- */

.card { padding: 14px; }

.chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px; border-radius: 999px;
  font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  background: var(--vl-accent-soft); color: var(--vl-accent-strong);
}
.chip[data-kind="warn"]    { background: var(--vl-danger-soft); color: var(--vl-danger); }
.chip[data-kind="hint"]    { background: var(--vl-warn-soft);   color: oklch(0.45 0.11 70); }
.chip[data-kind="concept"] { background: var(--vl-ok-soft);     color: oklch(0.42 0.10 155); }

.card h3 { font-size: 14px; font-weight: 650; margin: 9px 0 5px; letter-spacing: -.01em; }
.card p  { font-size: 13px; line-height: 1.55; color: var(--vl-fg-muted); }
.card p strong { color: var(--vl-fg); font-weight: 650; }
.card p em { font-style: italic; }
.card p code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; background: var(--vl-bg-sunken);
  padding: 1px 4px; border-radius: 4px;
}

.actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }

/* The live read-out's supporting numbers. Understated on purpose: this is
   context a student can glance at, not a scoreboard to perform against. */
.stats { display: flex; gap: 14px; margin-top: 12px; }
.stat { display: flex; flex-direction: column; gap: 1px; }
.stat-v { font-size: 15px; font-weight: 650; color: var(--vl-fg); font-variant-numeric: tabular-nums; }
.stat-l { font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: var(--vl-fg-muted); }
.btn {
  border: 1px solid var(--vl-border); background: var(--vl-bg);
  color: var(--vl-fg); cursor: pointer;
  padding: 7px 11px; border-radius: 9px;
  font: inherit; font-size: 12px; font-weight: 550;
  transition: background .15s var(--vl-ease), border-color .15s var(--vl-ease);
}
.btn:hover { background: var(--vl-bg-sunken); }
.btn:focus-visible { outline: 2px solid var(--vl-accent); outline-offset: 1px; }
.btn.primary { background: var(--vl-accent); border-color: var(--vl-accent); color: #fff; }
.btn.primary:hover { background: var(--vl-accent-strong); }
.btn.ghost { border-color: transparent; color: var(--vl-fg-muted); }

.meta {
  margin-top: 11px; padding-top: 10px;
  border-top: 1px solid var(--vl-border);
  font-size: 10.5px; color: var(--vl-fg-muted);
  display: flex; align-items: center; gap: 6px;
}
.meta button {
  border: none; background: none; padding: 0; cursor: pointer;
  color: var(--vl-fg-muted); font: inherit; font-size: 10.5px; text-decoration: underline;
}
.meta button:hover { color: var(--vl-danger); }

/* ---------------------------------------------------------------- chat ---- */

.thread { padding: 12px; display: flex; flex-direction: column; gap: 9px; }
.msg {
  max-width: 88%; padding: 8px 11px; border-radius: 13px;
  font-size: 13px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
}
.msg.agent { background: var(--vl-bg-sunken); border: 1px solid var(--vl-border); border-bottom-left-radius: 5px; }
.msg.user  { background: var(--vl-accent); color: #fff; align-self: flex-end; border-bottom-right-radius: 5px; }
.msg strong { font-weight: 650; }
.msg em { font-style: italic; }
.msg code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
  background: oklch(0.5 0 0 / .13); padding: 1px 4px; border-radius: 4px;
}
.msg .cite { display: block; margin-top: 6px; font-size: 10.5px; color: var(--vl-fg-muted); }

.typing { display: inline-flex; gap: 3px; padding: 3px 0; }
.typing i {
  width: 5px; height: 5px; border-radius: 999px; background: var(--vl-fg-muted);
  animation: vl-bounce 1.1s infinite;
}
.typing i:nth-child(2) { animation-delay: .15s; }
.typing i:nth-child(3) { animation-delay: .3s; }
@keyframes vl-bounce { 0%,60%,100% { opacity:.3; transform: translateY(0);} 30% { opacity:1; transform: translateY(-3px);} }

.composer {
  display: flex; align-items: center; gap: 7px;
  padding: 10px; border-top: 1px solid var(--vl-border); background: var(--vl-bg);
  border-radius: 0 0 calc(var(--vl-radius) - 1px) calc(var(--vl-radius) - 1px);
}
.composer input {
  flex: 1; min-width: 0;
  border: 1px solid var(--vl-border); border-radius: 10px;
  background: var(--vl-bg-sunken); color: var(--vl-fg);
  padding: 8px 11px; font: inherit; font-size: 13px;
}
.composer input:focus { outline: 2px solid var(--vl-accent); outline-offset: -1px; }
.composer input::placeholder { color: var(--vl-fg-muted); }
.send {
  border: none; background: var(--vl-accent); color: #fff; cursor: pointer;
  width: 32px; height: 32px; border-radius: 9px; flex: none;
  display: grid; place-items: center; font-size: 14px;
}
.send:disabled { opacity: .45; cursor: default; }
.mic[data-active="true"] { background: var(--vl-danger); color: #fff; }

.suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
.suggestions button {
  border: 1px solid var(--vl-border); background: var(--vl-bg); color: var(--vl-fg-muted);
  border-radius: 999px; padding: 5px 10px; font: inherit; font-size: 11.5px; cursor: pointer;
}
.suggestions button:hover { border-color: var(--vl-accent); color: var(--vl-accent); }

/* ------------------------------------------------------------- summary ---- */

.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
.stat { background: var(--vl-bg-sunken); border: 1px solid var(--vl-border); border-radius: 10px; padding: 9px 10px; }
.stat .k { font-size: 10.5px; color: var(--vl-fg-muted); text-transform: uppercase; letter-spacing: .04em; }
.stat .v { font-size: 19px; font-weight: 680; letter-spacing: -.02em; margin-top: 2px; }
.stat .v.good { color: var(--vl-ok); }
.stat .v.warn { color: var(--vl-warn); }

.review { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.review span {
  background: var(--vl-accent-soft); color: var(--vl-accent-strong);
  border-radius: 999px; padding: 4px 9px; font-size: 11.5px; font-weight: 550;
}

.quiz-q { border-top: 1px solid var(--vl-border); padding-top: 12px; margin-top: 12px; }
.quiz-q > p { font-size: 13px; font-weight: 600; color: var(--vl-fg); margin-bottom: 8px; }
.opt { display: block; margin-bottom: 5px; }
.opt input { position: absolute; opacity: 0; width: 0; height: 0; }
.opt span {
  display: block; border: 1px solid var(--vl-border); border-radius: 9px;
  padding: 7px 10px; font-size: 12.5px; cursor: pointer; line-height: 1.4;
}
.opt input:checked + span { border-color: var(--vl-accent); background: var(--vl-accent-soft); }
.opt input:focus-visible + span { outline: 2px solid var(--vl-accent); outline-offset: 1px; }
.opt.correct span { border-color: var(--vl-ok); background: var(--vl-ok-soft); }
.opt.wrong span   { border-color: var(--vl-danger); background: var(--vl-danger-soft); }
.feedback { font-size: 12px; line-height: 1.5; color: var(--vl-fg-muted); margin-top: 6px; }

/* ------------------------------------------------------------ highlight --- */

.hl-ring {
  position: absolute;
  border: 2px solid var(--vl-accent);
  border-radius: 10px;
  box-shadow: 0 0 0 4px oklch(0.55 0.14 240 / .22);
  pointer-events: none;
  z-index: 2147483001;
  transition: all .2s var(--vl-ease);
}
@keyframes vl-ping {
  0%   { box-shadow: 0 0 0 0 oklch(0.55 0.14 240 / .5); }
  70%  { box-shadow: 0 0 0 12px oklch(0.55 0.14 240 / 0); }
  100% { box-shadow: 0 0 0 0 oklch(0.55 0.14 240 / 0); }
}
.hl-ring.ping { animation: vl-ping 1.3s ease-out 2; }

/* ------------------------------------------------------------- a11y ------- */

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Reduced motion removes the breathing, blinking and nudge entirely. The
   character still poses -- posture carries meaning -- it simply holds still. */
@media (prefers-reduced-motion: reduce) {
  *, .stage, .vl-body, .vl-lid, .panel, .progress i, .hl-ring {
    transition: none !important;
    animation: none !important;
  }
}

/* On a phone the assistant would eat a third of the screen, so they shrink and
   the bubble takes the full width above them. */
@media (max-width: 640px) {
  .stage { width: 84px; height: 142px; right: 8px; }
  .stage .vl-figure { width: 84px; height: 139px; }
  .panel { right: 10px; left: 10px; width: auto; bottom: 150px; max-height: calc(100vh - 190px); }
  .panel::before, .panel::after { right: 46px; bottom: -17px;
    border-left: 9px solid transparent; border-right: 9px solid transparent;
    border-top: 11px solid var(--vl-border); border-bottom: none; }
  .panel::after { bottom: -15px; border-top-color: var(--vl-bg); }
  .thought-trail { right: 40px; bottom: -30px; }
}
`;
