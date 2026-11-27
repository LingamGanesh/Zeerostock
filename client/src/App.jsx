import { useCallback, useEffect, useState } from "react";
import InventoryCard from "./components/InventoryCard.jsx";
import Spinner from "./components/Spinner.jsx";
import { getInventory, login, logout, refreshSession } from "./lib/api.js";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value) || 0);

function LoginPanel({ onLogin, busy, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <form onSubmit={(event) => { event.preventDefault(); onLogin(email, password); }}
        className="card w-full max-w-md p-8 flex flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Zeerostock workspace</p>
          <h1 className="font-display text-3xl font-bold text-slate-100 mt-2">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-2">Sign in with your administrator or manager account.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-lg p-3">{error}</p>}
        <label className="text-sm text-slate-300 flex flex-col gap-2">
          Email address
          <input required type="email" autoComplete="username" value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg bg-surface border border-surface-border px-3 py-3 text-slate-100 outline-none focus:border-indigo-500" />
        </label>
        <label className="text-sm text-slate-300 flex flex-col gap-2">
          Password
          <input required type="password" autoComplete="current-password" value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg bg-surface border border-surface-border px-3 py-3 text-slate-100 outline-none focus:border-indigo-500" />
        </label>
        <button disabled={busy} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const result = await getInventory({ q: search, page: 1, limit: 50 });
      setItems(result.data?.items || []);
      setPagination(result.data?.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    refreshSession().then((restoredUser) => {
      if (!active) return;
      if (restoredUser) setUser(restoredUser);
      setAuthReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (user && ["admin", "manager"].includes(user.role)) loadInventory();
  }, [user, loadInventory]);

  const handleLogin = async (email, password) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const signedInUser = await login(email, password);
      setUser(signedInUser);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setItems([]);
  };

  if (!authReady) return <div className="min-h-screen flex items-center justify-center"><Spinner message="Restoring secure session…" /></div>;
  if (!user) return <LoginPanel onLogin={handleLogin} busy={authBusy} error={authError} />;

  if (!["admin", "manager"].includes(user.role)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl text-slate-100">Access restricted</h1>
          <p className="text-slate-400 mt-3">Your account is signed in, but inventory management requires an administrator or manager role.</p>
          <button onClick={handleLogout} className="mt-6 rounded-lg bg-indigo-600 px-5 py-2 text-white">Sign out</button>
        </div>
      </main>
    );
  }

  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const lowStock = items.filter((item) => Number(item.quantity) <= 5).length;

  const submitSearch = (event) => {
    event.preventDefault();
    loadInventory(query);
  };

  return (
    <div className="min-h-screen font-body">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold gradient-text">Zeerostock</h1>
            <p className="text-xs text-slate-500">Inventory management workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">{user.name} · {user.role}</span>
            <button onClick={handleLogout} className="text-sm rounded-lg border border-surface-border px-3 py-2 text-slate-300 hover:text-white">Sign out</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Overview</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-100 mt-2">Inventory <span className="gradient-text">dashboard</span></h2>
          <p className="text-slate-400 mt-2">Monitor stock levels, product value and inventory records.</p>
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">SKUs shown</p><p className="font-display text-2xl text-slate-100 mt-2">{pagination?.total ?? items.length}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Units on hand</p><p className="font-display text-2xl text-slate-100 mt-2">{totalUnits.toLocaleString("en-IN")}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Value shown</p><p className="font-display text-2xl text-emerald-300 mt-2">{money(totalValue)}</p><p className="text-xs text-slate-500 mt-1">{lowStock} low-stock items on this page</p></div>
        </section>
        <section className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div><h3 className="font-display text-xl text-slate-100">Product inventory</h3><p className="text-sm text-slate-500 mt-1">Search by product name or SKU</p></div>
          <form onSubmit={submitSearch} className="flex gap-2 w-full sm:w-auto">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU"
              className="min-w-0 flex-1 sm:w-72 rounded-lg bg-surface border border-surface-border px-3 py-2 text-slate-100 outline-none focus:border-indigo-500" />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Search</button>
            <button type="button" onClick={() => { setQuery(""); loadInventory(""); }} className="rounded-lg border border-surface-border px-3 py-2 text-slate-300">Reset</button>
          </form>
        </section>
        {error && <div role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>}
        {loading ? <Spinner message="Loading inventory…" /> : error ? null : items.length === 0 ? (
          <div className="card p-12 text-center"><p className="font-display text-xl text-slate-200">No inventory records found</p><p className="text-sm text-slate-500 mt-2">Try another search or add products through the inventory API.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => <InventoryCard key={item._id} item={item} index={index} />)}
          </div>
        )}
        <p className="text-xs text-slate-600">Showing up to 50 records per request. Use search to locate a product.</p>
      </main>
    </div>
  );
}
