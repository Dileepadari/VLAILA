/**
 * Widget chrome strings.
 *
 * Only the UI furniture lives here. Hints, explanations and chat answers come
 * from the knowledge base and the model, which handle language natively -- so
 * adding a language means translating this file, not re-authoring content.
 *
 * Locale detection prefers an explicit `data-vlaila-locale`, then the lab
 * page's own `<html lang>`, then the browser. Virtual Labs serves students
 * across India, and defaulting to the page's declared language is what makes a
 * Hindi-medium lab feel coherent rather than half-translated.
 */

type Strings = Record<string, string>;

const en: Strings = {
  // The assistant is a person on screen, so they have a name. Students talk
  // about "asking Ravi" in a way they never do about "opening the widget".
  nameRavi: 'Ravi',
  nameAsha: 'Asha',
  roleLabel: 'Lab assistant',
  chooseAssistant: 'Choose your assistant',
  tapToOpen: 'Click to read more',
  orbLabel: 'Talk to your lab assistant',
  subtitle: 'Watching this experiment',
  close: 'Close',
  optOut: 'Turn off for this session',
  tabAssist: 'Assist',
  tabChat: 'Ask',
  tabSummary: 'Summary',
  watching: 'On track',
  idleTitle: "You're doing fine",
  idleBody:
    "I'm following along quietly and will speak up if a step looks out of order. Ask me anything about this experiment whenever you like.",
  askMe: 'Ask a question',
  chipFatal: 'Affects your result',
  chipRecoverable: 'Worth fixing',
  chipHint: 'Hint',
  chipConcept: 'Why this happened',
  gotIt: 'Got it',
  reportWrong: 'This was wrong',
  reportThanks: 'Thanks — flagged for review.',
  chatGreeting:
    "Ask me about this experiment — the procedure, a control in the simulator, or the theory behind it.",
  askPlaceholder: 'Ask about this experiment…',
  suggestions:
    'What is this step for?|Why did my result change?|Explain the theory simply',
  send: 'Send',
  voice: 'Speak your question',
  source: 'Source',
  summaryPending: 'Your summary appears when you finish the experiment.',
  complete: 'Experiment complete',
  precision: 'Precision',
  time: 'Time on task',
  steps: 'Steps',
  hints: 'Hints used',
  revisit: 'Worth revisiting',
  takeQuiz: 'Take the 3-question check',
  quiz: 'Quick check',
  quizTitle: 'Three questions on what you just did',
  submit: 'Submit',
  back: 'Back to summary',
  score: 'Score',
};

const hi: Strings = {
  ...en,
  nameRavi: 'रवि',
  nameAsha: 'आशा',
  roleLabel: 'प्रयोगशाला सहायक',
  chooseAssistant: 'अपना सहायक चुनें',
  tapToOpen: 'और पढ़ने के लिए क्लिक करें',
  orbLabel: 'अपने प्रयोगशाला सहायक से बात करें',
  subtitle: 'इस प्रयोग को देख रहा हूँ',
  close: 'बंद करें',
  optOut: 'इस सत्र के लिए बंद करें',
  tabAssist: 'सहायता',
  tabChat: 'पूछें',
  tabSummary: 'सारांश',
  watching: 'सब ठीक है',
  idleTitle: 'आप सही जा रहे हैं',
  idleBody:
    'मैं चुपचाप साथ चल रहा हूँ और कोई चरण गलत क्रम में लगे तो बता दूँगा। इस प्रयोग के बारे में कभी भी पूछ सकते हैं।',
  askMe: 'प्रश्न पूछें',
  chipFatal: 'परिणाम प्रभावित होगा',
  chipRecoverable: 'सुधारना बेहतर है',
  chipHint: 'संकेत',
  chipConcept: 'ऐसा क्यों हुआ',
  gotIt: 'समझ गया',
  reportWrong: 'यह गलत था',
  reportThanks: 'धन्यवाद — समीक्षा के लिए भेजा गया।',
  chatGreeting: 'इस प्रयोग के बारे में पूछें — प्रक्रिया, सिम्युलेटर का कोई नियंत्रण, या सिद्धांत।',
  askPlaceholder: 'इस प्रयोग के बारे में पूछें…',
  suggestions: 'यह चरण किसलिए है?|मेरा परिणाम क्यों बदला?|सिद्धांत सरल भाषा में बताइए',
  send: 'भेजें',
  voice: 'बोलकर पूछें',
  source: 'स्रोत',
  complete: 'प्रयोग पूर्ण',
  precision: 'शुद्धता',
  time: 'लगा समय',
  steps: 'चरण',
  hints: 'संकेत लिए',
  revisit: 'फिर से देखने योग्य',
  takeQuiz: '3 प्रश्नों की जाँच लें',
  quiz: 'त्वरित जाँच',
  quizTitle: 'अभी किए गए कार्य पर तीन प्रश्न',
  submit: 'जमा करें',
  back: 'सारांश पर लौटें',
  score: 'अंक',
};

const LOCALES: Record<string, Strings> = { en, hi };

export function t(locale: string, key: string): string {
  const table = LOCALES[locale.slice(0, 2)] ?? en;
  return table[key] ?? en[key] ?? key;
}

export function detectLocale(): string {
  const script =
    document.currentScript ??
    document.querySelector<HTMLScriptElement>('script[src*="vlaila"]');
  const explicit = (script as HTMLScriptElement | null)?.dataset?.vlailaLocale;
  if (explicit) return explicit;

  const pageLang = document.documentElement.getAttribute('lang');
  if (pageLang && pageLang !== 'en') return pageLang;

  return (navigator.language || 'en').slice(0, 2);
}
