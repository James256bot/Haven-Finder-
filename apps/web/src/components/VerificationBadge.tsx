type Props = {
  state?: string | null;         // 'verified' | 'unverified' | 'pending' | 'suspended'
  source?: string | null;        // 'untera' | 'jiji' | 'kcca' | 'osm' | null
};

type Badge = { label: string; bg: string; fg: string; icon: 'check' | 'shield' | 'tag' | 'flag' | 'clock' | 'ban'; title: string };

function badgeFor(state?: string | null, source?: string | null): Badge {
  // Priority 1 — admin verified
  if (state === 'verified') {
    return { label: 'Verified', bg: 'bg-emerald-50', fg: 'text-emerald-700',
      icon: 'check', title: 'Reviewed and verified by HavenFinder' };
  }

  // Priority 2 — suspended
  if (state === 'suspended') {
    return { label: 'Suspended', bg: 'bg-red-50', fg: 'text-red-700',
      icon: 'ban', title: 'This listing has been suspended' };
  }

  // Priority 3 — pending admin review
  if (state === 'pending') {
    return { label: 'Pending', bg: 'bg-amber-50', fg: 'text-amber-700',
      icon: 'clock', title: 'Awaiting review' };
  }

  // Priority 4 — sourced from external provider (distinct per source)
  if (source === 'untera') {
    return { label: 'Broker Network', bg: 'bg-sky-50', fg: 'text-sky-700',
      icon: 'shield', title: 'Data from licensed real estate brokerages via Untera' };
  }
  if (source === 'kcca') {
    return { label: 'Official', bg: 'bg-indigo-50', fg: 'text-indigo-700',
      icon: 'shield', title: 'Official KCCA property registry' };
  }
  if (source === 'jiji') {
    return { label: 'Classifieds', bg: 'bg-amber-50', fg: 'text-amber-700',
      icon: 'tag', title: 'Peer-to-peer listing from Jiji Uganda — verify before visiting' };
  }
  if (source === 'osm') {
    return { label: 'OpenStreetMap', bg: 'bg-slate-100', fg: 'text-slate-600',
      icon: 'flag', title: 'Data from OpenStreetMap' };
  }
  if (source) {
    return { label: 'Sourced', bg: 'bg-sky-50', fg: 'text-sky-700',
      icon: 'shield', title: `Data from ${source}` };
  }

  // Default
  return { label: 'Unverified', bg: 'bg-slate-100', fg: 'text-slate-500',
    icon: 'flag', title: 'Not yet reviewed' };
}

function Icon({ kind }: { kind: Badge['icon'] }) {
  const cls = 'w-3 h-3 flex-shrink-0';
  switch (kind) {
    case 'check':
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>;
    case 'shield':
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1l7 3v6c0 4.42-2.99 8.36-7 9.5C5.99 18.36 3 14.42 3 10V4l7-3zm3.7 7.7a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd"/></svg>;
    case 'tag':
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h6a1 1 0 01.7.3l8 8a1 1 0 010 1.4l-6 6a1 1 0 01-1.4 0l-8-8A1 1 0 012 9V3zm4 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>;
    case 'flag':
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5h2v2H9V5zm0 4h2v6H9V9z" clipRule="evenodd" fillRule="evenodd"/></svg>;
    case 'clock':
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11v3.586l2.207 2.207-1.414 1.414L9 11.414V7h2z" clipRule="evenodd"/></svg>;
    case 'ban':
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11a6 6 0 017.367 8.366zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/></svg>;
  }
}

export function VerificationBadge({ state, source }: Props) {
  const b = badgeFor(state, source);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${b.bg} ${b.fg} px-2 py-0.5 text-[11px] font-medium whitespace-nowrap`}
      title={b.title}
    >
      <Icon kind={b.icon} />
      {b.label}
    </span>
  );
}
