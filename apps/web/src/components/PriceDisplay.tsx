export function PriceDisplay({ amount, currency, period }: {
  amount?: string | null; currency?: string | null; period?: string | null;
}) {
  if (!amount || !currency) return <span className="text-slate-400">Price on request</span>;
  const n = Number(amount);
  const formatted = new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);
  const suffix = period === 'monthly' ? '/mo' : period === 'nightly' ? '/night' : period === 'yearly' ? '/yr' : '';
  return (
    <span className="font-semibold text-slate-900">
      {currency} {formatted}<span className="text-slate-500 font-normal">{suffix}</span>
    </span>
  );
}
