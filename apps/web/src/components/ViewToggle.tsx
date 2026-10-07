export type ViewMode = 'list' | 'split' | 'map';

export function ViewToggle({ view, onChange }: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const opts: { value: ViewMode; label: string; icon: string }[] = [
    { value: 'list',  label: 'List',  icon: '☰' },
    { value: 'split', label: 'Split', icon: '▤' },
    { value: 'map',   label: 'Map',   icon: '◎' },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden">
      {opts.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            view === o.value
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="mr-1">{o.icon}</span>
          <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
