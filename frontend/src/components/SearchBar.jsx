

import { useState } from "react";

// ── Icons (inline SVG to avoid extra dependencies) ──────────────
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3 4h18M7 12h10M11 20h2" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ────────────────────────────────────────────────────────────────
export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery]       = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Build params and call parent handler
  const handleSearch = (e) => {
    e?.preventDefault();
    onSearch({
      product_name: query.trim(),
      minPrice: minPrice !== "" ? minPrice : undefined,
      maxPrice: maxPrice !== "" ? maxPrice : undefined,
    });
  };

  // Reset all fields and re-fetch everything
  const handleClear = () => {
    setQuery("");
    setMinPrice("");
    setMaxPrice("");
    onSearch({});  // empty params → backend returns all items
  };

  const hasFilters = query || minPrice || maxPrice;

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: "0.1s" }}>
      <form onSubmit={handleSearch} className="flex flex-col gap-3">

        {/* ── Main search row ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            {/* Leading search icon */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
              <SearchIcon />
            </span>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products — e.g. MacBook, Headphones…"
              className="
                w-full pl-11 pr-4 py-3.5 rounded-xl
                bg-surface-card border border-surface-border
                text-slate-100 placeholder-slate-500 font-body text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500
                transition-all duration-200
              "
            />
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            title="Toggle price filters"
            className={`
              px-4 py-3.5 rounded-xl border font-body text-sm font-medium
              flex items-center gap-2 transition-all duration-200
              ${showFilters
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-surface-card border-surface-border text-slate-400 hover:text-indigo-300 hover:border-indigo-500/50"
              }
            `}
          >
            <FilterIcon />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Search button */}
          <button
            type="submit"
            disabled={loading}
            className="
              px-6 py-3.5 rounded-xl font-body font-semibold text-sm
              bg-gradient-to-r from-indigo-600 to-indigo-500
              hover:from-indigo-500 hover:to-indigo-400
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white shadow-lg shadow-indigo-900/40
              transition-all duration-200 active:scale-[0.98]
            "
          >
            {loading ? "…" : "Search"}
          </button>

          {/* Clear button — only visible when something is typed */}
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear search"
              className="
                px-3.5 py-3.5 rounded-xl border border-surface-border
                bg-surface-card text-slate-400 hover:text-red-400 hover:border-red-500/40
                transition-all duration-200
              "
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* ── Price filter panel (collapsible) ── */}
        {showFilters && (
          <div className="
            flex flex-col sm:flex-row gap-3 p-4 rounded-xl
            bg-surface-card border border-surface-border
            animate-fade-up
          ">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
                Min Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="
                  w-full px-4 py-2.5 rounded-lg
                  bg-surface border border-surface-border
                  text-slate-100 placeholder-slate-600 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                  transition-all duration-200
                "
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
                Max Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 100000"
                className="
                  w-full px-4 py-2.5 rounded-lg
                  bg-surface border border-surface-border
                  text-slate-100 placeholder-slate-600 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                  transition-all duration-200
                "
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium text-sm
                  bg-indigo-600 hover:bg-indigo-500 text-white
                  disabled:opacity-50 transition-all duration-200
                "
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
