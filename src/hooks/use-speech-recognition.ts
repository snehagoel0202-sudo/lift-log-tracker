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
  const restartTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const shortRunsRef = useRef(0);
  const callbackRef = useRef(onFinalChunk);
  callbackRef.current = onFinalChunk;

  const teardown = useCallback(() => {
    wantListeningRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      recognition.onspeechstart = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    setSupported(Boolean(getCtor()));
    return () => {
      teardown();
    };
  }, [teardown]);

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
      if (finalText || interimText) {
        setHeardSomething(true);
        shortRunsRef.current = 0;
      }
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
        setError(
          "Microphone access is blocked here. Allow the mic for this site, or open LiftLog in its own browser tab.",
        );
      } else if (code === "audio-capture") {
        wantListeningRef.current = false;
        setError("No microphone found. You can still type or use your keyboard's mic.");
      }
      // "no-speech" / "aborted" are normal; onend decides whether to restart.
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim("");

      const ranFor = Date.now() - startedAtRef.current;
      if (ranFor < 400) shortRunsRef.current += 1;
      else shortRunsRef.current = 0;

      // Sessions that die instantly mean the mic is unavailable (e.g. blocked in
      // an embedded preview). Never loop on that — it would freeze the page.
      if (shortRunsRef.current >= 3) {
        wantListeningRef.current = false;
        setError(
          "The microphone isn't available here. Allow mic access, or open LiftLog in its own browser tab. You can still type or use your keyboard's mic.",
        );
      }

      if (wantListeningRef.current) {
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          if (!wantListeningRef.current) return;
          try {
            launch();
          } catch {
            wantListeningRef.current = false;
            setListening(false);
          }
        }, 350);
        return;
      }

      setListening(false);
    };

    recognitionRef.current = recognition;
    startedAtRef.current = Date.now();
    recognition.start();
  }, []);

  const start = useCallback(async () => {
    if (!getCtor()) return;
    setError(null);
    setInterim("");
    setHeardSomething(false);
    shortRunsRef.current = 0;

    // Ask for the mic first so blocked access fails loudly instead of hanging.
    try {
      const media = navigator.mediaDevices;
      if (media?.getUserMedia) {
        const stream = await media.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setError(
        "Microphone access is blocked here. Allow the mic for this site, or open LiftLog in its own browser tab. You can still type or use your keyboard's mic.",
      );
      return;
    }

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
    teardown();
    setListening(false);
    setInterim("");
  }, [teardown]);

  return { supported, listening, interim, heardSomething, error, start, stop };
}
