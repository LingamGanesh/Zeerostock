

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);


const ValueBar = ({ value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};


const GroupRow = ({ group, rank, maxValue }) => (
  <div
    className="
      card p-4 flex items-center gap-4
      hover:border-indigo-500/30 transition-all duration-300
      animate-fade-up
    "
    style={{ animationDelay: `${rank * 0.07}s` }}
  >
    {/* Rank badge */}
    <div className={`
      flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
      font-display font-bold text-sm
      ${rank === 0
        ? "bg-gradient-to-br from-amber-500 to-yellow-400 text-amber-900"
        : rank === 1
        ? "bg-gradient-to-br from-slate-400 to-slate-300 text-slate-800"
        : rank === 2
        ? "bg-gradient-to-br from-orange-700 to-orange-500 text-orange-100"
        : "bg-surface border border-surface-border text-slate-400"
      }
    `}>
      {rank + 1}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-display font-semibold text-slate-100 truncate">{group.supplierName}</p>
        <p className="text-emerald-400 font-semibold text-sm ml-2 flex-shrink-0">
          {formatCurrency(group.totalValue)}
        </p>
      </div>
      <ValueBar value={group.totalValue} max={maxValue} />
      <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
        <span>{group.totalItems} SKU{group.totalItems !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{group.totalUnits?.toLocaleString()} units</span>
        {group.supplierEmail && (
          <>
            <span>·</span>
            <span className="truncate">{group.supplierEmail}</span>
          </>
        )}
      </div>
    </div>
  </div>
);

// ── Main Export ────────────────────────────────────────────────
export default function GroupedView({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center text-slate-500 py-10 text-sm">
        No grouped data available.
      </p>
    );
  }

  const maxValue = data[0]?.totalValue ?? 1; 

  return (
    <div className="flex flex-col gap-3">
      {data.map((group, i) => (
        <GroupRow key={group.supplierId} group={group} rank={i} maxValue={maxValue} />
      ))}
    </div>
  );
}
