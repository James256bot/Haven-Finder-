import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function SearchBar() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [errMsg, setErrMsg] = useState<string>('');
  const nav = useNavigate();
  const debounceRef = useRef<number | null>(null);
  const recRef = useRef<any>(null);

  // Debounced parse preview (kept for future UI, silent on error)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.length < 6) return;
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        await fetch(`${API}/ai/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        });
      } catch {}
      finally { setLoading(false); }
    }, 400);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q]);

  const submitQuery = useCallback((query: string) => {
    if (!query.trim()) return;
    nav(`/search?q=${encodeURIComponent(query)}&raw=${encodeURIComponent(query)}`);
  }, [nav]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    submitQuery(q);
  }

  const handleMicClick = useCallback(() => {
    setErrMsg('');

    // If currently listening, stop
    if (listening && recRef.current) {
      try { recRef.current.stop(); } catch {}
      return;
    }

    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setErrMsg('Voice search not supported on this browser. Try Chrome or type instead.');
      return;
    }

    const rec = new SR();
    recRef.current = rec;
    rec.lang = navigator.language || 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setErrMsg('');
    };

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setQ(text);
    };

    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setErrMsg('Microphone blocked. Tap the 🔒 in the URL bar → Permissions → allow Microphone, then try again.');
      } else if (e.error === 'no-speech') {
        setErrMsg('No speech detected. Try again.');
      } else if (e.error === 'audio-capture') {
        setErrMsg('No microphone found.');
      } else if (e.error === 'network') {
        setErrMsg('Network error — voice needs an internet connection.');
      } else {
        setErrMsg(`Mic error: ${e.error ?? 'unknown'}`);
      }
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      // Auto-submit if we captured something
      setQ(current => {
        const trimmed = current.trim();
        if (trimmed) {
          setTimeout(() => submitQuery(trimmed), 350);
        }
        return current;
      });
    };

    try {
      rec.start();
    } catch (e: any) {
      setListening(false);
      setErrMsg(`Mic start failed: ${e.message}`);
    }
  }, [listening, submitQuery]);

  return (
    <div className="relative">
      <form
        onSubmit={submit}
        className={`relative flex items-center bg-white rounded-2xl p-2 shadow-xl ring-1 transition-all ${
          focused ? 'ring-blue-400 ring-2' : 'ring-ink-900/5'
        }`}
      >
        <div className="pl-3 pr-2 text-ink-400 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3 L13.5 9 L19.5 10.5 L13.5 12 L12 18 L10.5 12 L4.5 10.5 L10.5 9 Z" />
          </svg>
        </div>

        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 250)}
          placeholder={listening ? 'Listening… speak now' : "Try 'furnished 2 bedroom apartment in Ntinda under 1.5M'"}
          className="flex-1 py-3.5 pr-2 outline-none bg-transparent text-ink-900 placeholder:text-ink-400 text-base font-medium min-w-0"
          readOnly={listening}
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={handleMicClick}
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mr-1 transition-colors ${
            listening
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          aria-label={listening ? 'Stop recording' : 'Voice search'}
          title={listening ? 'Stop recording' : 'Voice search'}
        >
          {listening ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11 V12 A7 7 0 0 0 19 12 V11" />
              <path d="M12 19 V22" />
            </svg>
          )}
        </button>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label="Search"
          title="Search"
        >
          {loading ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </button>
      </form>

      {/* Error message below the search bar */}
      {errMsg && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errMsg}
        </div>
      )}

      {/* Listening indicator */}
      {listening && (
        <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Listening… tap the mic again to stop
        </div>
      )}
    </div>
  );
}
