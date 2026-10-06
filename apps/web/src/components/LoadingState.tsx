export function LoadingState({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm animate-pulse">
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-200 rounded w-1/3 mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
