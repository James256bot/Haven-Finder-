type Badge = {
  code: string;
  label: string;
  icon: string;
};

type Trust = {
  score?: number;
  label?: 'trusted' | 'caution' | 'risky' | 'unknown';
  badges?: Badge[];
  signals?: any[];
};

const MAX_BADGES = 5;

export function TrustBadge({ trust }: { trust: Trust | null }) {
  if (!trust) return null;

  const badges = (trust.badges ?? []).slice(0, MAX_BADGES);
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(b => (
        <span
          key={b.code}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        >
          <span className="text-sm leading-none">{b.icon}</span>
          <span>{b.label}</span>
        </span>
      ))}
    </div>
  );
}
