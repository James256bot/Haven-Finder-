import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognition(): SpeechRecognition | null {
  const w = window as any;
  const Ctor: SpeechRecognitionConstructor | undefined =
    w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = false;
  r.interimResults = true;
  r.lang = navigator.language || 'en-US';
  return r;
}

export function useVoiceInput(onFinal?: (text: string) => void) {
  const [supported] = useState(() => !!getRecognition());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      try { ref.current?.abort(); } catch {}
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    setTranscript('');
    const r = getRecognition();
    if (!r) { setError('Voice input not supported on this browser'); return; }
    ref.current = r;

    r.onresult = (e: any) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      setTranscript(final || interim);
      if (final) onFinal?.(final.trim());
    };

    r.onerror = (e: any) => {
      setError(e.error === 'not-allowed' ? 'Microphone permission denied' : `Voice error: ${e.error}`);
      setListening(false);
    };

    r.onend = () => setListening(false);

    try {
      r.start();
      setListening(true);
    } catch (e: any) {
      setError(e.message);
      setListening(false);
    }
  }, [onFinal]);

  const stop = useCallback(() => {
    try { ref.current?.stop(); } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
