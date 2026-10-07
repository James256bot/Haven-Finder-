import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Login failed');
      localStorage.setItem('hf_token', json.data.accessToken);
      nav('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo title="Sign in" url="/login" noindex />
      <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
        {/* Left: brand panel (desktop) */}
        <div className="hidden lg:flex relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-brand-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-3xl" />

          <div className="relative flex flex-col justify-between p-12 w-full">
            <Link to="/" className="flex items-center gap-2.5 w-fit">
              <img
                src="/logo-primary.png"
                alt="HavenFinder"
                className="h-12 w-auto"
              />
            </Link>

            <div>
              <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4">
                Find your haven,<br />
                <span className="text-brand-400">faster.</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                1,000+ verified properties across Uganda, Kenya, and beyond. Save favorites, book viewings, and message owners directly.
              </p>

              <div className="mt-10 space-y-4">
                <Feature icon="shield" text="Verified listings you can trust" />
                <Feature icon="calendar" text="Book viewings in one tap" />
                <Feature icon="message" text="Direct messaging with owners" />
              </div>
            </div>

            <p className="text-sm text-slate-400">Made in Kampala 🇺🇬</p>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <Link to="/" className="flex items-center justify-center lg:hidden mb-8">
              <img src="/logo-primary.png" alt="HavenFinder" className="h-11 w-auto" />
            </Link>

            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
              <p className="text-slate-500 mt-2">Sign in to continue to HavenFinder.</p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm flex items-start gap-2">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8h2v5H9V8zm0-3h2v2H9V5z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link to="/forgot" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Forgot?</Link>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full shadow-sm shadow-brand-600/20"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>

              <p className="text-center text-sm text-slate-500">
                New here?{' '}
                <Link to="/register" className="text-brand-600 hover:text-brand-700 font-semibold">Create an account</Link>
              </p>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                By continuing, you agree to HavenFinder's{' '}
                <Link to="/terms" className="underline hover:text-ink-700">Terms</Link> and{' '}
                <Link to="/privacy" className="underline hover:text-ink-700">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  const icons: Record<string, JSX.Element> = {
    shield: <path d="M12 2 L20 6 V12 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 12 V6 Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10 H21 M8 3 V7 M16 3 V7" /></>,
    message: <path d="M21 12 A8 8 0 1 1 12 4 L21 4 L21 12 Z" />,
  };
  return (
    <div className="flex items-center gap-3 text-slate-200">
      <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icons[icon]}
        </svg>
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}
