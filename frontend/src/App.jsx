

import { useState, useEffect, useCallback } from "react";
import SearchBar    from "./components/SearchBar.jsx";
import InventoryCard from "./components/InventoryCard.jsx";
import GroupedView  from "./components/GroupedView.jsx";
import Spinner      from "./components/Spinner.jsx";


const API = "";  

// ── Currency helper ───────────────────────────────────────────
const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Tab config ────────────────────────────────────────────────
const TABS = [
  { id: "all",     label: "All Inventory" },
  { id: "search",  label: "Search"        },
  { id: "grouped", label: "By Supplier"   },
];

// ── Stats bar (summary numbers) ───────────────────────────────
function StatsBar({ items }) {
  if (!items.length) return null;
  const totalValue  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalUnits  = items.reduce((s, i) => s + i.quantity, 0);
  const categories  = new Set(items.map((i) => i.category)).size;
  const suppliers   = new Set(items.map((i) => i.supplier?._id).filter(Boolean)).size;

  const stats = [
    { label: "Total SKUs",    value: items.length                  },
    { label: "Total Units",   value: totalUnits.toLocaleString()   },
    { label: "Portfolio Value", value: formatCurrency(totalValue)  },
    { label: "Categories",    value: categories                    },
    { label: "Suppliers",     value: suppliers                     },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
      {stats.map((s) => (
        <div key={s.label} className="card px-4 py-3 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{s.label}</p>
          <p className="font-display text-lg font-semibold text-slate-100">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ message = "No results found" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-up">
      {/* Hollow box icon */}
      <svg className="w-14 h-14 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM3 7l9-4 9 4" />
      </svg>
      <p className="text-slate-400 font-display text-xl">{message}</p>
      <p className="text-slate-600 text-sm">Try adjusting your search or filters</p>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message }) {
  return (
    <div className="card border-red-800/60 bg-red-950/30 px-5 py-4 flex items-center gap-3 animate-fade-up">
      <span className="text-red-400 text-lg">⚠</span>
      <div>
        <p className="text-red-300 font-medium text-sm">Failed to connect to API</p>
        <p className="text-red-400/70 text-xs mt-0.5">{message}</p>
        <p className="text-slate-500 text-xs mt-1">
          Make sure the backend is running: <code className="font-mono text-slate-400">npm run dev</code> in <code className="font-mono text-slate-400">/backend</code>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,   setActiveTab]   = useState("all");
  const [allItems,    setAllItems]    = useState([]);
  const [searchItems, setSearchItems] = useState([]);
  const [grouped,     setGrouped]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [searched,    setSearched]    = useState(false); // track if user ran a search

  // ── Fetch all inventory ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/inventory`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAllItems(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch grouped supplier data ───────────────────────────
  const fetchGrouped = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/inventory/grouped`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setGrouped(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Handle search submission ──────────────────────────────
  const handleSearch = async (params) => {
    setLoading(true);
    setError(null);
    setSearched(true);

    // Build query string from params
    const qs = new URLSearchParams();
    if (params.product_name) qs.set("product_name", params.product_name);
    if (params.minPrice !== undefined) qs.set("minPrice", params.minPrice);
    if (params.maxPrice !== undefined) qs.set("maxPrice", params.maxPrice);

    // If all params empty, reset to all items
    if (!params.product_name && params.minPrice === undefined && params.maxPrice === undefined) {
      setSearched(false);
      setSearchItems([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/inventory/search?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSearchItems(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Load data on tab switch ───────────────────────────────
  useEffect(() => {
    if (activeTab === "all")     fetchAll();
    if (activeTab === "grouped") fetchGrouped();
    if (activeTab === "search")  { setSearched(false); setSearchItems([]); }
  }, [activeTab, fetchAll, fetchGrouped]);

  // ── Tab change helper ─────────────────────────────────────
  const switchTab = (id) => {
    setError(null);
    setActiveTab(id);
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-body">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold gradient-text tracking-tight">
              Zeerostock
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Inventory Management System</p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            Live
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* ── Page heading ── */}
        <div className="animate-fade-up">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-100 leading-tight">
            Your <span className="gradient-text">Inventory</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Manage stock, track suppliers, and analyse your portfolio in one place.
          </p>
        </div>

        {/* ── Stats bar (only on All tab) ── */}
        {activeTab === "all" && !loading && !error && (
          <StatsBar items={allItems} />
        )}

        {/* ── Tab navigation ── */}
        <nav className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit animate-fade-up"
          style={{ animationDelay: "0.08s" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`
                px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
                  : "text-slate-400 hover:text-slate-200"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Error banner ── */}
        {error && <ErrorBanner message={error} />}

        {/* ══════════════════════════════════════════════════════
            TAB: ALL INVENTORY
        ══════════════════════════════════════════════════════ */}
        {activeTab === "all" && (
          <section>
            {loading ? (
              <Spinner message="Fetching inventory…" />
            ) : error ? null : allItems.length === 0 ? (
              <EmptyState message="No inventory items found" />
            ) : (
              <>
                <p className="text-xs text-slate-600 mb-4">
                  Showing {allItems.length} item{allItems.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allItems.map((item, i) => (
                    <InventoryCard key={item._id} item={item} index={i} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: SEARCH
        ══════════════════════════════════════════════════════ */}
        {activeTab === "search" && (
          <section className="flex flex-col gap-6">
            <SearchBar onSearch={handleSearch} loading={loading} />

            {loading ? (
              <Spinner message="Searching products…" />
            ) : error ? null : !searched ? (
              /* Prompt state – before first search */
              <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-indigo-900/30 border border-indigo-800/40
                  flex items-center justify-center text-3xl">
                  🔍
                </div>
                <p className="text-slate-400 font-display text-xl">Search your inventory</p>
                <p className="text-slate-600 text-sm">Enter a product name or set a price range above</p>
              </div>
            ) : searchItems.length === 0 ? (
              <EmptyState message="No results found" />
            ) : (
              <>
                <p className="text-xs text-slate-600">
                  {searchItems.length} result{searchItems.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchItems.map((item, i) => (
                    <InventoryCard key={item._id} item={item} index={i} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: GROUPED BY SUPPLIER
        ══════════════════════════════════════════════════════ */}
        {activeTab === "grouped" && (
          <section>
            <div className="flex items-center justify-between mb-4 animate-fade-up">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-200">
                  Portfolio Value by Supplier
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by total stock value (price × quantity)
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner message="Aggregating data…" />
            ) : error ? null : (
              <GroupedView data={grouped} />
            )}
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-surface-border py-6 text-center">
        <p className="text-xs text-slate-700 font-body">
          © 2024 Zeerostock · Inventory Management System · Built with React + Express + MongoDB
        </p>
      </footer>
    </div>
  );
}
