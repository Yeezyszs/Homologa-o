export function EmConstrucao({ titulo, milestone }: { titulo: string; milestone: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold text-slate-800">{titulo}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
        Em construção — {milestone}.
      </div>
    </div>
  )
}
