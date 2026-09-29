/**
 * The bits of the Web Speech API this widget uses.
 *
 * `SpeechRecognition` is not in TypeScript's DOM library: it is a draft API
 * that ships prefixed in Chrome and not at all in Firefox, which is why the
 * code feature-detects it. Declaring the shape here is what lets the mic
 * button be typed instead of reaching for `any` three times.
 */

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

export interface SpeechRecognitionResultLike {
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  readonly results: { readonly [index: number]: SpeechRecognitionResultLike };
}

export interface SpeechRecognitionLike {
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

/** The two names the constructor is published under. */
export interface SpeechCapableWindow {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}
