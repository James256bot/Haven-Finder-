type Trust = {
  score: number;
  label: 'trusted' | 'caution' | 'risky' | 'unknown';
  signals: { code: string; label: string; severity: string; scoreDelta: number }[];
};

export function TrustBadge({ trust }: { trust: Trust | null }) {
  if (!trust || trust.label === 'unknown') return null;

  const styles = {
    trusted:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    caution:  'bg-amber-50 text-amber-700 ring-amber-200',
    risky:    'bg-red-50 text-red-700 ring-red-200',
    unknown:  'bg-ink-50 text-ink-600 ring-ink-200',
  };
  const labels = { trusted: 'High Trust', caution: 'Some Caution', risky: 'Use Caution', unknown: 'Not Rated' };
  const icons = { trusted: '✓', caution: '!', risky: '⚠', unknown: '?' };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${styles[trust.label]}`}>
      <span className="text-base leading-none">{icons[trust.label]}</span>
      <span>{labels[trust.label]}</span>
      <span className="text-xs opacity-70">· {trust.score}/100</span>
    </div>
  );
}
