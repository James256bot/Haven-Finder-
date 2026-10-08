import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'https://havenfinderapi-production.up.railway.app';

export function SearchBar() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const debounceRef = useRef<number | null>(null);

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

  async function submitQuery(query: string) {
    if (!query.trim()) return;
    nav(`/search?q=${encodeURIComponent(query)}&raw=${encodeURIComponent(query)}`);
  }

  const handleMicClick = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice search is not supported on this browser. Try typing instead.');
      return;
    }
    const rec = new SR();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setQ(text);
    };

    rec.onend = () => {
      setQ(current => {
        if (current.trim()) setTimeout(() => submitQuery(current), 300);
        return current;
      });
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        alert('Microphone permission denied.');
      }
    };

    try { rec.start(); } catch (e: any) { alert('Mic error: ' + e.message); }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    submitQuery(q);
  }

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
          placeholder="Try 'furnished 2 bedroom apartment in Ntinda under 1.5M'"
          className="flex-1 py-3.5 pr-2 outline-none bg-transparent text-ink-900 placeholder:text-ink-400 text-base font-medium"
        />

        <button
          type="button"
          onClick={handleMicClick}
          className="w-11 h-11 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center flex-shrink-0 mr-1 transition-colors"
          aria-label="Voice search"
          title="Voice search"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11 V12 A7 7 0 0 0 19 12 V11" />
            <path d="M12 19 V22" />
          </svg>
        </button>

        
      </form>
    </div>
  );
}
