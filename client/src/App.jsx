import { useCallback, useEffect, useState } from "react";
import InventoryCard from "./components/InventoryCard.jsx";
import Spinner from "./components/Spinner.jsx";
import {
  adjustInventory,
  archiveInventory,
  createInventory,
  getInventory,
  getInventoryMovements,
  getSuppliers,
  login,
  logout,
  refreshSession,
  updateInventory,
} from "./lib/api.js";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value) || 0);

const emptyProduct = {
  product_name: "", sku: "", category: "General", quantity: "0",
  price: "", supplier: "", description: "",
};

function Field({ label, children }) {
  return <label className="text-sm text-slate-300 flex flex-col gap-2">{label}{children}</label>;
}

function TextInput(props) {
  return <input {...props} className={`w-full rounded-lg bg-surface border border-surface-border px-3 py-2.5 text-slate-100 outline-none focus:border-indigo-500 ${props.className || ""}`} />;
}

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
        <Field label="Email address"><TextInput required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Password"><TextInput required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <button disabled={busy} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}

function ProductDialog({ item, suppliers, onClose, onSave, busy, error }) {
  const editing = Boolean(item);
  const [form, setForm] = useState(() => item ? {
    product_name: item.product_name || "",
    category: item.category || "General",
    price: String(item.price ?? ""),
    supplier: item.supplier?._id || item.supplier || "",
    description: item.description || "",
  } : emptyProduct);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto" role="presentation">
      <form onSubmit={(event) => { event.preventDefault(); onSave(form); }}
        className="card w-full max-w-2xl p-6 sm:p-7 flex flex-col gap-4 my-auto" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs uppercase tracking-widest text-indigo-300">{editing ? "Update catalogue" : "New catalogue entry"}</p>
            <h2 id="product-dialog-title" className="font-display text-2xl text-slate-100 mt-1">{editing ? "Edit product" : "Add product"}</h2></div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl" aria-label="Close">×</button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product name"><TextInput required minLength={2} maxLength={150} value={form.product_name} onChange={(e) => set("product_name", e.target.value)} /></Field>
          {!editing && <Field label="SKU"><TextInput required minLength={2} maxLength={64} value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} /></Field>}
          <Field label="Category"><TextInput required minLength={2} maxLength={80} value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
          <Field label="Unit price (INR)"><TextInput required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
          {!editing && <Field label="Opening quantity"><TextInput required type="number" min="0" step="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>}
          <Field label="Supplier">
            <select required value={form.supplier} onChange={(e) => set("supplier", e.target.value)} className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2.5 text-slate-100 outline-none focus:border-indigo-500">
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.country || "India"}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description (optional)"><textarea rows={3} maxLength={500} value={form.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2.5 text-slate-100 outline-none focus:border-indigo-500" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-surface-border px-4 py-2 text-slate-300">Cancel</button>
          <button disabled={busy || suppliers.length === 0} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 font-semibold text-white">{busy ? "Saving…" : editing ? "Save changes" : "Create product"}</button>
        </div>
        {!suppliers.length && <p className="text-xs text-amber-300">No suppliers exist yet. Add a supplier before creating an inventory item.</p>}
      </form>
    </div>
  );
}

function StockDialog({ item, onClose, onSave, busy, error }) {
  const [direction, setDirection] = useState("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center" role="presentation">
      <form onSubmit={(event) => { event.preventDefault(); onSave({ direction, quantity, reason, reference }); }}
        className="card w-full max-w-md p-6 flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby="stock-dialog-title">
        <div className="flex justify-between"><div><p className="text-xs uppercase tracking-widest text-indigo-300">Stock control</p><h2 id="stock-dialog-title" className="font-display text-2xl text-slate-100 mt-1">Adjust quantity</h2><p className="text-sm text-slate-400 mt-1">{item.product_name} · Current: {item.quantity}</p></div><button type="button" onClick={onClose} className="text-slate-400 text-xl" aria-label="Close">×</button></div>
        {error && <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-lg p-3">{error}</p>}
        <Field label="Adjustment type"><select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2.5 text-slate-100"><option value="in">Stock received (+)</option><option value="out">Stock issued (−)</option><option value="set">Set exact quantity</option></select></Field>
        <Field label={direction === "set" ? "New total quantity" : "Quantity"}><TextInput required type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
        <Field label="Reason"><TextInput required minLength={3} maxLength={250} placeholder="e.g. Purchase order received" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Field label="Reference (optional)"><TextInput maxLength={100} placeholder="Invoice or purchase order number" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-surface-border px-4 py-2 text-slate-300">Cancel</button><button disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Updating…" : "Apply adjustment"}</button></div>
      </form>
    </div>
  );
}

function MovementsDialog({ item, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getInventoryMovements(item._id, { page: 1, limit: 50 })
      .then((result) => { if (active) setMovements(result.data?.movements || []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item._id]);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center" role="presentation">
      <section className="card w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6" role="dialog" aria-modal="true" aria-labelledby="movement-title">
        <div className="flex justify-between items-start gap-4 mb-5"><div><p className="text-xs uppercase tracking-widest text-indigo-300">Audit trail</p><h2 id="movement-title" className="font-display text-2xl text-slate-100 mt-1">Stock movements</h2><p className="text-sm text-slate-400">{item.product_name} · {item.sku}</p></div><button onClick={onClose} className="text-slate-400 text-xl" aria-label="Close">×</button></div>
        {loading ? <Spinner message="Loading movement history…" /> : error ? <p role="alert" className="text-red-300">{error}</p> : movements.length === 0 ? <p className="text-slate-400 py-8 text-center">No stock movements recorded for this product yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs uppercase text-slate-500 border-b border-surface-border"><tr><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Change</th><th className="py-3 pr-3">Balance</th><th className="py-3 pr-3">Reason</th><th className="py-3">By / Date</th></tr></thead><tbody>
            {movements.map((movement) => <tr key={movement._id} className="border-b border-surface-border/70"><td className="py-3 pr-3"><span className={`badge ${movement.movementType === "in" ? "bg-emerald-900/50 text-emerald-300" : movement.movementType === "out" ? "bg-amber-900/50 text-amber-300" : "bg-indigo-900/50 text-indigo-300"}`}>{movement.movementType.toUpperCase()}</span></td><td className="py-3 pr-3">{movement.quantity}</td><td className="py-3 pr-3">{movement.previousQuantity} → {movement.newQuantity}</td><td className="py-3 pr-3"><p>{movement.reason}</p>{movement.reference && <p className="text-xs text-slate-500">{movement.reference}</p>}</td><td className="py-3"><p>{movement.performedBy?.name || "User"}</p><p className="text-xs text-slate-500">{new Date(movement.createdAt).toLocaleString()}</p></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const loadInventory = useCallback(async (options = {}) => {
    setLoading(true);
    setError("");
    try {
      const result = await getInventory({
        q: options.q ?? appliedQuery,
        page: options.page ?? page,
        limit: 12,
        lowStock: options.lowStock ?? lowStockOnly,
      });
      setItems(result.data?.items || []);
      setPagination(result.data?.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, lowStockOnly]);

  const loadSuppliers = useCallback(async () => {
    try {
      const result = await getSuppliers();
      setSuppliers(result.data || []);
    } catch (err) {
      setError((previous) => previous || `Unable to load suppliers: ${err.message}`);
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
    if (user && ["admin", "manager"].includes(user.role)) {
      loadInventory();
      loadSuppliers();
    }
  }, [user, loadInventory, loadSuppliers]);

  const handleLogin = async (email, password) => {
    setAuthBusy(true); setAuthError("");
    try { setUser(await login(email, password)); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  };

  const handleLogout = async () => {
    try { await logout(); } catch (err) { setError(err.message); }
    setUser(null); setItems([]); setSuppliers([]);
  };

  const refreshList = async () => {
    await loadInventory();
    await loadSuppliers();
  };

  const saveProduct = async (form) => {
    setSaving(true); setDialogError("");
    try {
      if (dialog.type === "edit") {
        await updateInventory(dialog.item._id, {
          product_name: form.product_name.trim(),
          category: form.category.trim(),
          price: Number(form.price),
          supplier: form.supplier,
          description: form.description.trim(),
        });
        setNotice("Product updated successfully.");
      } else {
        await createInventory({
          product_name: form.product_name.trim(),
          sku: form.sku.trim().toUpperCase(),
          category: form.category.trim(),
          quantity: Number(form.quantity),
          price: Number(form.price),
          supplier: form.supplier,
          description: form.description.trim(),
        });
        setNotice("Product created successfully.");
      }
      setDialog(null);
      await refreshList();
    } catch (err) { setDialogError(err.message); }
    finally { setSaving(false); }
  };

  const saveAdjustment = async (form) => {
    setSaving(true); setDialogError("");
    try {
      await adjustInventory(dialog.item._id, {
        direction: form.direction,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
        reference: form.reference.trim(),
      });
      setDialog(null);
      setNotice("Stock updated and movement recorded.");
      await loadInventory();
    } catch (err) { setDialogError(err.message); }
    finally { setSaving(false); }
  };

  const handleArchive = async (item) => {
    if (!window.confirm(`Archive "${item.product_name}"? It will be removed from active inventory but its movement history will remain.`)) return;
    try {
      await archiveInventory(item._id);
      setNotice("Product archived.");
      await loadInventory({ page: 1 });
      setPage(1);
    } catch (err) { setError(err.message); }
  };

  if (!authReady) return <div className="min-h-screen flex items-center justify-center"><Spinner message="Restoring secure session…" /></div>;
  if (!user) return <LoginPanel onLogin={handleLogin} busy={authBusy} error={authError} />;

  if (!["admin", "manager"].includes(user.role)) {
    return <main className="min-h-screen flex items-center justify-center p-6"><div className="card max-w-lg p-8 text-center"><h1 className="font-display text-2xl text-slate-100">Access restricted</h1><p className="text-slate-400 mt-3">Inventory management requires an administrator or manager role.</p><button onClick={handleLogout} className="mt-6 rounded-lg bg-indigo-600 px-5 py-2 text-white">Sign out</button></div></main>;
  }

  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const lowStock = items.filter((item) => Number(item.quantity) <= 5).length;
  const pages = pagination?.pages || 1;

  const applySearch = (event) => {
    event.preventDefault();
    setAppliedQuery(query.trim()); setPage(1);
    loadInventory({ q: query.trim(), page: 1 });
  };

  const toggleLowStock = () => {
    const next = !lowStockOnly;
    setLowStockOnly(next); setPage(1);
    loadInventory({ lowStock: next, page: 1 });
  };

  return (
    <div className="min-h-screen font-body">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div><h1 className="font-display text-2xl font-bold gradient-text">Zeerostock</h1><p className="text-xs text-slate-500">Inventory management workspace</p></div>
          <div className="flex items-center gap-3"><span className="hidden sm:block text-sm text-slate-400">{user.name} · {user.role}</span><button onClick={handleLogout} className="text-sm rounded-lg border border-surface-border px-3 py-2 text-slate-300 hover:text-white">Sign out</button></div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-7">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div><p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Operations overview</p><h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-100 mt-2">Inventory <span className="gradient-text">dashboard</span></h2><p className="text-slate-400 mt-2">Manage products, stock levels and audit history.</p></div>
          <button onClick={() => { setDialogError(""); setDialog({ type: "create" }); }} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40">＋ Add product</button>
        </section>

        {notice && <div role="status" className="flex justify-between items-center rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Total products</p><p className="font-display text-2xl text-slate-100 mt-2">{pagination?.total ?? items.length}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Units on this page</p><p className="font-display text-2xl text-slate-100 mt-2">{totalUnits.toLocaleString("en-IN")}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Stock value on this page</p><p className="font-display text-2xl text-emerald-300 mt-2">{money(totalValue)}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Low stock on this page</p><p className="font-display text-2xl text-amber-300 mt-2">{lowStock}</p></div>
        </section>

        <section className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <form onSubmit={applySearch} className="flex gap-2 flex-1">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product name or SKU…" />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Search</button>
            <button type="button" onClick={() => { setQuery(""); setAppliedQuery(""); setPage(1); loadInventory({ q: "", page: 1 }); }} className="rounded-lg border border-surface-border px-3 py-2 text-slate-300">Reset</button>
          </form>
          <button onClick={toggleLowStock} aria-pressed={lowStockOnly} className={`rounded-lg border px-4 py-2 text-sm ${lowStockOnly ? "border-amber-500 bg-amber-950/40 text-amber-200" : "border-surface-border text-slate-300"}`}>{lowStockOnly ? "✓ Showing low stock" : "Show low stock only"}</button>
        </section>

        {error && <div role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>}
        <section className="flex items-center justify-between"><div><h3 className="font-display text-xl text-slate-100">Product inventory</h3><p className="text-sm text-slate-500 mt-1">{pagination?.total ?? items.length} matching records · Page {page} of {pages}</p></div><button onClick={refreshList} className="text-sm text-indigo-300 hover:text-indigo-200">↻ Refresh</button></section>
        {loading ? <Spinner message="Loading inventory…" /> : items.length === 0 ? (
          <div className="card p-12 text-center"><p className="font-display text-xl text-slate-200">No inventory records found</p><p className="text-sm text-slate-500 mt-2">Try changing your search or add your first product.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item, index) => <div key={item._id} className="flex flex-col gap-3">
              <InventoryCard item={item} index={index} />
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => { setDialogError(""); setDialog({ type: "edit", item }); }} className="rounded-lg border border-surface-border py-2 text-xs text-slate-300 hover:border-indigo-500 hover:text-white">Edit</button>
                <button onClick={() => { setDialogError(""); setDialog({ type: "stock", item }); }} className="rounded-lg border border-surface-border py-2 text-xs text-emerald-300 hover:border-emerald-600">Adjust</button>
                <button onClick={() => setDialog({ type: "movements", item })} className="rounded-lg border border-surface-border py-2 text-xs text-indigo-300 hover:border-indigo-500">History</button>
                <button onClick={() => handleArchive(item)} className="rounded-lg border border-surface-border py-2 text-xs text-red-300 hover:border-red-700">Archive</button>
              </div>
            </div>)}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-surface-border pt-5">
          <p className="text-xs text-slate-500">Showing {items.length} of {pagination?.total ?? items.length} products</p>
          <div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => { const next = page - 1; setPage(next); loadInventory({ page: next }); }} className="rounded-lg border border-surface-border px-3 py-2 text-sm text-slate-300 disabled:opacity-30">Previous</button><button disabled={page >= pages || loading} onClick={() => { const next = page + 1; setPage(next); loadInventory({ page: next }); }} className="rounded-lg border border-surface-border px-3 py-2 text-sm text-slate-300 disabled:opacity-30">Next</button></div>
        </div>
      </main>

      {dialog?.type === "create" || dialog?.type === "edit" ? <ProductDialog item={dialog.type === "edit" ? dialog.item : null} suppliers={suppliers} onClose={() => setDialog(null)} onSave={saveProduct} busy={saving} error={dialogError} /> : null}
      {dialog?.type === "stock" ? <StockDialog item={dialog.item} onClose={() => setDialog(null)} onSave={saveAdjustment} busy={saving} error={dialogError} /> : null}
      {dialog?.type === "movements" ? <MovementsDialog item={dialog.item} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
