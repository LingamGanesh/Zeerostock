import { useCallback, useEffect, useState } from "react";
import InventoryCard from "./components/InventoryCard.jsx";
import Spinner from "./components/Spinner.jsx";
import {
  adjustInventory,
  archiveInventory,
  archiveSupplier,
  createSupplier,
  createInventory,
  getInventory,
  getInventoryMovements,
  getDashboardSummary,
  getStockReport,
  getMovementReport,
  getSuppliers,
  login,
  logout,
  refreshSession,
  updateInventory,
  updateSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,
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

function SupplierDialog({ supplier, onClose, onSave, busy, error }) {
  const [form, setForm] = useState(() => ({
    name: supplier?.name || "",
    contactEmail: supplier?.contactEmail || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    country: supplier?.country || "India",
  }));
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto" role="presentation">
      <form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="card w-full max-w-xl p-6 flex flex-col gap-4 my-auto" role="dialog" aria-modal="true" aria-labelledby="supplier-dialog-title">
        <div className="flex justify-between items-start"><div><p className="text-xs uppercase tracking-widest text-indigo-300">Supplier directory</p><h2 id="supplier-dialog-title" className="font-display text-2xl text-slate-100 mt-1">{supplier ? "Edit supplier" : "Add supplier"}</h2></div><button type="button" onClick={onClose} className="text-slate-400 text-xl" aria-label="Close">×</button></div>
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Supplier name"><TextInput required minLength={2} maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Contact email"><TextInput required type="email" maxLength={254} value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
          <Field label="Phone"><TextInput value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Country"><TextInput required minLength={2} maxLength={80} value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
        </div>
        <Field label="Address"><TextInput maxLength={250} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-surface-border px-4 py-2 text-slate-300">Cancel</button><button disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2 text-white font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save supplier"}</button></div>
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


function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\\r\\n");
  const blob = new Blob(["\\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function StockReportsPanel() {
  const [stockType, setStockType] = useState("all");
  const [stockReport, setStockReport] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [movementType, setMovementType] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const [movementData, setMovementData] = useState({ movements: [], pagination: null });
  const [movementLoading, setMovementLoading] = useState(false);
  const [movementError, setMovementError] = useState("");

  useEffect(() => {
    let active = true;
    setStockLoading(true);
    setStockError("");
    getStockReport({ type: stockType })
      .then((result) => { if (active) setStockReport(result.data || null); })
      .catch((error) => { if (active) setStockError(error.message); })
      .finally(() => { if (active) setStockLoading(false); });
    return () => { active = false; };
  }, [stockType]);

  useEffect(() => {
    let active = true;
    setMovementLoading(true);
    setMovementError("");
    getMovementReport({ from, to, movementType, page: movementPage, limit: 25 })
      .then((result) => { if (active) setMovementData(result.data || { movements: [], pagination: null }); })
      .catch((error) => { if (active) setMovementError(error.message); })
      .finally(() => { if (active) setMovementLoading(false); });
    return () => { active = false; };
  }, [from, to, movementType, movementPage]);

  const stockItems = stockReport?.items || [];
  const movements = movementData.movements || [];
  const movementPagination = movementData.pagination;

  return <section className="card p-5 space-y-6">
    <div><h3 className="font-display text-xl text-slate-100">Inventory reports</h3><p className="text-xs text-slate-500 mt-1">Stock valuation exports and date-filtered movement audit</p></div>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div><h4 className="font-semibold text-slate-200">Stock valuation &amp; availability</h4><p className="text-xs text-slate-500">Active inventory · export capped at 5,000 products</p></div>
        <div className="flex flex-wrap gap-2">
          <select value={stockType} onChange={(event) => setStockType(event.target.value)} className="rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm text-slate-200">
            <option value="all">All active stock</option><option value="low">Low stock (1–5)</option><option value="out">Out of stock</option>
          </select>
          <button disabled={stockLoading || stockItems.length === 0} onClick={() => downloadCsv("zeerostock-stock-report.csv", ["Product", "SKU", "Category", "Quantity", "Unit price (INR)", "Stock value (INR)", "Supplier"], stockItems.map((item) => [item.product_name, item.sku, item.category, item.quantity, item.price, Number(item.price || 0) * Number(item.quantity || 0), item.supplier?.name]))} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-40">Export stock CSV</button>
        </div>
      </div>
      {stockError && <p role="alert" className="text-sm text-red-300 mb-2">{stockError}</p>}
      {stockLoading ? <p className="text-sm text-slate-500">Loading stock report…</p> : stockReport && <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
          <div className="rounded-lg bg-surface p-3"><p className="text-xs text-slate-500">Products</p><p className="text-lg text-slate-100">{stockReport.summary.productCount}</p></div>
          <div className="rounded-lg bg-surface p-3"><p className="text-xs text-slate-500">Total units</p><p className="text-lg text-slate-100">{stockReport.summary.totalUnits}</p></div>
          <div className="rounded-lg bg-surface p-3"><p className="text-xs text-slate-500">Stock value</p><p className="text-lg text-emerald-300">{money(stockReport.summary.stockValue)}</p></div>
          <div className="rounded-lg bg-surface p-3"><p className="text-xs text-slate-500">Low stock</p><p className="text-lg text-amber-300">{stockReport.summary.lowStockCount}</p></div>
          <div className="rounded-lg bg-surface p-3"><p className="text-xs text-slate-500">Out of stock</p><p className="text-lg text-red-300">{stockReport.summary.outOfStockCount}</p></div>
        </div>
        {stockReport.truncated && <p className="text-xs text-amber-300 mb-2">Report reached the 5,000-item export limit. Narrow the report type to export a smaller result.</p>}
        <div className="overflow-x-auto max-h-72 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="sticky top-0 bg-surface text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Product</th><th className="py-2 pr-3">SKU</th><th className="py-2 pr-3">Qty</th><th className="py-2 pr-3">Unit price</th><th className="py-2 pr-3">Stock value</th><th className="py-2">Supplier</th></tr></thead><tbody>{stockItems.slice(0, 100).map((item) => <tr key={item._id} className="border-t border-surface-border/70"><td className="py-2 pr-3 text-slate-200">{item.product_name}</td><td className="py-2 pr-3 text-slate-400">{item.sku}</td><td className={`py-2 pr-3 ${item.quantity <= 5 ? "text-amber-300" : "text-slate-300"}`}>{item.quantity}</td><td className="py-2 pr-3 text-slate-300">{money(item.price)}</td><td className="py-2 pr-3 text-slate-300">{money(Number(item.price || 0) * Number(item.quantity || 0))}</td><td className="py-2 text-slate-400">{item.supplier?.name || "—"}</td></tr>)}</tbody></table></div>
        {stockItems.length > 100 && <p className="text-xs text-slate-500 mt-2">Showing first 100 rows on screen; CSV contains all {stockItems.length} returned rows.</p>}
      </>}
    </div>
    <div className="border-t border-surface-border pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div><h4 className="font-semibold text-slate-200">Stock movement history</h4><p className="text-xs text-slate-500">Filter by date and movement type; 25 records per page</p></div>
        <button disabled={movementLoading || movements.length === 0} onClick={() => downloadCsv("zeerostock-movement-history.csv", ["Date", "Product", "SKU", "Type", "Quantity", "Previous balance", "New balance", "Reason", "Reference", "Performed by"], movements.map((entry) => [new Date(entry.createdAt).toISOString(), entry.inventory?.product_name, entry.inventory?.sku, entry.movementType, entry.quantity, entry.previousQuantity, entry.newQuantity, entry.reason, entry.reference, entry.performedBy?.name]))} className="rounded-lg border border-surface-border px-3 py-2 text-sm text-indigo-300 disabled:opacity-40">Export current page CSV</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <label className="text-xs text-slate-400 flex flex-col gap-1">From date<input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setMovementPage(1); }} className="rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm text-slate-200" /></label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">To date<input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setMovementPage(1); }} className="rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm text-slate-200" /></label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">Movement type<select value={movementType} onChange={(event) => { setMovementType(event.target.value); setMovementPage(1); }} className="rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm text-slate-200"><option value="">All movements</option><option value="in">Stock in</option><option value="out">Stock out</option><option value="set">Set balance</option></select></label>
      </div>
      {movementError && <p role="alert" className="text-sm text-red-300 mb-2">{movementError}</p>}
      {movementLoading ? <p className="text-sm text-slate-500">Loading movement history…</p> : movements.length === 0 ? <p className="text-sm text-slate-500 py-4">No movements match these filters.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs uppercase text-slate-500 border-b border-surface-border"><tr><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Product / SKU</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Change</th><th className="py-2 pr-3">Balance</th><th className="py-2 pr-3">Reason</th><th className="py-2">By</th></tr></thead><tbody>{movements.map((entry) => <tr key={entry._id} className="border-b border-surface-border/70"><td className="py-2 pr-3 whitespace-nowrap text-slate-400">{new Date(entry.createdAt).toLocaleString()}</td><td className="py-2 pr-3"><p className="text-slate-200">{entry.inventory?.product_name || "Archived product"}</p><p className="text-xs text-slate-500">{entry.inventory?.sku || "—"}</p></td><td className="py-2 pr-3 uppercase text-xs text-indigo-300">{entry.movementType}</td><td className="py-2 pr-3 text-slate-200">{entry.quantity}</td><td className="py-2 pr-3 text-slate-300">{entry.previousQuantity} → {entry.newQuantity}</td><td className="py-2 pr-3 text-slate-400">{entry.reason}</td><td className="py-2 text-slate-400">{entry.performedBy?.name || "—"}</td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between mt-3"><p className="text-xs text-slate-500">{movementPagination?.total || 0} matching movements · Page {movementPagination?.page || 1} of {movementPagination?.pages || 1}</p><div className="flex gap-2"><button disabled={!movementPagination || movementPage <= 1 || movementLoading} onClick={() => setMovementPage((value) => value - 1)} className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">Previous</button><button disabled={!movementPagination || movementPage >= movementPagination.pages || movementLoading} onClick={() => setMovementPage((value) => value + 1)} className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-300 disabled:opacity-30">Next</button></div></div>
    </div>
  </section>;
}

function PurchaseOrdersPanel({ inventory, suppliers, onChanged }) {
  const [orders, setOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState([{ inventoryId: "", quantity: "1", unitPrice: "" }]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await getPurchaseOrders({ limit: 50 });
      setOrders(result.data?.orders || []);
    } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const addLine = () => setLines((current) => [...current, { inventoryId: "", quantity: "1", unitPrice: "" }]);
  const removeLine = (index) => setLines((current) => current.filter((_, i) => i !== index));

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await createPurchaseOrder({ supplier: supplierId, notes, items: lines.map((line) => ({
        inventoryId: line.inventoryId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice),
      })) });
      setLines([{ inventoryId: "", quantity: "1", unitPrice: "" }]); setNotes("");
      setNotice("Purchase order created."); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const act = async (operation, order) => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (operation === "approve") await approvePurchaseOrder(order._id);
      else await receivePurchaseOrder(order._id, order.items.filter((line) => line.receivedQuantity < line.orderedQuantity)
        .map((line) => ({ itemId: line._id, quantity: line.orderedQuantity - line.receivedQuantity })));
      setNotice(operation === "approve" ? "Purchase order approved." : "Remaining quantities received and stock movements recorded.");
      await load(); if (operation === "receive") onChanged();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="card p-5 flex flex-col gap-5">
      <div><h3 className="font-display text-xl text-slate-100">Purchase orders</h3><p className="text-sm text-slate-500 mt-1">Create supplier orders, approve them and receive stock into inventory.</p></div>
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">{notice}</p>}
      <form onSubmit={submit} className="rounded-xl border border-surface-border p-4 flex flex-col gap-3">
        <h4 className="font-semibold text-slate-200">Create purchase order</h4>
        <Field label="Supplier">
          <select required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setLines([{ inventoryId: "", quantity: "1", unitPrice: "" }]); }} className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2.5 text-slate-100">
            <option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
          </select>
        </Field>
        {lines.map((line, index) => {
          const supplierProducts = inventory.filter((item) => (item.supplier?._id || item.supplier) === supplierId);
          return <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <Field label={`Product ${index + 1}`}><select required value={line.inventoryId} onChange={(e) => { const product = supplierProducts.find((item) => item._id === e.target.value); updateLine(index, "inventoryId", e.target.value); if (product) updateLine(index, "unitPrice", String(product.price)); }} className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2.5 text-slate-100"><option value="">Select product</option>{supplierProducts.map((item) => <option key={item._id} value={item._id}>{item.product_name} · {item.sku}</option>)}</select></Field>
            <Field label="Order quantity"><TextInput required type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} /></Field>
            <Field label="Unit price (INR)"><TextInput required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} /></Field>
            <button type="button" disabled={lines.length === 1} onClick={() => removeLine(index)} className="rounded-lg border border-surface-border px-3 py-2.5 text-sm text-red-300 disabled:opacity-30">Remove</button>
          </div>;
        })}
        <div className="flex flex-wrap gap-2"><button type="button" onClick={addLine} disabled={!supplierId} className="rounded-lg border border-surface-border px-3 py-2 text-sm text-indigo-300">＋ Add product line</button></div>
        <Field label="Notes (optional)"><TextInput maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions or notes" /></Field>
        <div><button disabled={busy || !supplierId || lines.some((line) => !line.inventoryId)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Processing…" : "Create purchase order"}</button></div>
      </form>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center"><h4 className="font-semibold text-slate-200">Recent orders</h4><button onClick={load} className="text-xs text-indigo-300">Refresh</button></div>
        {orders.length === 0 ? <p className="text-sm text-slate-500">No purchase orders created yet.</p> : orders.map((order) => (
          <article key={order._id} className="rounded-xl border border-surface-border p-4">
            <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold text-slate-100">{order.orderNumber}</p><p className="text-xs text-slate-500 mt-1">{order.supplier?.name || "Supplier"} · {new Date(order.createdAt).toLocaleDateString()}</p></div><span className="text-xs rounded-full bg-surface px-3 py-1 text-indigo-300">{order.status.replace("_", " ")}</span></div>
            <div className="mt-3 space-y-1">{order.items.map((line) => <p key={line._id} className="text-sm text-slate-300">{line.productName} · {line.receivedQuantity}/{line.orderedQuantity} received · {money(line.unitPrice)} each</p>)}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              {order.status === "pending" && <button disabled={busy} onClick={() => act("approve", order)} className="rounded-lg border border-indigo-500/50 px-3 py-2 text-xs text-indigo-300">Approve</button>}
              {["approved", "partially_received"].includes(order.status) && <button disabled={busy} onClick={() => act("receive", order)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs text-white">Receive remaining stock</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [supplierDialog, setSupplierDialog] = useState(null);
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

  const loadDashboard = useCallback(async () => {
    try {
      const result = await getDashboardSummary();
      setDashboard(result.data || null);
    } catch (err) {
      setError((previous) => previous || `Unable to load dashboard: ${err.message}`);
    }
  }, []);

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
      loadDashboard();
    }
  }, [user, loadInventory, loadSuppliers, loadDashboard]);

  const handleLogin = async (email, password) => {
    setAuthBusy(true); setAuthError("");
    try { setUser(await login(email, password)); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  };

  const handleLogout = async () => {
    try { await logout(); } catch (err) { setError(err.message); }
    setUser(null); setItems([]); setSuppliers([]); setDashboard(null);
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

  const saveSupplier = async (form) => {
    setSaving(true); setDialogError("");
    try {
      const payload = { name: form.name.trim(), contactEmail: form.contactEmail.trim().toLowerCase(), phone: form.phone.trim(), address: form.address.trim(), country: form.country.trim() };
      if (supplierDialog) {
        await updateSupplier(supplierDialog._id, payload);
        setNotice("Supplier updated successfully.");
      } else {
        await createSupplier(payload);
        setNotice("Supplier created successfully.");
      }
      setSupplierDialog(null);
      await loadSuppliers();
    } catch (err) { setDialogError(err.message); }
    finally { setSaving(false); }
  };

  const handleArchiveSupplier = async (supplier) => {
    if (!window.confirm(`Archive supplier "${supplier.name}"?`)) return;
    try {
      await archiveSupplier(supplier._id);
      setNotice("Supplier archived successfully.");
      await loadSuppliers();
    } catch (err) { setError(err.message); }
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

  const summary = dashboard?.summary || {};
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
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Active products</p><p className="font-display text-2xl text-slate-100 mt-2">{(summary.totalProducts || 0).toLocaleString("en-IN")}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Total units</p><p className="font-display text-2xl text-slate-100 mt-2">{(summary.totalUnits || 0).toLocaleString("en-IN")}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Total stock value</p><p className="font-display text-2xl text-emerald-300 mt-2">{money(summary.totalStockValue || 0)}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Low stock (≤ 5)</p><p className="font-display text-2xl text-amber-300 mt-2">{(summary.lowStockProducts || 0).toLocaleString("en-IN")}</p></div>
          <div className="card p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Out of stock</p><p className="font-display text-2xl text-red-300 mt-2">{(summary.outOfStockProducts || 0).toLocaleString("en-IN")}</p></div>
        </section>
        {dashboard?.categoryBreakdown?.length > 0 && <section className="card p-5">
          <div className="flex items-center justify-between mb-4"><div><h3 className="font-display text-lg text-slate-100">Category valuation</h3><p className="text-xs text-slate-500 mt-1">Active inventory grouped by category</p></div><span className="text-xs text-slate-500">{dashboard.categoryBreakdown.length} categories</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {dashboard.categoryBreakdown.map((category) => <div key={category.category} className="rounded-lg bg-surface border border-surface-border p-3"><p className="text-sm text-slate-300 truncate">{category.category}</p><p className="font-semibold text-indigo-300 mt-1">{money(category.stockValue)}</p><p className="text-xs text-slate-500 mt-1">{category.products} products · {category.units.toLocaleString("en-IN")} units</p></div>)}
          </div>
        </section>}

        {dashboard?.purchaseAnalytics && (() => {
          const report = dashboard.purchaseAnalytics;
          const totals = report.totals || {};
          const maxMonth = Math.max(1, ...(report.monthly || []).map((entry) => entry.orderedValue));
          return <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div><h3 className="font-display text-xl text-slate-100">Purchase analytics</h3><p className="text-xs text-slate-500 mt-1">Order value, receipts and supplier performance</p></div><span className="text-xs text-slate-500">{totals.orderCount || 0} total orders</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg bg-surface border border-surface-border p-4"><p className="text-xs text-slate-500 uppercase">Ordered value</p><p className="font-display text-xl text-slate-100 mt-2">{money(totals.orderedValue)}</p></div>
              <div className="rounded-lg bg-surface border border-surface-border p-4"><p className="text-xs text-slate-500 uppercase">Received purchase value</p><p className="font-display text-xl text-emerald-300 mt-2">{money(totals.receivedValue)}</p></div>
              <div className="rounded-lg bg-surface border border-surface-border p-4"><p className="text-xs text-slate-500 uppercase">Outstanding order value</p><p className="font-display text-xl text-amber-300 mt-2">{money(totals.pendingValue)}</p></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div><h4 className="text-sm font-semibold text-slate-200 mb-3">Monthly purchasing · last 6 months</h4>
                {(report.monthly || []).length ? <div className="space-y-3">{report.monthly.map((month) => <div key={month.month}><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{new Date(month.month + "-01T00:00:00Z").toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })} · {month.orders} orders</span><span className="text-slate-200">{money(month.orderedValue)}</span></div><div className="h-2 rounded-full bg-surface overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: (Math.min(100, month.orderedValue / maxMonth * 100)) + "%" }} /></div></div>)}</div> : <p className="text-sm text-slate-500">No purchases in this period.</p>}
              </div>
              <div><h4 className="text-sm font-semibold text-slate-200 mb-3">Supplier-wise purchases · top 10</h4>
                {(report.suppliers || []).length ? <div className="space-y-2">{report.suppliers.map((supplier) => <div key={supplier.supplierId || supplier.supplierName} className="flex items-center justify-between gap-3 border-b border-surface-border pb-2"><div className="min-w-0"><p className="text-sm text-slate-200 truncate">{supplier.supplierName}</p><p className="text-xs text-slate-500">{supplier.orders} orders · received {money(supplier.receivedValue)}</p></div><p className="text-sm font-semibold text-indigo-300 whitespace-nowrap">{money(supplier.orderedValue)}</p></div>)}</div> : <p className="text-sm text-slate-500">No supplier purchases yet.</p>}
              </div>
            </div>
            {(report.statuses || []).length > 0 && <div className="flex flex-wrap gap-2 mt-5">{report.statuses.map((entry) => <span key={entry.status} className="rounded-full border border-surface-border px-3 py-1 text-xs text-slate-300 capitalize">{entry.status.replace("_", " ")}: {entry.count}</span>)}</div>}
          </section>;
        })()}

        <section className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div><h3 className="font-display text-xl text-slate-100">Supplier management</h3><p className="text-sm text-slate-500 mt-1">{suppliers.length} active suppliers · Manage contacts and sourcing partners</p></div>
            <button onClick={() => { setDialogError(""); setSupplierDialog(null); setSupplierDialog({}); }} className="rounded-lg border border-indigo-500/50 px-4 py-2 text-sm text-indigo-300 hover:bg-indigo-950/40">＋ Add supplier</button>
          </div>
          {suppliers.length === 0 ? <p className="text-sm text-slate-500 py-3">No active suppliers yet. Add a supplier to start registering products.</p> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {suppliers.map((supplier) => <div key={supplier._id} className="rounded-lg border border-surface-border bg-surface p-4">
              <div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-100 truncate">{supplier.name}</p><p className="text-xs text-slate-400 mt-1 break-all">{supplier.contactEmail}</p></div><span className="text-xs text-slate-500">{supplier.country || "India"}</span></div>
              {supplier.phone && <p className="text-xs text-slate-500 mt-2">{supplier.phone}</p>}
              <div className="flex gap-2 mt-3"><button onClick={() => { setDialogError(""); setSupplierDialog(supplier); }} className="text-xs text-indigo-300 border border-surface-border rounded-md px-3 py-1.5">Edit</button><button onClick={() => handleArchiveSupplier(supplier)} className="text-xs text-red-300 border border-surface-border rounded-md px-3 py-1.5">Archive</button></div>
            </div>)}
          </div>}
        </section>

        <StockReportsPanel />\n\n        <PurchaseOrdersPanel inventory={items} suppliers={suppliers} onChanged={refreshList} />

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
      {supplierDialog !== null ? <SupplierDialog supplier={supplierDialog._id ? supplierDialog : null} onClose={() => setSupplierDialog(null)} onSave={saveSupplier} busy={saving} error={dialogError} /> : null}
    </div>
  );
}
