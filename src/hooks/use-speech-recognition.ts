import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Web Speech API wrapper. Calls onFinalChunk with each finished phrase so the
 * caller can append it to existing text instead of replacing it.
 *
 * Mobile browsers (notably iOS Safari) end the session on every pause even with
 * continuous = true, so we restart automatically until the user taps Stop.
 */
export function useSpeechRecognition(onFinalChunk: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [heardSomething, setHeardSomething] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const callbackRef = useRef(onFinalChunk);
  callbackRef.current = onFinalChunk;

  useEffect(() => {
    setSupported(Boolean(getCtor()));
    return () => {
      wantListeningRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const launch = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onspeechstart = () => setHeardSomething(true);

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) finalText += `${result[0].transcript} `;
        else interimText += result[0].transcript;
      }
      if (finalText || interimText) setHeardSomething(true);
      setInterim(interimText);
      const trimmed = finalText.trim();
      if (trimmed) {
        callbackRef.current(trimmed);
        setInterim("");
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        wantListeningRef.current = false;
        setError("Microphone access is blocked. Allow the mic for this site, then tap the mic again.");
      } else if (code === "audio-capture") {
        wantListeningRef.current = false;
        setError("No microphone found. You can still type or use your keyboard's mic.");
      }
      // "no-speech" / "aborted" are normal; onend restarts if still wanted.
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim("");
      if (wantListeningRef.current) {
        // Pause-triggered end: keep the session alive.
        try {
          launch();
          return;
        } catch {
          /* fall through to stopping */
        }
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const start = useCallback(() => {
    if (!getCtor()) return;
    setError(null);
    setInterim("");
    setHeardSomething(false);
    wantListeningRef.current = true;
    setListening(true);
    try {
      launch();
    } catch {
      wantListeningRef.current = false;
      setListening(false);
      setError("Couldn't start the microphone. Please try again.");
    }
  }, [launch]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    // Update the UI immediately — some browsers never fire onend after stop().
    setListening(false);
    setInterim("");
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      /* ignore */
    }
    // Hard stop shortly after in case stop() is ignored.
    window.setTimeout(() => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    }, 400);
  }, []);

  return { supported, listening, interim, heardSomething, error, start, stop };
}
