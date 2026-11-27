

// ── Helpers ─────────────────────────────────────────────────────
const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// Colour-coded stock badge
const StockBadge = ({ qty }) => {
  const level =
    qty === 0 ? { label: "Out of Stock", cls: "bg-red-900/50 text-red-300 border-red-800" }
    : qty <= 10 ? { label: "Low Stock",  cls: "bg-amber-900/50 text-amber-300 border-amber-800" }
    :             { label: "In Stock",   cls: "bg-emerald-900/50 text-emerald-300 border-emerald-800" };

  return (
    <span className={`badge border ${level.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
      {level.label}
    </span>
  );
};

// Category pill
const CategoryPill = ({ name }) => (
  <span className="badge bg-indigo-900/40 text-indigo-300 border border-indigo-800/60">
    {name}
  </span>
);

// ── Card ────────────────────────────────────────────────────────
export default function InventoryCard({ item, index }) {
  const totalValue = (item.price * item.quantity).toFixed(2);

  return (
    <div
      className="
        card p-5 flex flex-col gap-4
        hover:border-indigo-500/40 hover:shadow-[0_8px_40px_rgba(99,102,241,0.15)]
        transition-all duration-300 group animate-fade-up
      "
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* ── Top row: name + badges ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="
            font-display text-base font-semibold text-slate-100 leading-snug
            group-hover:text-indigo-200 transition-colors duration-200
            truncate
          ">
            {item.product_name}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5 tracking-wider uppercase">
            {item.sku}
          </p>
        </div>
        <StockBadge qty={item.quantity} />
      </div>

      {/* ── Description ── */}
      {item.description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
          {item.description}
        </p>
      )}

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="bg-surface rounded-lg p-3 text-center border border-surface-border">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Price</p>
          <p className="text-sm font-semibold text-emerald-400">{formatCurrency(item.price)}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center border border-surface-border">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Qty</p>
          <p className="text-sm font-semibold text-slate-200">{item.quantity.toLocaleString()}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center border border-surface-border">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Value</p>
          <p className="text-sm font-semibold text-indigo-300">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* ── Footer: category + supplier ── */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border">
        <CategoryPill name={item.category || "General"} />
        {item.supplier && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            {/* Supplier dot */}
            <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700
              flex items-center justify-center text-indigo-300 font-bold text-[10px]">
              {item.supplier.name?.[0] ?? "?"}
            </span>
            {item.supplier.name}
          </span>
        )}
      </div>
    </div>
  );
}
