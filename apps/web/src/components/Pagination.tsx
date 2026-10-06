export function Pagination({ total, limit, offset, onChange }: {
  total: number; limit: number; offset: number;
  onChange: (newOffset: number) => void;
}) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between pt-8">
      <button
        disabled={page <= 1}
        onClick={() => onChange(Math.max(0, offset - limit))}
        className="px-4 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50"
      >
        ← Previous
      </button>
      <span className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(offset + limit)}
        className="px-4 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50"
      >
        Next →
      </button>
    </div>
  );
}
