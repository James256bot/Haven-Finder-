type Props = { state?: string | null; source?: string | null };
type Badge = { label: string; className: string; icon: 'check' | 'shield' | 'tag' | 'flag'; title: string };

function badgeFor(state?: string | null, source?: string | null): Badge {
  if (state === 'verified') return { label: 'Verified', className: 'badge-verified', icon: 'check', title: 'Reviewed and verified by HavenFinder' };
  if (source === 'untera') return { label: 'Broker', className: 'badge-sourced', icon: 'shield', title: 'Licensed brokerages via Untera' };
  if (source === 'jiji') return { label: 'Classifieds', className: 'badge-classified', icon: 'tag', title: 'Peer-to-peer listing' };
  if (source === 'user' || source === 'demo') return { label: 'Direct', className: 'badge-sourced', icon: 'shield', title: 'Listed directly by owner' };
  return { label: 'Unverified', className: 'badge-unverified', icon: 'flag', title: 'Not yet reviewed' };
}

function Icon({ kind }: { kind: Badge['icon'] }) {
  const cls = 'w-3 h-3 flex-shrink-0';
  switch (kind) {
    case 'check':  return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>;
    case 'shield': return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1l7 3v6c0 4.42-2.99 8.36-7 9.5C5.99 18.36 3 14.42 3 10V4l7-3zm3.7 7.7a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd"/></svg>;
    case 'tag':    return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h6a1 1 0 01.7.3l8 8a1 1 0 010 1.4l-6 6a1 1 0 01-1.4 0l-8-8A1 1 0 012 9V3zm4 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>;
    case 'flag':   return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5h2v2H9V5zm0 4h2v6H9V9z" clipRule="evenodd"/></svg>;
  }
}

export function VerificationBadge({ state, source }: Props) {
  const b = badgeFor(state, source);
  return (
    <span className={`badge ${b.className} shadow-sm shadow-slate-900/5 backdrop-blur bg-white/95`} title={b.title}>
      <Icon kind={b.icon} />
      {b.label}
    </span>
  );
}
