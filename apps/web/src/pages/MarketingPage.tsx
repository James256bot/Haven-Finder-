import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

type Post = {
  id: string;
  platform: string;
  content: string;
  hashtags: string[] | null;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
  listing_id: string;
  slug: string;
  title: string;
  main_image_url: string | null;
};

const PLATFORM_STYLE: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-pink-50 text-pink-700', label: 'Instagram' },
  facebook:  { bg: 'bg-blue-50 text-blue-700', label: 'Facebook' },
  twitter:   { bg: 'bg-slate-100 text-slate-700', label: 'X / Twitter' },
  whatsapp:  { bg: 'bg-emerald-50 text-emerald-700', label: 'WhatsApp' },
};

export function MarketingPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const nav = useNavigate();

  const token = () => localStorage.getItem('hf_token') ?? '';

  async function load() {
    try {
      const res = await fetch('/api/me/marketing/posts', { headers: { Authorization: `Bearer ${token()}` } });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setPosts(j.data.posts);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => {
    if (!token()) { nav('/login'); return; }
    load();
  }, [nav]);

  async function regenerate(listingId: string) {
    await fetch(`/api/me/marketing/posts/${listingId}/regenerate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    });
    await load();
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  async function markPublished(id: string) {
    await fetch(`/api/me/marketing/posts/${id}/mark-published`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({}),
    });
    await load();
  }

  // Group by listing
  const grouped = (posts ?? []).reduce<Record<string, Post[]>>((acc, p) => {
    acc[p.listing_id] = acc[p.listing_id] ?? [];
    acc[p.listing_id].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Marketing</h1>
        <p className="text-slate-500 text-sm mt-1">
          Auto-generated posts for your listings — ready to copy to your social media.
        </p>
      </div>

      {error && <EmptyState title="Could not load" message={error} />}
      {!posts && !error && <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)}</div>}

      {posts && posts.length === 0 && (
        <div className="rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700 font-medium">No marketing content yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Publish a listing and HavenFinder will generate posts for you automatically.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([listingId, listingPosts]) => {
          const head = listingPosts[0];
          return (
            <div key={listingId} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex gap-4 p-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                  {head.main_image_url && <img src={head.main_image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{head.title}</p>
                  <p className="text-xs text-slate-500">Listing {listingPosts.length} platform post{listingPosts.length === 1 ? '' : 's'}</p>
                </div>
                <button onClick={() => regenerate(listingId)}
                  className="text-xs text-brand-600 hover:text-brand-700 self-center">
                  Regenerate
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {listingPosts.map(p => {
                  const badge = PLATFORM_STYLE[p.platform] ?? { bg: 'bg-slate-100 text-slate-600', label: p.platform };
                  return (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${badge.bg}`}>{badge.label}</span>
                        <span className="text-xs text-slate-500">
                          {p.status === 'published' ? `Published ${p.published_at ? new Date(p.published_at).toLocaleDateString() : ''}` : p.status}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans bg-slate-50 rounded-lg p-3 border border-slate-100">
                        {p.content}
                      </pre>
                      {p.hashtags && p.hashtags.length > 0 && (
                        <p className="text-xs text-brand-600 break-words">{p.hashtags.join(' ')}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => copy(p.content + '\n\n' + (p.hashtags ?? []).join(' '), p.id)}
                          className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium">
                          {copied === p.id ? 'Copied!' : 'Copy post'}
                        </button>
                        {p.status !== 'published' && (
                          <button
                            onClick={() => markPublished(p.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">
                            Mark as published
                          </button>
                        )}
                        {p.slug && (
                          <a
                            href={`/property/${p.slug}`}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">
                            View listing
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
