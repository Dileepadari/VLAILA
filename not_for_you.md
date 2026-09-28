# Not for you

An honest list of reasons to close this tab.

**You want a product.** This is a proposal made concrete: a working assistant for six authored experiments out of Virtual Labs' ~1,500. The architecture is real and the six entries took genuine subject-matter effort, which is exactly the point being made - authoring, not engineering, is what limits rollout. Six is a demonstration, not a deployment.

**You want it to know your experiment.** It only helps where somebody has authored a knowledge base entry: the steps, the error patterns, the prerequisites, the quiz bank. With no entry it starts a session, records usage for the dashboards and stays deliberately silent rather than guessing at guidance it cannot ground. That silence is a feature and it will also look like the product not working.

**You want an identity system.** There is none. The student-facing routes are open because the widget is embedded in ~200 independently hosted lab pages with nothing to present; the instructor and admin routes are behind a single shared API key, because there is no user directory here to do anything better with. One key for every instructor, rotated by hand.

**You want the console to authenticate people.** It does not. The role switcher is a string in `localStorage` and the portal chrome is a replica. The API key is the entire boundary, and the console asks the browser for it rather than shipping it in the bundle.

**You want student privacy guarantees.** Sessions are pseudonymous by default and behavioural snapshots are derived scores rather than anything typed, which is the right shape. But `user_key` is whatever the host page passes, the dashboards will happily show it, and there is no retention policy, deletion endpoint or consent flow. That is a deployment conversation this repo does not have for you.

**You want the model tier.** The default is `offline`: a real adapter that composes answers from the knowledge base, not a stub. It is good enough to demonstrate and not as good as a frontier model. Turning on Anthropic, OpenAI or Ollama is two environment variables, and then session text does leave the machine unless you chose Ollama.

**You want a tested front end.** 82 tests cover the rules engine, the agent suite, memory, the API, the staff gate and the rate limiter - all Python, all offline. The React console and the embed bundle have none. `npm run lint` passes and `tsc` is clean; that is all the console has.

**You want the two rules engines to be one.** Tier 1 is implemented twice on purpose, in `server/app/agent/rules.py` and `embed/src/rules.ts`, so the widget can act with no round trip. The 20-case suite in `test_agent_suite.py` is the contract between them, and it is the only thing stopping them drifting.

**You want to deploy it as-is.** Set `VLAILA_STAFF_API_KEY` first. Without it the staff routes refuse everyone, which is the right default and will look like a bug until you read the error.
