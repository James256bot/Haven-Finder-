import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const pw = form.password;
  const pwStrength = 
    pw.length < 8 ? 0 :
    pw.length < 12 ? 1 :
    /[A-Z]/.test(pw) && /[0-9]/.test(pw) ? 3 : 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Registration failed');
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
      <Seo title="Create account" url="/register" noindex />
      <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
        {/* Left: form */}
        <div className="order-2 lg:order-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <Link to="/" className="flex items-center justify-center lg:hidden mb-8">
              <img src="/logo-primary.png" alt="HavenFinder" className="h-11 w-auto" />
            </Link>

            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create your account</h1>
              <p className="text-slate-500 mt-2">Save favorites, request viewings, list properties.</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Full name</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Jane Doe"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="input"
                />

                {/* Strength meter */}
                {form.password && (
                  <div className="mt-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          i < pwStrength + 1
                            ? pwStrength >= 3 ? 'bg-emerald-500'
                            : pwStrength === 2 ? 'bg-amber-500'
                            : 'bg-red-400'
                            : 'bg-slate-200'
                        }`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {pwStrength >= 3 ? 'Strong password'
                        : pwStrength === 2 ? 'Good — add an uppercase letter and number for strong'
                        : 'Weak — use at least 8 characters'}
                    </p>
                  </div>
                )}
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
                    Creating account…
                  </>
                ) : 'Create account'}
              </button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Sign in</Link>
              </p>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                By signing up, you agree to HavenFinder's{' '}
                <Link to="/terms" className="underline hover:text-ink-700">Terms</Link> and{' '}
                <Link to="/privacy" className="underline hover:text-ink-700">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Right: brand panel (desktop) */}
        <div className="order-1 lg:order-2 hidden lg:flex relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-3xl" />

          <div className="relative flex flex-col justify-between p-12 w-full">
            <Link to="/" className="flex items-center gap-2.5 w-fit self-end">
              <img
                src="/logo-primary.png"
                alt="HavenFinder"
                className="h-12 w-auto"
              />
            </Link>

            <div>
              <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4">
                Your next home is<br />
                <span className="text-brand-400">one search away.</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                Join thousands of renters, buyers, and owners using HavenFinder every day.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Stat value="1,150" label="listings" />
              <Stat value="10" label="countries" />
              <Stat value="438" label="cities" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
