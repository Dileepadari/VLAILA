/*! VLAILA - Virtual Labs AI Lab Assistant | AGPL-3.0 | vlab.co.in */
"use strict";(()=>{var T=class{constructor(t,e=8e3){this.base=t;this.timeoutMs=e}async post(t,e,i){let s=new AbortController,n=window.setTimeout(()=>s.abort(),i!=null?i:this.timeoutMs);try{let o=await fetch(`${this.base}${t}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e),signal:s.signal,credentials:"omit",mode:"cors"});return o.ok?await o.json():null}catch{return null}finally{window.clearTimeout(n)}}startSession(t,e){var i,s;return this.post("/session/start",{experiment:{experiment_id:t.experimentId,lab_id:t.labId,origin:t.origin,discipline:t.discipline,institute:t.institute,experiment_title:t.experimentTitle},role:(i=e.role)!=null?i:"student",user_key:e.userKey,institution:e.institution,locale:(s=e.locale)!=null?s:"en",client_version:"1.0.0"})}sendEvent(t,e){return this.post("/session/event",{session_id:t,action:e.action,task:e.task,selector:e.selector,frame:e.frame,value:e.value,numeric_value:e.numericValue,elapsed_ms:e.elapsedMs},2500)}behaviour(t,e,i){return this.post("/session/behaviour",{session_id:t,snapshot:e,signals:i})}feedback(t,e,i,s){return this.post("/session/feedback",{session_id:t,intervention_id:e,outcome:i,note:s})}endSession(t,e="completed"){return this.post("/session/end",{session_id:t,reason:e},25e3)}submitQuiz(t,e){return this.post("/session/quiz",{session_id:t,answers:e})}async*chat(t,e,i){var h,u;let s;try{s=await fetch(`${this.base}/chat/stream`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:t,message:e,history:i}),credentials:"omit",mode:"cors"})}catch{yield{delta:"I could not reach the assistant service just now.",done:!0};return}if(!s.ok||!s.body){let c=await this.post("/chat",{session_id:t,message:e,history:i});yield{delta:(h=c==null?void 0:c.text)!=null?h:"I could not reach the assistant service just now.",done:!0};return}let n=s.body.getReader(),o=new TextDecoder,a="";for(;;){let{value:c,done:m}=await n.read();if(m)break;a+=o.decode(c,{stream:!0});let v=a.split(`

`);a=(u=v.pop())!=null?u:"";for(let g of v){let p=g.trim();if(p.startsWith("data:"))try{yield JSON.parse(p.slice(5).trim())}catch{}}}}};function E(r){var i;let t=document.querySelector(`meta[name="${r}"]`);return((i=t==null?void 0:t.getAttribute("content"))==null?void 0:i.trim())||void 0}function lt(){var t;let r=window.dataLayer;return Array.isArray(r)?(t=r.find(e=>e&&(e.expShortName||e.labName)))!=null?t:{}:{}}function ct(){let r=location.hostname;if(!r.endsWith("vlabs.ac.in"))return;let t=r.split(".")[0];return t&&t!=="www"?t:void 0}function dt(){let r=location.pathname.match(/\/exp\/([a-z0-9-]+)\//i);return r==null?void 0:r[1]}function b(){var i;let r=E("task-name");if(r)return r;let t=(i=location.pathname.split("/").pop())==null?void 0:i.replace(".html","").toLowerCase();return t?{index:"Aim",theory:"Theory",pretest:"Pretest",procedure:"Procedure",simulation:"Simulation",posttest:"Posttest",references:"References",feedback:"Feedback"}[t]:void 0}function ht(){var e;let r=(e=document.currentScript)!=null?e:document.querySelector('script[src*="vlaila"]');if(!r)return{};let t=r.dataset;return{experimentId:t.vlailaExperiment,labId:t.vlailaLab,discipline:t.vlailaDiscipline,institute:t.vlailaInstitute,api:t.vlailaApi}}function H(){var s,n;let r=ht(),t=lt(),e=r.experimentId||E("experiment-short-name")||t.expShortName||dt();if(!e)return{ref:null,apiOverride:r.api};let i=t.expName||E("learning-unit")||((n=(s=document.querySelector(".vlabs-page-content h2"))==null?void 0:s.textContent)==null?void 0:n.trim())||document.title;return{ref:{experimentId:e,labId:r.labId||ct(),origin:location.origin,discipline:r.discipline||t.discipline,institute:r.institute||t.college||E("developer-institute"),experimentTitle:i||void 0,task:b()},apiOverride:r.api}}function C(){let r=[],t=new Set,e=(i,s,n)=>{var a;if(n>3)return;let o=Array.from(i.querySelectorAll("iframe"));for(let h of o){let u=null;try{u=h.contentDocument}catch{continue}if(!u||t.has(u)||!u.body)continue;let c=h.getAttribute("src")||"";if(/googletagmanager|doubleclick|analytics/.test(c))continue;t.add(u);let m=((a=c.split("/").pop())==null?void 0:a.replace(".html",""))||`frame${r.length}`,v=n===0?"sim":`${s}:${m}`;r.push({name:v,doc:u}),e(u,v,n+1)}};return e(document,"sim",0),r}var pt=60;function k(r){if(r.id)return`${r.tagName.toLowerCase()}#${r.id}`;let t=(r.getAttribute("class")||"").split(/\s+/).filter(i=>i&&!/^(ng-|is-|active$|selected$)/.test(i)).slice(0,2).join(".");if(t)return`${r.tagName.toLowerCase()}.${t}`;let e=r.getAttribute("href");return e?`${r.tagName.toLowerCase()}[href="${e}"]`:r.tagName.toLowerCase()}function ut(r){let t=r;if(t.value&&(r.tagName==="INPUT"||r.tagName==="BUTTON"))return t.value.trim().slice(0,80);let e=r.getAttribute("aria-label")||r.getAttribute("title");if(e)return e.trim().slice(0,80);let s=(r.innerText||r.textContent||"").trim().replace(/\s+/g," ");return s?s.slice(0,80):void 0}var gt='a,button,input,select,textarea,label,img,canvas,[role="button"],md-select,md-option,md-slider';function mt(r){var e;let t=r;return!t||t.nodeType!==1||typeof t.closest!="function"?null:(e=t.closest(gt))!=null?e:t}var _=class{constructor(t){this.attached=new WeakSet;this.frameNames=new WeakMap;this.lastEventAt=Date.now();this.budget=[];this.inputTimers=new Map;this.emit=t}start(){this.attach(document,"host"),this.scanFrames(),this.mutationObserver=new MutationObserver(()=>{window.clearTimeout(this.rescanTimer),this.rescanTimer=window.setTimeout(()=>this.scanFrames(),400)}),this.mutationObserver.observe(document.documentElement,{childList:!0,subtree:!0}),window.setTimeout(()=>this.scanFrames(),1200),window.setTimeout(()=>this.scanFrames(),3e3)}stop(){var t;(t=this.mutationObserver)==null||t.disconnect()}idleSeconds(){return(Date.now()-this.lastEventAt)/1e3}scanFrames(){for(let{name:t,doc:e}of C())this.attached.has(e)||(this.frameNames.set(e,t),this.attach(e,t))}attach(t,e){if(this.attached.has(t))return;this.attached.add(t),this.frameNames.set(t,e);let i={capture:!0,passive:!0};t.addEventListener("click",s=>this.onClick(s,e),i),t.addEventListener("change",s=>this.onChange(s,e),i),t.addEventListener("input",s=>this.onInput(s,e),i),t.addEventListener("submit",s=>this.onSubmit(s,e),i)}allow(){let t=Date.now();return this.budget=this.budget.filter(e=>t-e<6e4),this.budget.length>=pt?!1:(this.budget.push(t),!0)}send(t){this.lastEventAt=Date.now(),this.allow()&&this.emit(t)}onClick(t,e){var o;let i=mt(t.target);if(!i)return;let s=(o=i.getAttribute)==null?void 0:o.call(i,"href");if(s&&/\.html?($|[?#])/.test(s)&&!s.startsWith("http")){let a=this.taskFromHref(s);if(a){this.send({action:"navigate",task:a,frame:e,selector:k(i)});return}}i.type!=="file"&&this.send({action:"click",task:b(),selector:k(i),frame:e,value:ut(i)})}onChange(t,e){var a,h;let i=t.target;if(!i||!i.tagName)return;if(i.type==="file"){this.send({action:"upload",task:b(),selector:k(i),frame:e,value:(h=(a=i.files)==null?void 0:a[0])==null?void 0:h.name});return}let s=i.tagName==="SELECT"?"select":"change",n=i.value,o=n!==""&&!Number.isNaN(Number(n))?Number(n):void 0;this.send({action:s,task:b(),selector:k(i),frame:e,value:n==null?void 0:n.slice(0,120),numericValue:o})}onInput(t,e){let i=t.target;if(!i||i.tagName!=="INPUT"&&i.tagName!=="TEXTAREA"||i.type==="file")return;let s=`${e}:${k(i)}`;window.clearTimeout(this.inputTimers.get(s)),this.inputTimers.set(s,window.setTimeout(()=>{let n=i.value,o=n!==""&&!Number.isNaN(Number(n))?Number(n):void 0;this.send({action:"input",task:b(),selector:k(i),frame:e,value:n==null?void 0:n.slice(0,120),numericValue:o})},600))}onSubmit(t,e){let i=t.target;this.send({action:"submit",task:b(),selector:i?k(i):void 0,frame:e})}taskFromHref(t){var s,n;let e=(n=(s=t.split("/").pop())==null?void 0:s.split(/[?#]/)[0])==null?void 0:n.replace(".html","").toLowerCase();return e?{index:"Aim",theory:"Theory",pretest:"Pretest",procedure:"Procedure",simulation:"Simulation",posttest:"Posttest",references:"References",feedback:"Feedback"}[e]:void 0}documentFor(t){if(!t||t==="host")return document;for(let{name:e,doc:i}of C())if(e===t)return i;if(t==="sim"){let e=C()[0];if(e)return e.doc}return document}};function Q(r,t,e){if(!r)return!0;if(!t&&!e)return!1;for(let i of r.split(",")){let s=i.trim();if(!s)continue;if(t&&(s===t||t.includes(s))||t&&s.startsWith("#")&&t.endsWith(s)||t&&s.startsWith(".")&&t.includes(s.slice(1)))return!0;let n=s.match(/^\w*\[([\w-]+)\*?=['"]?([^'"\]]+)['"]?\]$/);if(n&&t&&t.includes(n[2])||e&&s.toLowerCase()===e.trim().toLowerCase())return!0}return!1}function X(r,t){return!r||r===t?!0:r==="sim"&&t.startsWith("sim")}function vt(r,t,e){var i,s;for(let n of r.steps){if(e.completed.has(n.id))continue;let o=n.detect;if(!o||o.action!==t.action)continue;if(t.action==="navigate"){if(o.task&&o.task===t.task)return n;continue}if(!X(o.frame,t.frame)||!Q(o.selector,t.selector,t.value)||t.numericValue!=null&&(o.value_min!=null&&t.numericValue<o.value_min||o.value_max!=null&&t.numericValue>o.value_max)||o.value_pattern&&t.value&&!new RegExp(o.value_pattern).test(t.value)||o.value_in&&(!t.value||!o.value_in.includes(t.value)))continue;let a=(i=o.count)!=null?i:1;return a>1&&((s=e.counts[n.id])!=null?s:0)<a?null:n}return null}function ft(r,t,e){var s,n,o;let i=r.when;if(!i||Object.keys(i).length===0||i.action&&i.action!==t.action||i.on_task&&i.on_task!==((s=t.task)!=null?s:e.currentTask)||i.frame&&!X(i.frame,t.frame)||i.selector&&!Q(i.selector,t.selector,t.value)||(n=i.unless_completed)!=null&&n.some(a=>e.completed.has(a))||i.after_completed&&!i.after_completed.every(a=>e.completed.has(a)))return!1;if(i.value_out_of_range){if(t.numericValue==null)return!1;let{min:a,max:h}=i.value_out_of_range;if((a==null||t.numericValue>=a)&&(h==null||t.numericValue<=h))return!1}return!(i.value_equals!=null&&t.value!==i.value_equals||i.repeat_count&&((o=e.counts[`err:${r.id}`])!=null?o:0)<i.repeat_count||i.idle_seconds&&e.idleSeconds<i.idle_seconds)}function bt(r,t,e){let i=s=>{var n;return(n=s.find(o=>!t.completed.has(o.id)&&!o.optional&&o.requires.every(a=>t.completed.has(a))))!=null?n:null};if(e){let s=i(r.steps.filter(n=>n.task===e));if(s)return s}return i(r.steps)}function xt(r,t){if(t<=1)return{text:r.hints.nudge};if(t===2)return{text:r.hints.specific||r.hints.nudge};let e=r.hints.interactive;return e?{text:e.text,highlight:e.highlight,frame:e.frame}:{text:r.hints.specific||r.hints.nudge}}function P(r,t,e,i=.9){var a,h,u,c,m,v;let s=r.errors.filter(g=>!e.shownErrors.has(g.id)).sort((g,p)=>(g.severity==="fatal"?0:1)-(p.severity==="fatal"?0:1));for(let g of s){if(!ft(g,t,e))continue;let p=(a=g.confidence)!=null?a:1;if(p<i){let f=g.correction_step;return{kind:"HINT",title:"One thing to consider",message:g.message,stepId:f,errorId:g.id,hintLevel:((h=e.hintLevels[f!=null?f:""])!=null?h:0)+1,confidence:p}}return{kind:"WARN",severity:g.severity,title:g.severity==="fatal"?"This will affect your result":"Heads up",message:g.message,correctionStepId:g.correction_step,errorId:g.id,confidence:p}}let n=vt(r,t,e);if(n){let g=((u=n.detect)==null?void 0:u.action)==="navigate";return n.milestone&&!g&&!e.shownConcepts.has(n.id)?{kind:"CONCEPT",stepId:n.id,confidence:1}:{kind:"NO_ACTION",stepId:n.id,confidence:1}}let o=bt(r,e,(c=t.task)!=null?c:e.currentTask);if(o&&e.idleSeconds>=((m=o.stuck_after_seconds)!=null?m:45)){let g=((v=e.hintLevels[o.id])!=null?v:0)+1,p=xt(o,g);if(p.text)return{kind:"HINT",title:o.title,message:p.text,stepId:o.id,hintLevel:g,highlightSelector:p.highlight,highlightFrame:p.frame,confidence:.8}}return{kind:"NO_ACTION",confidence:1}}function J(r,t){let e=r.steps.filter(s=>!s.optional);if(!e.length)return 0;let i=e.filter(s=>t.completed.has(s.id)).length;return Math.round(i*100/e.length)}var Z=`
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
`;var x={light:"#F3C9A6",mid:"#E0A87E",dark:"#C4885F"},I={light:"#3A2E2A",dark:"#241B18"},D={ravi:{back:null,front:"M76 44c0-16 11-26 24-26s24 10 24 26c0 4-1 8-2 11 0-8-3-12-8-13-6-1-9 2-14 2s-8-3-14-2c-5 1-8 5-8 13-1-3-2-7-2-11z"},asha:{back:"M71 48c0-19 13-31 29-31s29 12 29 31c0 12-2 22-3 32-1 12-2 22-5 30-3-9-5-19-6-30-1-9-1-19-1-27h-28c0 8 0 18-1 27-1 11-3 21-6 30-3-8-4-18-5-30-1-10-3-20-3-32z",front:"M75 46c0-17 11-28 25-28s25 11 25 28c0 4-1 8-2 12-1-9-4-14-10-16-5-2-9 1-13 1s-8-3-13-1c-6 2-9 7-10 16-1-4-2-8-2-12z"}},z=r=>`
<svg class="vl-figure" viewBox="0 0 200 330" width="128" height="211"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <!-- Key light from the upper left; each gradient is the same light,
         wrapped around a different volume. -->
    <linearGradient id="vl-coat" x1="0.15" y1="0" x2="0.95" y2="1">
      <stop offset="0%"   stop-color="#FFFFFF"/>
      <stop offset="52%"  stop-color="#EFF3F7"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="vl-coat-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#94A3B8" stop-opacity="0.34"/>
      <stop offset="45%"  stop-color="#94A3B8" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#94A3B8" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="vl-shirt" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#4C86C9"/>
      <stop offset="100%" stop-color="#2C5C96"/>
    </linearGradient>
    <linearGradient id="vl-trousers" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0%"   stop-color="#4A5568"/>
      <stop offset="60%"  stop-color="#3A4457"/>
      <stop offset="100%" stop-color="#2A3140"/>
    </linearGradient>
    <radialGradient id="vl-face" cx="0.38" cy="0.3" r="0.85">
      <stop offset="0%"   stop-color="${x.light}"/>
      <stop offset="62%"  stop-color="${x.mid}"/>
      <stop offset="100%" stop-color="${x.dark}"/>
    </radialGradient>
    <linearGradient id="vl-hair" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0%"   stop-color="${I.light}"/>
      <stop offset="100%" stop-color="${I.dark}"/>
    </linearGradient>
    <radialGradient id="vl-ground" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"   stop-color="#0F172A" stop-opacity="0.30"/>
      <stop offset="65%"  stop-color="#0F172A" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vl-goggle" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#BFDBFE" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#60A5FA" stop-opacity="0.75"/>
    </linearGradient>

    <!-- The contact shadow is blurred; everything else stays crisp so the
         figure keeps its vector edge at any zoom. -->
    <filter id="vl-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
  </defs>

  <!-- Ground contact shadow. Anchors the figure to the page instead of
       leaving it floating. -->
  <ellipse class="vl-ground" cx="100" cy="314" rx="54" ry="10" fill="url(#vl-ground)"/>

  <g class="vl-body">
    <!-- ---------------------------------------------------------- legs -->
    <g class="vl-legs">
      <path d="M84 214h13l-2 74c0 4-3 6-6 6s-6-2-6-6z" fill="url(#vl-trousers)"/>
      <path d="M103 214h13l1 74c0 4-3 6-6 6s-6-2-6-6z" fill="url(#vl-trousers)"/>
      <!-- Shoes catch a little light on top and go dark underneath. -->
      <path d="M83 294h14c1 5 4 7 4 10 0 2-2 3-5 3H83c-2 0-3-1-3-3z" fill="#1F2937"/>
      <path d="M103 294h14c0 2 3 5 3 10 0 2-1 3-3 3h-14c-3 0-5-1-5-3 0-3 3-5 5-10z" fill="#1F2937"/>
      <path d="M83 294h14v3H83zM103 294h14v3h-14z" fill="#374151"/>
    </g>

    <!-- --------------------------------------------------------- torso -->
    <g class="vl-torso">
      <!-- Shirt behind the open coat -->
      <path d="M84 96h32v104H84z" fill="url(#vl-shirt)"/>
      <path d="M100 96l-9 16 9 10 9-10z" fill="#1E4470" opacity="0.5"/>

      <!-- Lab coat -->
      <path class="vl-coat"
            d="M78 100c-8 3-14 10-15 19l-6 62c-1 6 2 10 7 11l6 1 4 25c0 3 2 5 5 5h18V104c-6-3-12-4-19-4z"
            fill="url(#vl-coat)"/>
      <path class="vl-coat"
            d="M122 100c8 3 14 10 15 19l6 62c1 6-2 10-7 11l-6 1-4 25c0 3-2 5-5 5h-18V104c6-3 12-4 19-4z"
            fill="url(#vl-coat)"/>
      <!-- Shadow wrapping the left side of the coat -->
      <path d="M78 100c-8 3-14 10-15 19l-6 62c-1 6 2 10 7 11l6 1 4 25c0 3 2 5 5 5h9V100z"
            fill="url(#vl-coat-shade)"/>
      <!-- Lapels -->
      <path d="M97 102l-13 8 6 96h7z" fill="#E2E8F0"/>
      <path d="M103 102l13 8-6 96h-7z" fill="#F1F5F9"/>
      <!-- Pocket and a pen, because a lab coat without one looks unworn -->
      <rect x="118" y="168" width="18" height="22" rx="3" fill="#E2E8F0"/>
      <rect x="124" y="163" width="3" height="14" rx="1.5" fill="#EF4444"/>
      <!-- ID badge -->
      <rect x="66" y="150" width="16" height="21" rx="3" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.2"/>
      <rect x="69" y="155" width="10" height="3" rx="1.5" fill="#3B82F6"/>
      <rect x="69" y="161" width="10" height="2" rx="1" fill="#CBD5E1"/>
      <rect x="69" y="165" width="7"  height="2" rx="1" fill="#CBD5E1"/>
    </g>

    <!-- ---------------------------------------------------------- arms -->
    <!-- Each arm rotates about its own shoulder, so poses are joint
         rotations rather than alternative artwork. -->
    <g class="vl-arm vl-arm-left">
      <path d="M78 108c-7 2-11 8-12 15l-7 48c-1 5 2 9 7 10s10-2 11-7l8-44z"
            fill="url(#vl-coat)"/>
      <path d="M78 108c-7 2-11 8-12 15l-7 48 7 1 9-49z" fill="#CBD5E1" opacity="0.55"/>
      <circle class="vl-hand" cx="65" cy="180" r="9.5" fill="url(#vl-face)"/>
      <path d="M56 170h18v6H56z" fill="#E2E8F0" opacity="0.9"/>
    </g>

    <g class="vl-arm vl-arm-right">
      <path d="M122 108c7 2 11 8 12 15l7 48c1 5-2 9-7 10s-10-2-11-7l-8-44z"
            fill="url(#vl-coat)"/>
      <circle class="vl-hand" cx="135" cy="180" r="9.5" fill="url(#vl-face)"/>
      <path d="M126 170h18v6h-18z" fill="#F1F5F9" opacity="0.9"/>
      <!-- A clipboard, shown only in the explaining pose -->
      <g class="vl-clipboard" opacity="0">
        <rect x="128" y="158" width="30" height="38" rx="3" fill="#8B5E3C"/>
        <rect x="131" y="163" width="24" height="30" rx="2" fill="#FDFDFD"/>
        <rect x="136" y="156" width="14" height="6" rx="2" fill="#9CA3AF"/>
        <rect x="134" y="169" width="18" height="2" rx="1" fill="#CBD5E1"/>
        <rect x="134" y="175" width="18" height="2" rx="1" fill="#CBD5E1"/>
        <rect x="134" y="181" width="12" height="2" rx="1" fill="#CBD5E1"/>
      </g>
    </g>

    <!-- ---------------------------------------------------------- head -->
    <g class="vl-head">
      ${D[r].back?`<path d="${D[r].back}" fill="url(#vl-hair)"/>`:""}
      <!-- Neck, with the shadow the jaw casts onto it -->
      <path d="M92 78h16v22H92z" fill="${x.mid}"/>
      <path d="M92 78h16v9c-5 3-11 3-16 0z" fill="${x.dark}" opacity="0.55"/>

      <!-- Ears -->
      <ellipse cx="72" cy="52" rx="5" ry="7" fill="${x.mid}"/>
      <ellipse cx="128" cy="52" rx="5" ry="7" fill="${x.mid}"/>

      <!-- Face -->
      <path d="M76 40c0-13 10-23 24-23s24 10 24 23v14c0 15-11 27-24 27S76 69 76 54z"
            fill="url(#vl-face)"/>
      <!-- Rim light down the right cheek: the single strongest 3D cue. -->
      <path d="M118 30c4 4 6 10 6 16v8c0 12-7 22-17 26 8-6 13-16 13-27z"
            fill="#FFE3C4" opacity="0.5"/>

      <!-- Brows -->
      <g class="vl-brows">
        <rect class="vl-brow-l" x="83"  y="43" width="14" height="3" rx="1.5" fill="${I.dark}"/>
        <rect class="vl-brow-r" x="103" y="43" width="14" height="3" rx="1.5" fill="${I.dark}"/>
      </g>

      <!-- Eyes. The lid is a rect that drops to blink. -->
      <g class="vl-eyes">
        <ellipse cx="90"  cy="53" rx="5.4" ry="5.8" fill="#FFFFFF"/>
        <ellipse cx="110" cy="53" rx="5.4" ry="5.8" fill="#FFFFFF"/>
        <circle class="vl-pupil" cx="90"  cy="54" r="3.1" fill="#2A1F1A"/>
        <circle class="vl-pupil" cx="110" cy="54" r="3.1" fill="#2A1F1A"/>
        <circle cx="91.4" cy="52.4" r="1.1" fill="#FFFFFF" opacity="0.9"/>
        <circle cx="111.4" cy="52.4" r="1.1" fill="#FFFFFF" opacity="0.9"/>
        <rect class="vl-lid" x="84"  y="46" width="12" height="0" fill="${x.mid}"/>
        <rect class="vl-lid" x="104" y="46" width="12" height="0" fill="${x.mid}"/>
      </g>

      <!-- Nose -->
      <path d="M100 56c-2 5-4 7-2 8 1 1 3 1 4 0" fill="none"
            stroke="${x.dark}" stroke-width="1.6" stroke-linecap="round"/>

      <!-- Mouth. One path, reshaped per expression. -->
      <path class="vl-mouth" d="M93 69q7 5 14 0" fill="none"
            stroke="#8B4A38" stroke-width="2.2" stroke-linecap="round"/>

      <!-- Hairline, over the face -->
      <path d="${D[r].front}" fill="url(#vl-hair)"/>

      <!-- Safety goggles pushed up on the forehead: reads instantly as
           "lab", and gives the silhouette something to hold. -->
      <g class="vl-goggles">
        <rect x="78" y="26" width="44" height="11" rx="5" fill="url(#vl-goggle)" opacity="0.92"/>
        <rect x="78" y="26" width="44" height="11" rx="5" fill="none" stroke="#3B82F6" stroke-width="1.6" opacity="0.7"/>
        <path d="M74 31h6M120 31h6" stroke="#475569" stroke-width="2.6" stroke-linecap="round"/>
      </g>
    </g>
  </g>
</svg>`,tt={idle:{armL:0,armR:0,headTilt:0,headNod:0,mouth:"M93 69q7 4 14 0",browY:0,clipboard:0},thinking:{armL:4,armR:-20,headTilt:-8,headNod:2,mouth:"M94 70q6 2 12 -1",browY:-2,clipboard:0},talking:{armL:-12,armR:-34,headTilt:2,headNod:0,mouth:"M92 68q8 7 16 0",browY:0,clipboard:1},pointing:{armL:98,armR:-6,headTilt:-7,headNod:1,mouth:"M93 69q7 5 14 0",browY:-1,clipboard:0},pleased:{armL:-10,armR:-18,headTilt:-3,headNod:-1,mouth:"M90 67q10 9 20 0",browY:-2.5,clipboard:0},concerned:{armL:8,armR:-8,headTilt:-4,headNod:3,mouth:"M93 71h14",browY:2.5,clipboard:0}};var M={nameRavi:"Ravi",nameAsha:"Asha",roleLabel:"Lab assistant",chooseAssistant:"Choose your assistant",tapToOpen:"Click to read more",orbLabel:"Talk to your lab assistant",subtitle:"Watching this experiment",close:"Close",optOut:"Turn off for this session",tabAssist:"Assist",tabChat:"Ask",tabSummary:"Summary",watching:"On track",idleTitle:"You're doing fine",idleBody:"I'm following along quietly and will speak up if a step looks out of order. Ask me anything about this experiment whenever you like.",askMe:"Ask a question",chipFatal:"Affects your result",chipRecoverable:"Worth fixing",chipHint:"Hint",chipConcept:"Why this happened",gotIt:"Got it",reportWrong:"This was wrong",reportThanks:"Thanks \u2014 flagged for review.",chatGreeting:"Ask me about this experiment \u2014 the procedure, a control in the simulator, or the theory behind it.",askPlaceholder:"Ask about this experiment\u2026",suggestions:"What is this step for?|Why did my result change?|Explain the theory simply",send:"Send",voice:"Speak your question",source:"Source",summaryPending:"Your summary appears when you finish the experiment.",complete:"Experiment complete",precision:"Precision",time:"Time on task",steps:"Steps",hints:"Hints used",revisit:"Worth revisiting",takeQuiz:"Take the 3-question check",quiz:"Quick check",quizTitle:"Three questions on what you just did",submit:"Submit",back:"Back to summary",score:"Score"},kt={...M,nameRavi:"\u0930\u0935\u093F",nameAsha:"\u0906\u0936\u093E",roleLabel:"\u092A\u094D\u0930\u092F\u094B\u0917\u0936\u093E\u0932\u093E \u0938\u0939\u093E\u092F\u0915",chooseAssistant:"\u0905\u092A\u0928\u093E \u0938\u0939\u093E\u092F\u0915 \u091A\u0941\u0928\u0947\u0902",tapToOpen:"\u0914\u0930 \u092A\u0922\u093C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902",orbLabel:"\u0905\u092A\u0928\u0947 \u092A\u094D\u0930\u092F\u094B\u0917\u0936\u093E\u0932\u093E \u0938\u0939\u093E\u092F\u0915 \u0938\u0947 \u092C\u093E\u0924 \u0915\u0930\u0947\u0902",subtitle:"\u0907\u0938 \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u094B \u0926\u0947\u0916 \u0930\u0939\u093E \u0939\u0942\u0901",close:"\u092C\u0902\u0926 \u0915\u0930\u0947\u0902",optOut:"\u0907\u0938 \u0938\u0924\u094D\u0930 \u0915\u0947 \u0932\u093F\u090F \u092C\u0902\u0926 \u0915\u0930\u0947\u0902",tabAssist:"\u0938\u0939\u093E\u092F\u0924\u093E",tabChat:"\u092A\u0942\u091B\u0947\u0902",tabSummary:"\u0938\u093E\u0930\u093E\u0902\u0936",watching:"\u0938\u092C \u0920\u0940\u0915 \u0939\u0948",idleTitle:"\u0906\u092A \u0938\u0939\u0940 \u091C\u093E \u0930\u0939\u0947 \u0939\u0948\u0902",idleBody:"\u092E\u0948\u0902 \u091A\u0941\u092A\u091A\u093E\u092A \u0938\u093E\u0925 \u091A\u0932 \u0930\u0939\u093E \u0939\u0942\u0901 \u0914\u0930 \u0915\u094B\u0908 \u091A\u0930\u0923 \u0917\u0932\u0924 \u0915\u094D\u0930\u092E \u092E\u0947\u0902 \u0932\u0917\u0947 \u0924\u094B \u092C\u0924\u093E \u0926\u0942\u0901\u0917\u093E\u0964 \u0907\u0938 \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u0915\u092D\u0940 \u092D\u0940 \u092A\u0942\u091B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",askMe:"\u092A\u094D\u0930\u0936\u094D\u0928 \u092A\u0942\u091B\u0947\u0902",chipFatal:"\u092A\u0930\u093F\u0923\u093E\u092E \u092A\u094D\u0930\u092D\u093E\u0935\u093F\u0924 \u0939\u094B\u0917\u093E",chipRecoverable:"\u0938\u0941\u0927\u093E\u0930\u0928\u093E \u092C\u0947\u0939\u0924\u0930 \u0939\u0948",chipHint:"\u0938\u0902\u0915\u0947\u0924",chipConcept:"\u0910\u0938\u093E \u0915\u094D\u092F\u094B\u0902 \u0939\u0941\u0906",gotIt:"\u0938\u092E\u091D \u0917\u092F\u093E",reportWrong:"\u092F\u0939 \u0917\u0932\u0924 \u0925\u093E",reportThanks:"\u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u2014 \u0938\u092E\u0940\u0915\u094D\u0937\u093E \u0915\u0947 \u0932\u093F\u090F \u092D\u0947\u091C\u093E \u0917\u092F\u093E\u0964",chatGreeting:"\u0907\u0938 \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u092A\u0942\u091B\u0947\u0902 \u2014 \u092A\u094D\u0930\u0915\u094D\u0930\u093F\u092F\u093E, \u0938\u093F\u092E\u094D\u092F\u0941\u0932\u0947\u091F\u0930 \u0915\u093E \u0915\u094B\u0908 \u0928\u093F\u092F\u0902\u0924\u094D\u0930\u0923, \u092F\u093E \u0938\u093F\u0926\u094D\u0927\u093E\u0902\u0924\u0964",askPlaceholder:"\u0907\u0938 \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u092A\u0942\u091B\u0947\u0902\u2026",suggestions:"\u092F\u0939 \u091A\u0930\u0923 \u0915\u093F\u0938\u0932\u093F\u090F \u0939\u0948?|\u092E\u0947\u0930\u093E \u092A\u0930\u093F\u0923\u093E\u092E \u0915\u094D\u092F\u094B\u0902 \u092C\u0926\u0932\u093E?|\u0938\u093F\u0926\u094D\u0927\u093E\u0902\u0924 \u0938\u0930\u0932 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u092C\u0924\u093E\u0907\u090F",send:"\u092D\u0947\u091C\u0947\u0902",voice:"\u092C\u094B\u0932\u0915\u0930 \u092A\u0942\u091B\u0947\u0902",source:"\u0938\u094D\u0930\u094B\u0924",complete:"\u092A\u094D\u0930\u092F\u094B\u0917 \u092A\u0942\u0930\u094D\u0923",precision:"\u0936\u0941\u0926\u094D\u0927\u0924\u093E",time:"\u0932\u0917\u093E \u0938\u092E\u092F",steps:"\u091A\u0930\u0923",hints:"\u0938\u0902\u0915\u0947\u0924 \u0932\u093F\u090F",revisit:"\u092B\u093F\u0930 \u0938\u0947 \u0926\u0947\u0916\u0928\u0947 \u092F\u094B\u0917\u094D\u092F",takeQuiz:"3 \u092A\u094D\u0930\u0936\u094D\u0928\u094B\u0902 \u0915\u0940 \u091C\u093E\u0901\u091A \u0932\u0947\u0902",quiz:"\u0924\u094D\u0935\u0930\u093F\u0924 \u091C\u093E\u0901\u091A",quizTitle:"\u0905\u092D\u0940 \u0915\u093F\u090F \u0917\u090F \u0915\u093E\u0930\u094D\u092F \u092A\u0930 \u0924\u0940\u0928 \u092A\u094D\u0930\u0936\u094D\u0928",submit:"\u091C\u092E\u093E \u0915\u0930\u0947\u0902",back:"\u0938\u093E\u0930\u093E\u0902\u0936 \u092A\u0930 \u0932\u094C\u091F\u0947\u0902",score:"\u0905\u0902\u0915"},wt={en:M,hi:kt};function d(r,t){var i,s,n;return(n=(s=((i=wt[r.slice(0,2)])!=null?i:M)[t])!=null?s:M[t])!=null?n:t}function B(){var i,s;let r=(i=document.currentScript)!=null?i:document.querySelector('script[src*="vlaila"]'),t=(s=r==null?void 0:r.dataset)==null?void 0:s.vlailaLocale;if(t)return t;let e=document.documentElement.getAttribute("lang");return e&&e!=="en"?e:(navigator.language||"en").slice(0,2)}function w(r){return r.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[\s(])_([^_]+)_/g,"$1<em>$2</em>").replace(/\n/g,"<br>")}function yt(){var e,i,s;let r=n=>{if(!n)return null;let o=getComputedStyle(n).backgroundColor;return o&&o!=="transparent"&&!/rgba\(0,\s*0,\s*0,\s*0\)/.test(o)?o:null},t=(e=r(document.body))!=null?e:r(document.documentElement);if(t){let n=(i=t.match(/\d+(\.\d+)?/g))==null?void 0:i.slice(0,3).map(Number);if(n&&n.length===3)return(.2126*n[0]+.7152*n[1]+.0722*n[2])/255<.4?"dark":"light"}return(s=window.matchMedia)!=null&&s.call(window,"(prefers-color-scheme: dark)").matches?"dark":"light"}function l(r,t={},e){let i=document.createElement(r);for(let[s,n]of Object.entries(t))i.setAttribute(s,n);return e!=null&&(i.innerHTML=e),i}var y=class{constructor(t,e,i="ravi"){this.handlers=t;this.locale=e;this.avatar=i;this.tab="assist";this.current=null;this.summary=null;this.messages=[];this.streaming=null;this.ring=null;this.open=!1;this.unread=0;this.coachRead=null;this.coachMetrics=null;this.navigator=null;this.host=l("div",{id:"vlaila-root","data-theme":yt()}),this.host.style.cssText="all:initial;position:static",this.root=this.host.attachShadow({mode:"open"});let s=document.createElement("style");s.textContent=Z,this.root.appendChild(s),this.build(),document.body.appendChild(this.host)}build(){let t=l("div",{class:"root"});this.live=l("div",{class:"sr-only",role:"status","aria-live":"polite"}),t.appendChild(this.live),this.stage=l("button",{class:"stage",type:"button","data-state":"idle","data-pose":"idle","aria-label":d(this.locale,"orbLabel"),"aria-expanded":"false"}),this.stage.innerHTML=z(this.avatar),this.figure=this.stage.querySelector("svg"),this.badge=l("span",{class:"badge",hidden:""},""),this.stage.appendChild(this.badge),this.stage.addEventListener("click",()=>this.toggle()),t.appendChild(this.stage),this.setPose("idle"),this.thought=l("button",{class:"thought",type:"button",hidden:"","data-kind":"hint"}),this.thought.addEventListener("click",()=>{this.hideThought(),this.setOpen(!0),this.setTab("assist")}),t.appendChild(this.thought),this.panel=l("div",{class:"panel",hidden:"","data-mode":"speech",role:"dialog","aria-label":"VLAILA lab assistant"});let e=l("div",{class:"thought-trail","aria-hidden":"true"});e.append(l("i"),l("i"),l("i")),this.panel.appendChild(e);let i=l("div",{class:"panel-head"}),s=d(this.locale,this.avatar==="asha"?"nameAsha":"nameRavi");i.appendChild(l("span",{class:"mark","aria-hidden":"true"},s.charAt(0)));let n=l("div");n.appendChild(l("div",{class:"title"},`${s} \xB7 ${d(this.locale,"roleLabel")}`)),this.subtitle=l("div",{class:"sub"},d(this.locale,"subtitle")),n.appendChild(this.subtitle),i.appendChild(n),i.appendChild(l("div",{class:"spacer"}));let o=l("div",{class:"who",role:"group","aria-label":d(this.locale,"chooseAssistant")});for(let c of["ravi","asha"]){let m=l("button",{type:"button","aria-pressed":String(c===this.avatar)},d(this.locale,c==="asha"?"nameAsha":"nameRavi"));m.addEventListener("click",()=>this.setAvatar(c)),o.appendChild(m)}i.appendChild(o);let a=l("button",{class:"icon-btn",type:"button",title:d(this.locale,"optOut"),"aria-label":d(this.locale,"optOut")},"\u29B8");a.addEventListener("click",()=>{this.handlers.onOptOut(),this.destroy()}),i.appendChild(a);let h=l("button",{class:"icon-btn",type:"button","aria-label":d(this.locale,"close")},"\u2715");h.addEventListener("click",()=>this.setOpen(!1)),i.appendChild(h),this.panel.appendChild(i);let u=l("div",{class:"progress",role:"progressbar","aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":"0"});this.progressBar=l("i"),this.progressBar.style.width="0%",u.appendChild(this.progressBar),this.panel.appendChild(u),this.tabs=l("div",{class:"tabs",role:"tablist"});for(let[c,m]of[["assist",d(this.locale,"tabAssist")],["chat",d(this.locale,"tabChat")],["summary",d(this.locale,"tabSummary")]]){let v=l("button",{type:"button",role:"tab","data-tab":c,"aria-selected":String(c==="assist")},m);v.addEventListener("click",()=>this.setTab(c)),this.tabs.appendChild(v)}this.panel.appendChild(this.tabs),this.body=l("div",{class:"body"}),this.panel.appendChild(this.body),t.appendChild(this.panel),this.root.appendChild(t),document.addEventListener("keydown",c=>{c.key==="Escape"&&this.open&&(this.setOpen(!1),this.stage.focus())}),this.renderAssist()}destroy(){this.clearHighlight(),this.host.remove()}static storedAvatar(){try{let t=localStorage.getItem("vlaila:avatar");return t==="asha"||t==="ravi"?t:null}catch{return null}}setOrbState(t){this.stage.setAttribute("data-state",t);let e=t==="warn"?"concerned":t==="hint"?"thinking":t==="ok"?"pleased":"idle";this.setPose(e),t!=="idle"&&(this.stage.classList.remove("is-alerting"),this.stage.offsetWidth,this.stage.classList.add("is-alerting"))}setPose(t){var n;let e=tt[t];this.stage.setAttribute("data-pose",t);let i=(o,a)=>{let h=this.figure.querySelector(o);h&&(h.style.transform=a)};i(".vl-arm-left",`rotate(${e.armL}deg)`),i(".vl-arm-right",`rotate(${e.armR}deg)`),i(".vl-head",`rotate(${e.headTilt}deg) translateY(${e.headNod}px)`),i(".vl-brows",`translateY(${e.browY}px)`),(n=this.figure.querySelector(".vl-mouth"))==null||n.setAttribute("d",e.mouth);let s=this.figure.querySelector(".vl-clipboard");s&&(s.style.opacity=String(e.clipboard))}setAvatar(t){if(t===this.avatar)return;this.avatar=t;try{localStorage.setItem("vlaila:avatar",t)}catch{}let e=this.stage.getAttribute("data-pose")||"idle";this.stage.innerHTML=z(t),this.figure=this.stage.querySelector("svg"),this.stage.appendChild(this.badge),this.setPose(e);let i=d(this.locale,t==="asha"?"nameAsha":"nameRavi"),s=this.panel.querySelector(".mark");s&&(s.textContent=i.charAt(0));let n=this.panel.querySelector(".panel-head .title");n&&(n.textContent=`${i} \xB7 ${d(this.locale,"roleLabel")}`);for(let o of Array.from(this.panel.querySelectorAll(".who button")))o.setAttribute("aria-pressed",String(o.textContent===i))}showThought(t){var n,o,a;let e=t.kind.toLowerCase(),i=t.kind==="WARN"?t.severity==="fatal"?d(this.locale,"chipFatal"):d(this.locale,"chipRecoverable"):t.kind==="HINT"?d(this.locale,"chipHint"):d(this.locale,"chipConcept");this.thought.setAttribute("data-kind",e),this.thought.replaceChildren(),this.thought.appendChild(l("span",{class:"t-kind"},i)),this.thought.appendChild(l("span",{class:"t-text"},w((o=(n=t.message)!=null?n:t.title)!=null?o:""))),this.thought.appendChild(l("span",{class:"t-more"},d(this.locale,"tapToOpen")));let s=l("span",{class:"t-dots","aria-hidden":"true"});s.append(l("i"),l("i"),l("i")),this.thought.appendChild(s),this.thought.setAttribute("aria-label",`${i}. ${(a=t.message)!=null?a:""}. ${d(this.locale,"tapToOpen")}`),this.thought.removeAttribute("hidden")}hideThought(){this.thought.setAttribute("hidden","")}setTalking(t){t?this.setPose("talking"):this.stage.getAttribute("data-pose")==="talking"&&this.setPose(this.current?"thinking":"idle")}setProgress(t){var e;this.progressBar.style.width=`${Math.max(0,Math.min(100,t))}%`,(e=this.progressBar.parentElement)==null||e.setAttribute("aria-valuenow",String(t))}setSubtitle(t){this.subtitle.textContent=t}setCoach(t,e){this.coachRead=t,this.coachMetrics=e!=null?e:null,this.current||this.setOrbState(t.tone==="stuck"?"warn":t.tone==="watch"?"hint":"idle"),this.open&&this.tab==="assist"&&this.renderAssist()}setNavigatorMode(t){this.navigator=t,this.open&&this.tab==="assist"&&this.renderAssist()}toggle(){this.setOpen(!this.open)}setOpen(t){this.open=t,this.stage.setAttribute("aria-expanded",String(t)),t?(this.unread=0,this.badge.setAttribute("hidden",""),this.hideThought(),this.panel.removeAttribute("hidden"),requestAnimationFrame(()=>this.panel.classList.add("is-open")),this.handlers.onOpen()):(this.panel.classList.remove("is-open"),window.setTimeout(()=>this.panel.setAttribute("hidden",""),180),this.current&&this.showThought(this.current),this.clearHighlight(),this.handlers.onClose())}setTab(t){this.tab=t,t!=="assist"&&this.panel.setAttribute("data-mode","speech");for(let e of Array.from(this.tabs.querySelectorAll("button")))e.setAttribute("aria-selected",String(e.getAttribute("data-tab")===t));t==="assist"&&this.renderAssist(),t==="chat"&&this.renderChat(),t==="summary"&&this.renderSummary()}showIntervention(t){var i,s;this.current=t;let e=t.kind==="WARN"?"warn":t.kind==="CONCEPT"?"ok":"hint";this.setOrbState(e),this.panel.setAttribute("data-mode",t.kind==="WARN"?"speech":"thought"),this.live.textContent=`${(i=t.title)!=null?i:""}. ${(s=t.message)!=null?s:""}`,this.open?(this.hideThought(),this.setTab("assist")):(this.showThought(t),this.unread+=1,this.badge.textContent=String(this.unread),this.badge.removeAttribute("hidden")),window.clearTimeout(this.autoRetract),t.kind!=="WARN"&&(this.autoRetract=window.setTimeout(()=>this.dismissCurrent("auto_resolved"),3e4))}resolveIfCorrecting(t){var s;let e=this.current;!e||((s=e.correctionStepId)!=null?s:e.stepId)!==t||(e.interventionId&&this.handlers.onAction("auto_resolved",e),this.current=null,this.setOrbState("ok"),this.clearHighlight(),this.hideThought(),this.open&&this.tab==="assist"&&this.renderAssist(),window.setTimeout(()=>{this.current||this.setOrbState("idle")},2600))}dismissCurrent(t="dismissed"){var e;(e=this.current)!=null&&e.interventionId&&t!=="kept"&&this.handlers.onAction(t,this.current),this.current=null,this.setOrbState("idle"),this.clearHighlight(),this.hideThought(),this.tab==="assist"&&this.renderAssist()}renderAssist(){var a,h,u,c,m,v,g;this.body.replaceChildren();let t=l("div",{class:"card"});if(!this.current){let p=this.coachRead,f=this.navigator,S=f?"Guide":(p==null?void 0:p.tone)==="stuck"?"Heads up":(p==null?void 0:p.tone)==="watch"?"Keeping an eye":d(this.locale,"watching");if(t.appendChild(l("span",{class:"chip","data-kind":(p==null?void 0:p.tone)==="stuck"?"warn":"idle"},S)),t.appendChild(l("h3",{},f?f.title:(a=p==null?void 0:p.headline)!=null?a:d(this.locale,"idleTitle"))),t.appendChild(l("p",{},f?f.message:(h=p==null?void 0:p.detail)!=null?h:d(this.locale,"idleBody"))),!f&&this.coachMetrics){let A=this.coachMetrics,U=l("div",{class:"stats"}),F=(ot,at)=>{let $=l("div",{class:"stat"});$.appendChild(l("span",{class:"stat-v"},at)),$.appendChild(l("span",{class:"stat-l"},ot)),U.appendChild($)};F("actions",String((u=A.clicks)!=null?u:0)),F("focused",`${Math.max(1,Math.round(((c=A.activeSeconds)!=null?c:0)/60))}m`),F("retried",String(((m=A.rageClicks)!=null?m:0)+((v=A.corrections)!=null?v:0))),t.appendChild(U)}let K=l("div",{class:"actions"}),j=l("button",{class:"btn primary",type:"button"},f?"Find something":d(this.locale,"askMe"));j.addEventListener("click",()=>this.setTab("chat")),K.appendChild(j),t.appendChild(K),this.body.appendChild(t);return}let e=this.current.kind.toLowerCase(),i=this.current.kind==="WARN"?this.current.severity==="fatal"?d(this.locale,"chipFatal"):d(this.locale,"chipRecoverable"):this.current.kind==="HINT"?d(this.locale,"chipHint"):d(this.locale,"chipConcept");t.appendChild(l("span",{class:"chip","data-kind":e},i)),this.current.title&&t.appendChild(l("h3",{},w(this.current.title))),this.current.message&&t.appendChild(l("p",{},w(this.current.message)));let s=l("div",{class:"actions"});for(let p of(g=this.current.actions)!=null?g:[{label:d(this.locale,"gotIt"),kind:"acknowledge"}]){let f=l("button",{class:p.kind==="show_me"?"btn primary":"btn",type:"button"},p.label);f.addEventListener("click",()=>{let S=this.current;S&&(p.kind==="explain"&&(S.concept&&this.pushAgentMessage(S.concept),this.setTab("chat")),this.handlers.onAction(p.kind,S),(p.kind==="acknowledge"||p.kind==="dismiss")&&(this.current=null,this.setOrbState("idle"),this.clearHighlight(),this.renderAssist()))}),s.appendChild(f)}t.appendChild(s);let n=l("div",{class:"meta"});n.appendChild(l("span",{},this.current.tier?`via ${this.current.tier}`:"")),n.appendChild(l("span",{},"\xB7"));let o=l("button",{type:"button"},d(this.locale,"reportWrong"));o.addEventListener("click",()=>{let p=this.current;p&&(this.handlers.onReport(p),this.current=null,this.setOrbState("idle"),this.clearHighlight(),this.renderAssist(),this.live.textContent=d(this.locale,"reportThanks"))}),n.appendChild(o),t.appendChild(n),this.body.appendChild(t)}renderChat(){var u;this.body.replaceChildren();let t=l("div",{class:"thread"});this.messages.length||this.messages.push({role:"agent",text:this.navigator?"Tell me a subject, a lab or an experiment and I will take you there.":d(this.locale,"chatGreeting")});for(let c of this.messages)t.appendChild(this.messageNode(c));if(this.body.appendChild(t),this.messages.length<=1){let c=l("div",{class:"suggestions"}),m=this.navigator?"Show me the labs here|Where do I start?|Find an experiment":d(this.locale,"suggestions");for(let v of m.split("|")){let g=l("button",{type:"button"},v);g.addEventListener("click",()=>this.submit(v)),c.appendChild(g)}this.body.appendChild(c)}let e=l("div",{class:"composer"}),i=l("input",{type:"text",placeholder:d(this.locale,"askPlaceholder"),"aria-label":d(this.locale,"askPlaceholder")}),s=l("button",{class:"send mic",type:"button","aria-label":d(this.locale,"voice"),"data-active":"false"},"\u{1F399}"),n=this.speechRecognition();n||(s.style.display="none"),s.addEventListener("click",()=>{if(n){if(s.getAttribute("data-active")==="true"){n.stop();return}s.setAttribute("data-active","true"),n.lang=this.locale==="hi"?"hi-IN":"en-IN",n.onresult=c=>{i.value=c.results[0][0].transcript},n.onend=()=>s.setAttribute("data-active","false"),n.start()}});let o=l("button",{class:"send",type:"button","aria-label":d(this.locale,"send")},"\u27A4"),a=()=>{let c=i.value.trim();c&&(i.value="",this.submit(c))};o.addEventListener("click",a),i.addEventListener("keydown",c=>{c.key==="Enter"&&a(),c.stopPropagation()}),e.append(s,i,o),(u=this.body.parentElement)==null||u.insertBefore(e,null),this.panel.appendChild(e);let h=this.panel.querySelectorAll(".composer");h.forEach((c,m)=>{m<h.length-1&&c.remove()}),window.setTimeout(()=>i.focus(),60),this.scrollToEnd()}messageNode(t){var i;let e=l("div",{class:`msg ${t.role}`},w(t.text));return(i=t.citations)!=null&&i.length&&e.appendChild(l("span",{class:"cite"},`${d(this.locale,"source")}: ${t.citations.join(" \xB7 ")}`)),e}submit(t){var i;this.messages.push({role:"user",text:t}),this.tab!=="chat"&&this.setTab("chat");let e=this.body.querySelector(".thread");e==null||e.appendChild(this.messageNode({role:"user",text:t})),(i=this.body.querySelector(".suggestions"))==null||i.remove(),this.streaming=l("div",{class:"msg agent"}),this.streaming.innerHTML='<span class="typing"><i></i><i></i><i></i></span>',e==null||e.appendChild(this.streaming),this.scrollToEnd(),this.setTalking(!0),this.handlers.onSend(t)}appendChatDelta(t){var s;if(!this.streaming)return;let i=((s=this.streaming.getAttribute("data-text"))!=null?s:"")+t;this.streaming.setAttribute("data-text",i),this.streaming.innerHTML=w(i),this.scrollToEnd()}finishChat(t=[]){var i;if(!this.streaming)return;let e=(i=this.streaming.getAttribute("data-text"))!=null?i:"";this.messages.push({role:"agent",text:e,citations:t}),t.length&&this.streaming.appendChild(l("span",{class:"cite"},`${d(this.locale,"source")}: ${t.join(" \xB7 ")}`)),this.streaming=null,this.setTalking(!1),this.scrollToEnd()}pushAgentMessage(t){var e;this.messages.push({role:"agent",text:t}),this.tab==="chat"&&((e=this.body.querySelector(".thread"))==null||e.appendChild(this.messageNode({role:"agent",text:t})),this.scrollToEnd())}scrollToEnd(){requestAnimationFrame(()=>{this.body.scrollTop=this.body.scrollHeight})}speechRecognition(){let t=window,e=t.SpeechRecognition||t.webkitSpeechRecognition;return e?new e:null}showSummary(t){this.summary=t,this.setOrbState("ok"),this.setOpen(!0),this.setTab("summary")}renderSummary(){this.body.replaceChildren(),this.panel.querySelectorAll(".composer").forEach(a=>a.remove());let t=l("div",{class:"card"});if(!this.summary){t.appendChild(l("span",{class:"chip"},d(this.locale,"tabSummary"))),t.appendChild(l("p",{},d(this.locale,"summaryPending"))),this.body.appendChild(t);return}let e=this.summary;t.appendChild(l("span",{class:"chip","data-kind":"concept"},d(this.locale,"complete"))),t.appendChild(l("h3",{},e.experimentTitle)),t.appendChild(l("p",{},w(e.narrative)));let i=l("div",{class:"stats"}),s=Math.floor(e.durationSeconds/60),n=e.durationSeconds%60,o=[[d(this.locale,"precision"),`${e.precisionScore}%`,e.precisionScore>=80?"good":"warn"],[d(this.locale,"time"),`${s}m ${String(n).padStart(2,"0")}s`,""],[d(this.locale,"steps"),`${e.stepsCompleted}/${e.stepsTotal}`,""],[d(this.locale,"hints"),String(e.hintsUsed),""]];for(let[a,h,u]of o){let c=l("div",{class:"stat"});c.appendChild(l("div",{class:"k"},a)),c.appendChild(l("div",{class:`v ${u}`},h)),i.appendChild(c)}if(t.appendChild(i),e.conceptsToReview.length){t.appendChild(l("div",{class:"k",style:"font-size:11px;color:var(--vl-fg-muted)"},d(this.locale,"revisit")));let a=l("div",{class:"review"});for(let h of e.conceptsToReview)a.appendChild(l("span",{},h));t.appendChild(a)}if(e.quiz.length){let a=l("div",{class:"actions"}),h=l("button",{class:"btn primary",type:"button"},d(this.locale,"takeQuiz"));h.addEventListener("click",()=>this.renderQuiz()),a.appendChild(h),t.appendChild(a)}this.body.appendChild(t)}renderQuiz(){if(!this.summary)return;this.body.replaceChildren();let t=l("div",{class:"card"});t.appendChild(l("span",{class:"chip"},d(this.locale,"quiz"))),t.appendChild(l("h3",{},d(this.locale,"quizTitle")));let e=l("form");for(let[o,a]of this.summary.quiz.entries()){let h=l("div",{class:"quiz-q","data-q":a.id});h.appendChild(l("p",{},`${o+1}. ${a.question}`));for(let[u,c]of a.options.entries()){let m=l("label",{class:"opt"}),v=l("input",{type:"radio",name:a.id,value:String(u)});m.append(v,l("span",{},c)),h.appendChild(m)}e.appendChild(h)}t.appendChild(e);let i=l("div",{class:"actions"}),s=l("button",{class:"btn primary",type:"button"},d(this.locale,"submit"));s.addEventListener("click",async()=>{var u;let o={};for(let c of this.summary.quiz){let m=e.querySelector(`input[name="${c.id}"]:checked`);m&&(o[c.id]=Number(m.value))}s.setAttribute("disabled","");let a=await this.handlers.onQuizSubmit(o);if(!a){s.removeAttribute("disabled");return}for(let c of this.summary.quiz){let m=e.querySelector(`[data-q="${c.id}"]`);if(!m)continue;Array.from(m.querySelectorAll(".opt")).forEach((g,p)=>{var f;p===c.answer_index?g.classList.add("correct"):o[c.id]===p&&g.classList.add("wrong"),(f=g.querySelector("input"))==null||f.setAttribute("disabled","")}),m.appendChild(l("div",{class:"feedback"},w((u=a.feedback[c.id])!=null?u:"")))}let h=l("p",{style:"margin-top:14px;font-weight:650;color:var(--vl-fg)"},`${d(this.locale,"score")}: ${a.score} / ${a.total}`);t.appendChild(h),s.remove(),this.live.textContent=`${d(this.locale,"score")} ${a.score} of ${a.total}`}),i.appendChild(s);let n=l("button",{class:"btn ghost",type:"button"},d(this.locale,"back"));n.addEventListener("click",()=>this.renderSummary()),i.appendChild(n),t.appendChild(i),this.body.appendChild(t)}highlight(t,e){var a,h;this.clearHighlight();let i=null;try{i=e.querySelector(t)}catch{return}if(!i)return;let s=i.getBoundingClientRect(),n=window.scrollX,o=window.scrollY;if(e!==document){let u=(a=e.defaultView)==null?void 0:a.frameElement;if(!u)return;let c=u.getBoundingClientRect();n+=c.left,o+=c.top}this.ring=l("div",{class:"hl-ring ping"}),Object.assign(this.ring.style,{left:`${s.left+n-4}px`,top:`${s.top+o-4}px`,width:`${s.width+8}px`,height:`${s.height+8}px`,position:"absolute"}),(h=this.root.querySelector(".root"))==null||h.appendChild(this.ring),i.scrollIntoView({behavior:"smooth",block:"center"}),window.setTimeout(()=>this.clearHighlight(),6e3)}clearHighlight(){var t;(t=this.ring)==null||t.remove(),this.ring=null}};var St='a,button,input,select,textarea,label,canvas,[role="button"],[role="tab"],md-select,md-slider';function q(r){if(r.id)return`${r.tagName.toLowerCase()}#${r.id}`;let t=(r.getAttribute("class")||"").split(/\s+/).filter(e=>e&&!/^(ng-|is-|active$|selected$)/.test(e)).slice(0,2).join(".");return t?`${r.tagName.toLowerCase()}.${t}`:r.tagName.toLowerCase()}function W(r){let t=r;return!t||t.nodeType!==1||typeof t.closest!="function"?null:t.closest(St)}var R=class{constructor(t,e){this.startedAt=Date.now();this.lastActivityAt=Date.now();this.awaySince=null;this.awayMs=0;this.idleAnnounced=!1;this.clicks=[];this.rageClicks=0;this.hesitations=0;this.corrections=0;this.hovers=new Map;this.activeHover=null;this.pointerDistance=0;this.pointerReversals=0;this.lastPointer=null;this.pointerFrame=0;this.scrollDepth=0;this.scrollStartedAt=Date.now();this.scrolledPage=!1;this.fieldChanges=new Map;this.tasksVisited=[];this.docs=new WeakSet;this.stopped=!1;this.flowAnnounced=!1;this.onSignal=t,this.onSnapshot=e}start(){this.attach(document),document.addEventListener("visibilitychange",()=>this.onVisibility(),{passive:!0}),this.ticker=window.setInterval(()=>this.tick(),2e3)}stop(){this.stopped=!0,window.clearInterval(this.ticker),window.clearTimeout(this.hesitationTimer)}attach(t){if(this.docs.has(t))return;this.docs.add(t);let e={capture:!0,passive:!0};t.addEventListener("pointermove",i=>this.onPointerMove(i),e),t.addEventListener("pointerover",i=>this.onPointerOver(i),e),t.addEventListener("pointerout",i=>this.onPointerOut(i),e),t.addEventListener("click",i=>this.onClick(i),e),t.addEventListener("keydown",()=>this.markActive(),e),t.addEventListener("scroll",()=>this.onScroll(t),{capture:!0,passive:!0})}noteTask(t){let e=this.tasksVisited.indexOf(t);this.tasksVisited.push(t),e>=0&&this.tasksVisited.length-e>2&&this.emit({kind:"backtrack",confidence:.75,detail:t,at:Date.now()}),this.resetPageScoped()}noteFieldChange(t){var i;let e=((i=this.fieldChanges.get(t))!=null?i:0)+1;this.fieldChanges.set(t,e),e===4&&(this.corrections+=1,this.emit({kind:"thrash",confidence:.7,selector:t,at:Date.now()}))}snapshot(){let t=Date.now(),e=(t-this.lastActivityAt)/1e3,i=Math.max(1,(t-this.startedAt)/1e3),s=this.awayMs/1e3+(this.awaySince?(t-this.awaySince)/1e3:0),n=Math.max(0,i-s),o=Math.min(1,s/Math.max(i,1)),a=Math.min(1,Math.max(0,e-25e3/1e3)/60),h=L(1-o*.7-a*.5),u=L(this.rageClicks*.28+this.hesitations*.12+this.corrections*.2),c=[...this.hovers.values()].filter(g=>g.committed).length,m=this.hovers.size||1,v=L(.35+c/m*.65-this.hesitations*.08-this.rageClicks*.1);return{focus:h,struggle:u,confidence:v,coverage:L(this.scrollDepth),metrics:{activeSeconds:Math.round(n),idleSeconds:Math.round(e),awaySeconds:Math.round(s),clicks:this.clicks.length,rageClicks:this.rageClicks,hesitations:this.hesitations,corrections:this.corrections,scrollDepth:Math.round(this.scrollDepth*100)/100,pointerDistance:Math.round(this.pointerDistance),tasksVisited:new Set(this.tasksVisited).size}}}markActive(){this.lastActivityAt=Date.now(),this.idleAnnounced&&(this.idleAnnounced=!1,this.emit({kind:"returned",confidence:.8,at:Date.now()}))}onPointerMove(t){this.markActive(),!this.pointerFrame&&(this.pointerFrame=requestAnimationFrame(()=>{this.pointerFrame=0;let e=this.lastPointer;if(e){let i=t.clientX-e.x,s=t.clientY-e.y,n=Math.hypot(i,s);n<400&&(this.pointerDistance+=n),n>6&&(Math.sign(i)!==Math.sign(e.dx)||Math.sign(s)!==Math.sign(e.dy))&&(this.pointerReversals+=1),this.lastPointer={x:t.clientX,y:t.clientY,dx:i,dy:s}}else this.lastPointer={x:t.clientX,y:t.clientY,dx:0,dy:0}}))}onPointerOver(t){var n;let e=W(t.target);if(!e)return;let i=q(e);this.activeHover={selector:i,el:e};let s=(n=this.hovers.get(i))!=null?n:{enteredAt:0,totalMs:0,committed:!1};s.enteredAt=Date.now(),this.hovers.set(i,s),window.clearTimeout(this.hesitationTimer),this.hesitationTimer=window.setTimeout(()=>{var a;if(((a=this.activeHover)==null?void 0:a.selector)!==i)return;let o=this.hovers.get(i);!o||o.committed||(this.hesitations+=1,this.emit({kind:"hesitation",confidence:.72,selector:i,detail:et(e),at:Date.now()}))},1800)}onPointerOut(t){var n;let e=W(t.target);if(!e)return;let i=q(e),s=this.hovers.get(i);s!=null&&s.enteredAt&&(s.totalMs+=Date.now()-s.enteredAt,s.enteredAt=0),((n=this.activeHover)==null?void 0:n.selector)===i&&(this.activeHover=null),window.clearTimeout(this.hesitationTimer)}onClick(t){this.markActive();let e=W(t.target),i=e?q(e):"non-interactive",s=Date.now();this.clicks.push({at:s,selector:i}),this.clicks.length>200&&this.clicks.shift();let n=this.hovers.get(i);n&&(n.committed=!0),this.clicks.filter(a=>s-a.at<1200&&a.selector===i).length>=3&&(this.rageClicks+=1,this.clicks=this.clicks.filter(a=>a.selector!==i),this.emit({kind:"rage_click",confidence:.85,selector:i,detail:e?et(e):void 0,at:s}))}onScroll(t){this.markActive(),this.scrolledPage=!0;let e=t.scrollingElement||t.documentElement,i=Math.max(1,e.scrollHeight-e.clientHeight),s=Math.min(1,e.scrollTop/i);s>this.scrollDepth&&(this.scrollDepth=s)}onVisibility(){if(document.hidden){this.awaySince=Date.now();return}if(this.awaySince){let t=Date.now()-this.awaySince;this.awayMs+=t,this.awaySince=null,this.markActive(),t>3e4&&this.emit({kind:"attention_lost",confidence:.8,detail:`${Math.round(t/1e3)}s`,at:Date.now()})}}tick(){if(this.stopped)return;let t=Date.now(),e=t-this.lastActivityAt;e>25e3&&!this.idleAnnounced&&!document.hidden&&(this.idleAnnounced=!0,this.emit({kind:"idle",confidence:.7,detail:`${Math.round(e/1e3)}s`,at:t})),this.pointerDistance>4e3&&this.pointerReversals>25&&this.clicks.length===0&&(this.pointerReversals=0,this.pointerDistance=0,this.emit({kind:"wandering",confidence:.65,at:t}));let i=this.snapshot();i.metrics.clicks>=6&&i.struggle<.15&&i.focus>.8&&i.metrics.activeSeconds>45&&!this.flowAnnounced&&(this.flowAnnounced=!0,this.emit({kind:"flow",confidence:.7,at:t})),this.onSnapshot(i)}resetPageScoped(){if(this.scrolledPage){let t=Date.now()-this.scrollStartedAt,e=Math.max(1,this.scrollDepth*3);this.scrollDepth>.6&&t>4e3*e?this.emit({kind:"read",confidence:.7,at:Date.now()}):this.scrollDepth>.5&&t<4e3&&this.emit({kind:"skimmed",confidence:.75,at:Date.now()})}this.scrollDepth=0,this.scrolledPage=!1,this.scrollStartedAt=Date.now(),this.hovers.clear(),this.fieldChanges.clear()}emit(t){this.stopped||this.onSignal(t)}};function L(r){return Math.max(0,Math.min(1,r))}function et(r){let t=r.getAttribute("aria-label")||r.getAttribute("title");if(t)return t.trim().slice(0,60);let e=(r.innerText||r.textContent||"").trim().replace(/\s+/g," ");return e?e.slice(0,60):void 0}var Ct={rage_click:6e4,hesitation:9e4,thrash:12e4,idle:12e4,attention_lost:18e4,returned:3e5,skimmed:24e4,read:6e5,backtrack:12e4,wandering:15e4,flow:6e5},Tt=45e3,At=6,Et=2e4,N=class{constructor(t){this.lastSpokeAt=0;this.lastByKind=new Map;this.spent=0;this.startedAt=Date.now();this.muted=!1;this.mode=t}setMode(t){this.mode=t}mute(){this.muted=!0}get exhausted(){return this.muted||this.spent>=At}consider(t,e){var a,h;if(this.exhausted)return null;let i=t.at;if(i-this.startedAt<Et||i-this.lastSpokeAt<Tt||t.confidence<.65)return null;let s=(a=Ct[t.kind])!=null?a:12e4,n=(h=this.lastByKind.get(t.kind))!=null?h:0;if(i-n<s)return null;let o=this.compose(t,e);return o?(this.lastByKind.set(t.kind,i),this.lastSpokeAt=i,this.spent+=1,o):null}compose(t,e){var n;let i=this.mode==="lab",s=t.detail?`\u201C${t.detail}\u201D`:"that control";switch(t.kind){case"rage_click":return{kind:"WARN",title:i?"That control is not responding":"That does not seem to be working",message:i?`You have hit ${s} several times in a row. Either the simulator is still busy with the last change, or this step needs something set before it will do anything. Want me to point at what comes first?`:`${s} has been clicked a few times without moving. It may be a heading rather than a link \u2014 I can show you where this section actually leads.`,source:"behaviour",signal:t.kind,selector:t.selector,actions:[{label:"Show me",kind:"show_me"},{label:"It is fine",kind:"dismiss"}]};case"hesitation":return e.struggle<.25?null:{kind:"HINT",title:"Not sure about that one?",message:i?`You have been holding over ${s} without picking it. If you are weighing it up, I can tell you what this control changes before you commit.`:`You have been hovering ${s} for a while. Tell me what you are trying to find and I will take you straight there.`,source:"behaviour",signal:t.kind,selector:t.selector,actions:[{label:"What does it do?",kind:"open_chat"},{label:"I know",kind:"dismiss"}]};case"thrash":return i?{kind:"HINT",title:"Second-guessing that value?",message:"You have rewritten that field several times. If you are unsure what range it should sit in, the procedure gives a working value you can start from and adjust.",source:"behaviour",signal:t.kind,selector:t.selector,actions:[{label:"What should it be?",kind:"open_chat"},{label:"Got it",kind:"acknowledge"}]}:null;case"idle":return{kind:"HINT",title:i?"Still on this step?":"Anything I can find for you?",message:i?"Nothing has moved for a while. If the next step is not obvious, say the word and I will walk you through it \u2014 or I can explain why this step matters before you do it.":"You have been on this page a little while. I can search the labs by topic, or take you to where you left off.",source:"behaviour",signal:t.kind,actions:[{label:"Walk me through",kind:"show_me"},{label:"Just reading",kind:"dismiss"}]};case"wandering":return{kind:"HINT",title:"Looking for something specific?",message:i?"You are scanning the page rather than working through it. Tell me what you are after \u2014 a control, a value, or the next step \u2014 and I will point at it.":"There is a lot on this page. Tell me the subject or the experiment you want and I will jump you there instead.",source:"behaviour",signal:t.kind,actions:[{label:"Ask me",kind:"open_chat"},{label:"Browsing",kind:"dismiss"}]};case"backtrack":return i?{kind:"CONCEPT",title:"Going back to check something?",message:`Coming back to ${(n=t.detail)!=null?n:"an earlier page"} usually means a result did not look the way you expected. If you tell me what you are seeing, I can say whether it is wrong or just surprising.`,source:"behaviour",signal:t.kind,actions:[{label:"Here is what I see",kind:"open_chat"},{label:"Just checking",kind:"dismiss"}]}:null;case"skimmed":return i?{kind:"CONCEPT",title:"Worth a second look",message:"You moved through that page quickly. The simulator will still run, but the results are much easier to interpret with the theory behind them \u2014 I can give you the two ideas that actually matter in about a line each.",source:"behaviour",signal:t.kind,actions:[{label:"Give me the short version",kind:"open_chat"},{label:"I have read it",kind:"dismiss"}]}:null;case"attention_lost":return{kind:"HINT",title:"Welcome back",message:i?"You were away for a bit. I have kept your place \u2014 you were part-way through this step, and nothing was lost.":"You were away for a bit. Everything is where you left it.",source:"behaviour",signal:t.kind,actions:[{label:"Thanks",kind:"acknowledge"}]};case"flow":return{kind:"CONCEPT",title:"This is going well",message:i?`Steady work \u2014 ${e.metrics.clicks} actions, nothing retried, and no steps out of order. I will keep out of your way unless something actually goes wrong.`:"You are moving through this quickly. I will stay out of the way.",source:"behaviour",signal:t.kind,actions:[{label:"Good",kind:"acknowledge"}]};case"read":case"returned":return null;default:return null}}};function it(r,t){return r.struggle>.55?{tone:"stuck",headline:"This step is fighting you",detail:t==="lab"?"Several retries and a few changes of mind. Worth asking me rather than pushing on.":"You have been going back and forth. Tell me what you are looking for."}:r.focus<.5?{tone:"watch",headline:"Picking up where you left off",detail:`About ${r.metrics.awaySeconds}s away from this page. Your place is kept.`}:r.struggle>.25?{tone:"watch",headline:"Going steadily",detail:`${r.metrics.clicks} actions so far, with a couple of second thoughts. That is normal on this step.`}:{tone:"good",headline:"On track",detail:r.metrics.clicks>0?`${r.metrics.clicks} actions, nothing retried. ${Math.round(r.metrics.activeSeconds/60)||1} min of focused work.`:"Nothing to flag yet. I am watching the steps as you take them."}}function _t(){let r=location.pathname.replace(/\/+$/,"");return r===""||r==="/"?"home":/broad-area/.test(r)?"broad-area":/\/labs?\//.test(r)||document.querySelector(".vlabs-page-main")?"lab":/participating-institutes|partners/.test(r)?"institutes":/about/.test(r)?"about":/contact/.test(r)?"contact":/dashboard|faculty|admin|studio/.test(r)?"dashboard":"other"}function It(){let r=new Set,t=[],e=[document.querySelector(".ba-text"),document.querySelector(".vlabs-page-content"),document.querySelector("#menu"),document.querySelector("main"),document.body].filter(Boolean);for(let i of e){for(let s of Array.from(i.querySelectorAll("a[href]"))){if(t.length>=40)break;let n=s.getAttribute("href")||"";if(!n||n.startsWith("#")||n.startsWith("mailto:")||n.startsWith("javascript:")||s.closest("header,footer,.footer,.ftr,.navbar,.sm-hdr-top,nav.navbar"))continue;let o=(s.textContent||"").trim().replace(/\s+/g," ");if(!o||o.length<3||o.length>90)continue;let a=o.toLowerCase();if(r.has(a))continue;r.add(a);let h=s.closest(".labs")?"Lab":s.closest(".ba-text")?"Discipline":s.closest("#menu")?"This lab":void 0;t.push({label:o,href:n,group:h})}if(t.length>=40)break}return t}function O(){var e,i,s,n,o,a;let r=_t(),t=((i=(e=document.querySelector(".innerhead-text"))==null?void 0:e.textContent)==null?void 0:i.trim())||((n=(s=document.querySelector(".vlabs-page-content h2"))==null?void 0:s.textContent)==null?void 0:n.trim())||((a=(o=document.querySelector("h1"))==null?void 0:o.textContent)==null?void 0:a.trim())||document.title;return{kind:r,title:t||document.title,targets:It()}}function G(r){switch(r.kind){case"home":return{title:"Looking for a particular lab?",message:"There are ten disciplines here and over 1500 experiments. Tell me a subject \u2014 \u201Chalf adder\u201D, \u201Ctitration\u201D, \u201Cpendulum\u201D \u2014 and I will take you to the lab that covers it."};case"broad-area":return{title:`${r.title}`,message:`This page lists the labs in ${r.title.toLowerCase()}, each hosted by the institute that built it. Tell me what you want to practise and I will pick the lab, or say \u201Cwhat is in this area?\u201D for a summary.`};case"lab":return{title:"Inside a lab",message:"Introduction and Objective set up the theory; List of experiments is where the actual simulators are. Once you open an experiment I switch from guide to lab assistant and start watching the steps with you."};case"institutes":return{title:"Participating institutes",message:"Each crest opens the labs that institute maintains. If you are looking for a subject rather than an institute, ask me and I will search across all of them."};case"dashboard":return{title:"Your dashboard",message:"This is where your sessions, assignments and progress live. Ask me things like \u201Cwhat am I behind on?\u201D or \u201Cwhich experiment did I struggle with?\u201D."};case"about":case"contact":return{title:"About Virtual Labs",message:"Happy to answer questions about the platform. If you would rather get started, ask me for a subject and I will take you to a lab."};default:return{title:"I can help you find your way",message:"Tell me a subject, a lab or an experiment and I will take you there. On an experiment page I become a lab assistant and watch the steps with you."}}}function st(r,t){let e=r.toLowerCase().trim();if(e.length<2)return[];let i=e.split(/\s+/).filter(n=>n.length>2);return t.map(n=>{let o=n.label.toLowerCase(),a=0;o===e&&(a+=100),o.includes(e)&&(a+=40);for(let h of i)o.includes(h)&&(a+=12),new RegExp(`\\b${Mt(h)}`).test(o)&&(a+=8);return{label:n.label,href:n.href,score:a}}).filter(n=>n.score>=12).sort((n,o)=>o.score-n.score).slice(0,5)}function Mt(r){return r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}var nt="https://vlaila.vlabs.ac.in/api",V="vlaila:opt-out",Lt="vlaila:session",Y=class{constructor(){this.rules=null;this.sessionId=null;this.locale="en";this.ended=!1;this.mode="lab";this.page=null;this.pendingSignals=[];this.lastSnapshot=null;this.state={completed:new Set,shownErrors:new Set,shownConcepts:new Set,hintLevels:{},counts:{},idleSeconds:0}}async boot(){var a,h,u,c,m;if(sessionStorage.getItem(V)==="1")return;let{ref:t,apiOverride:e}=H();if(!t){this.bootNavigator(e);return}this.locale=B(),this.api=new T(e||nt);let i=(a=document.currentScript)!=null?a:document.querySelector('script[src*="vlaila"]'),s=(h=i==null?void 0:i.dataset)!=null?h:{},n=await this.api.startSession(t,{userKey:s.vlailaUser,institution:s.vlailaInstitution,locale:this.locale});if(!n)return;this.sessionId=n.session_id,this.rules=(u=n.rules)!=null?u:null,sessionStorage.setItem(Lt,n.session_id),this.ui=new y({onAction:(v,g)=>this.onAction(v,g),onSend:v=>{this.onSend(v)},onReport:v=>this.onReport(v),onQuizSubmit:v=>this.onQuizSubmit(v),onOpen:()=>{},onClose:()=>{},onOptOut:()=>{sessionStorage.setItem(V,"1"),this.observer.stop()}},this.locale,(m=(c=y.storedAvatar())!=null?c:s.vlailaAvatar)!=null?m:"ravi"),this.ui.setSubtitle(n.title?this.truncate(n.title,42):d(this.locale,"subtitle")),this.observer=new _(v=>{this.onEvent(v)}),this.observer.start(),this.startBehaviour("lab");let o=b();o&&this.onEvent({action:"navigate",task:o,frame:"host"}),window.setInterval(()=>this.checkStuck(),1e4),(o==="Feedback"||o==="Posttest")&&window.setTimeout(()=>{this.finish()},4e3),window.addEventListener("pagehide",()=>this.flushEnd())}startBehaviour(t){if(this.mode=t,this.coach=new N(t),this.behaviour=new R(e=>this.onBehaviourSignal(e),e=>this.onBehaviourSnapshot(e)),this.behaviour.start(),t==="lab"){let e=()=>{for(let{doc:i}of C())this.behaviour.attach(i)};e(),window.setInterval(e,4e3)}window.setInterval(()=>this.reportBehaviour(),6e4),window.addEventListener("pagehide",()=>this.reportBehaviour())}onBehaviourSignal(t){var s;this.pendingSignals.push(t),this.pendingSignals.length>40&&this.pendingSignals.shift();let e=(s=this.lastSnapshot)!=null?s:this.behaviour.snapshot(),i=this.coach.consider(t,e);i&&this.ui.showIntervention({kind:i.kind,title:i.title,message:i.message,highlightSelector:i.selector,highlightFrame:"host",actions:i.actions,tier:"behaviour"})}onBehaviourSnapshot(t){var e;this.lastSnapshot=t,(e=this.ui)==null||e.setCoach(it(t,this.mode),t.metrics)}reportBehaviour(){!this.sessionId||!this.lastSnapshot||!this.pendingSignals.length&&this.lastSnapshot.metrics.clicks===0||(this.api.behaviour(this.sessionId,this.lastSnapshot,this.pendingSignals),this.pendingSignals=[])}bootNavigator(t){var i;this.locale=B(),this.api=new T(t||nt),this.page=O(),this.ui=new y({onAction:()=>{},onSend:s=>this.onNavigate(s),onReport:()=>{},onQuizSubmit:async()=>null,onOpen:()=>{},onClose:()=>{},onOptOut:()=>{var s,n;sessionStorage.setItem(V,"1"),(s=this.behaviour)==null||s.stop(),(n=this.coach)==null||n.mute()}},this.locale,(i=y.storedAvatar())!=null?i:"ravi");let e=G(this.page);this.ui.setSubtitle(this.truncate(this.page.title,42)),this.ui.setNavigatorMode(e),this.startBehaviour("navigator")}onNavigate(t){var n;let e=(n=this.page)!=null?n:O(),i=st(t,e.targets);if(!i.length){this.ui.pushAgentMessage("I could not find that on this page. Try a subject \u2014 \u201Ccircuits\u201D, \u201Ctitration\u201D, \u201Csorting\u201D \u2014 or go to the [home page](/) and I will search the whole catalogue from there."),this.ui.finishChat([]);return}let s=i.map(o=>`- [${o.label}](${o.href})`).join(`
`);this.ui.pushAgentMessage(i.length===1?`That is here:

${s}`:`Closest matches on this page:

${s}`),this.ui.finishChat([])}async onEvent(t){var s,n,o,a;this.state.idleSeconds=(n=(s=this.observer)==null?void 0:s.idleSeconds())!=null?n:0,t.task&&(this.state.currentTask=t.task),t.action==="navigate"&&t.task&&((o=this.behaviour)==null||o.noteTask(t.task)),(t.action==="input"||t.action==="change")&&t.selector&&((a=this.behaviour)==null||a.noteFieldChange(t.selector));let e=this.rules?P(this.rules,{action:t.action,task:t.task,selector:t.selector,frame:t.frame,value:t.value,numericValue:t.numericValue},this.state):{kind:"NO_ACTION",confidence:1};this.applyLocal(e);let i=this.sessionId?await this.api.sendEvent(this.sessionId,t):null;i?this.applyRemote(i):e.kind!=="NO_ACTION"&&this.present({kind:e.kind,severity:e.severity,title:e.title,message:e.message,highlightSelector:e.highlightSelector,highlightFrame:e.highlightFrame,tier:"offline"})}applyLocal(t){var e,i;t.stepId&&t.kind==="NO_ACTION"&&this.state.completed.add(t.stepId),t.errorId&&this.state.shownErrors.add(t.errorId),t.kind==="CONCEPT"&&t.stepId&&(this.state.shownConcepts.add(t.stepId),this.state.completed.add(t.stepId)),t.kind==="HINT"&&t.stepId&&(this.state.hintLevels[t.stepId]=(e=t.hintLevel)!=null?e:1),this.rules&&((i=this.ui)==null||i.setProgress(J(this.rules,this.state)))}applyRemote(t){if(t.progress&&(this.state.completed=new Set(t.progress.completed_steps),this.ui.setProgress(t.progress.percent)),t.verdict==="NO_ACTION"){t.step_id&&this.ui.resolveIfCorrecting(t.step_id);return}this.present({kind:t.verdict,severity:t.severity,title:t.title,message:t.message,concept:t.concept,interventionId:t.intervention_id,stepId:t.step_id,correctionStepId:t.correction_step_id,highlightSelector:t.highlight_selector,highlightFrame:t.highlight_frame,actions:t.actions,tier:t.tier})}present(t){this.ui.showIntervention(t)}checkStuck(){if(!this.rules||this.ended)return;this.state.idleSeconds=this.observer.idleSeconds();let t=P(this.rules,{action:"dwell",task:b(),frame:"host"},this.state);t.kind==="HINT"&&(this.applyLocal(t),this.present({kind:"HINT",title:t.title,message:t.message,highlightSelector:t.highlightSelector,highlightFrame:t.highlightFrame,tier:"rules",actions:[{label:"Show me",kind:"show_me"},{label:"I'm fine",kind:"dismiss"}]}))}onAction(t,e){if(t==="show_me"&&e.highlightSelector){let s=this.observer.documentFor(e.highlightFrame);this.ui.highlight(e.highlightSelector,s),this.ui.setPose("pointing"),window.setTimeout(()=>this.ui.setPose("idle"),6e3)}if(!this.sessionId||!e.interventionId)return;let i=t==="dismiss"?"dismissed":t==="auto_resolved"?"auto_resolved":"accepted";this.api.feedback(this.sessionId,e.interventionId,i)}onReport(t){!this.sessionId||!t.interventionId||this.api.feedback(this.sessionId,t.interventionId,"reported_wrong","Reported from the widget")}async onSend(t){var i;if(!this.sessionId)return;let e=[];for await(let s of this.api.chat(this.sessionId,t,[]))s.delta&&this.ui.appendChatDelta(s.delta),s.done&&(e=((i=s.citations)!=null?i:[]).map(n=>n.heading).slice(0,3));this.ui.finishChat(e)}async onQuizSubmit(t){return this.sessionId?this.api.submitQuiz(this.sessionId,t):null}async finish(){if(this.ended||!this.sessionId)return;this.ended=!0;let t=await this.api.endSession(this.sessionId,"completed");t&&this.ui.showSummary({experimentTitle:t.experiment_title,durationSeconds:t.duration_seconds,stepsCompleted:t.steps_completed,stepsTotal:t.steps_total,precisionScore:t.precision_score,hintsUsed:t.hints_used,deviations:t.deviations,deviationsRecovered:t.deviations_recovered,narrative:t.narrative,conceptsToReview:t.concepts_to_review,quiz:t.quiz})}flushEnd(){var e;if(this.ended||!this.sessionId)return;let t=JSON.stringify({session_id:this.sessionId,reason:"navigated_away"});(e=navigator.sendBeacon)==null||e.call(navigator,`${this.api.base}/session/end`,new Blob([t],{type:"application/json"}))}truncate(t,e){return t.length>e?`${t.slice(0,e-1)}\u2026`:t}async refresh(){var s,n;let{ref:t}=H(),e=!!t,i=this.mode==="lab";if(e!==i){this.teardown(),await this.boot();return}e||(this.page=O(),(s=this.ui)==null||s.setSubtitle(this.truncate(this.page.title,42)),(n=this.ui)==null||n.setNavigatorMode(G(this.page)))}teardown(){var t,e,i;this.reportBehaviour(),(t=this.behaviour)==null||t.stop(),(e=this.observer)==null||e.stop(),(i=this.ui)==null||i.destroy(),this.sessionId=null,this.ended=!1,this.pendingSignals=[],this.lastSnapshot=null,this.state={completed:new Set,shownErrors:new Set,shownConcepts:new Set,hintLevels:{},counts:{},idleSeconds:0}}};function rt(){let r=window;if(r.__vlaila)return;let t=new Y;r.__vlaila=t,t.boot()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",rt):rt();})();
//# sourceMappingURL=vlaila.js.map
