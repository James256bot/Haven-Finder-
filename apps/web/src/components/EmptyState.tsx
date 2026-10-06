export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-slate-300 text-6xl mb-4">🏠</div>
      <h3 className="text-lg font-medium text-slate-700">{title}</h3>
      {message && <p className="text-slate-500 mt-1 text-sm">{message}</p>}
    </div>
  );
}
