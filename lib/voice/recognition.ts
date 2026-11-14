/** Tipo mínimo porque lib.dom no incluye webkitSpeechRecognition. */
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type ListenFailReason = 'denied' | 'no-speech' | 'error' | 'empty';

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

export function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const recognitionWindow = window as SpeechRecognitionWindow;
  return (
    recognitionWindow.SpeechRecognition ??
    recognitionWindow.webkitSpeechRecognition ??
    null
  );
}

export function startListening(handlers: {
  onFinal(text: string): void;
  onFail(reason: ListenFailReason): void;
  onEnd(): void;
}): { stop(): void } | null {
  const Recognition = getRecognitionCtor();
  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();
  let delivered = false;
  let reportedError = false;
  let ended = false;

  recognition.lang = 'es-MX';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    if (delivered || reportedError) {
      return;
    }

    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript ?? '';

      if (result.isFinal && transcript.trim().length > 0) {
        delivered = true;
        recognition.stop();
        handlers.onFinal(transcript.slice(0, 500));
        return;
      }
    }
  };

  recognition.onerror = (event) => {
    if (delivered || reportedError) {
      return;
    }

    reportedError = true;
    const reason: ListenFailReason =
      event.error === 'not-allowed'
        ? 'denied'
        : event.error === 'no-speech'
          ? 'no-speech'
          : 'error';
    handlers.onFail(reason);
  };

  recognition.onend = () => {
    if (ended) {
      return;
    }

    ended = true;
    try {
      if (!delivered && !reportedError) {
        handlers.onFail('empty');
      }
    } finally {
      handlers.onEnd();
    }
  };

  recognition.start();
  return { stop: () => recognition.stop() };
}
