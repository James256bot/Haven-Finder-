import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SearchBar() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  return (
    <form
      onSubmit={e => { e.preventDefault(); nav(`/search?q=${encodeURIComponent(q)}`); }}
      className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-lg shadow-slate-900/5"
    >
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Try 'apartment in Ntinda' or 'house in Nairobi'"
        className="flex-1 px-4 py-3 rounded-xl outline-none text-slate-900 placeholder:text-slate-400"
      />
      <button
        type="submit"
        className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
      >
        Search
      </button>
    </form>
  );
}
