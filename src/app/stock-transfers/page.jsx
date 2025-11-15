"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import React, { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";

const initialForm = {
  fromWarehouseId: "",
  toWarehouseId: "",
  productId: "",
  quantity: 0,
  reason: "",
};

export default function StockTransfersPage() {
  const [form, setForm] = useState(initialForm);
  const [warehouses, setWarehouses] = useState([]);
  const [productsForFromWarehouse, setProductsForFromWarehouse] = useState([]); // { value, label, available }
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const [transfers, setTransfers] = useState([]); // history
  // pagination for transfers (client-side)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadWarehouses();
    loadTransfers();
  }, []);

  const groupedProducts = Object.values(
    productsForFromWarehouse.reduce((acc, p) => {
      if (!acc[p.productId]) {
        acc[p.productId] = { ...p };
      } else {
        acc[p.productId].available += p.available;
      }
      return acc;
    }, {})
  );

  useEffect(() => {
    // when fromWarehouse changes, fetch inventory for that warehouse
    if (form.fromWarehouseId) {
      loadProductsForWarehouse(form.fromWarehouseId);
    } else {
      setProductsForFromWarehouse([]);
      setForm(prev => ({ ...prev, productId: "" }));
    }
  }, [form.fromWarehouseId]);

  async function loadWarehouses() {
    try {
      const res = await fetch("/warehouses/api");
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      setWarehouses([]);
    }
  }
async function loadProductsForWarehouse(warehouseId) {
  setLoadingProducts(true);
  setProductsForFromWarehouse([]);

  try {
    if (!warehouseId) {
      setProductsForFromWarehouse([]);
      return;
    }

    const res = await fetch(`/warehouse-inventory/api?warehouseId=${warehouseId}`);
    const data = await res.json();

    console.log("WAREHOUSE INVENTORY:", data); // ← IMPORTANT

    const map = new Map();

    for (const record of data) {
      
      // ========== CASE A: already grouped by product ==========
      if (record?.productId && record?.totalQuantity != null) {
        const p = record.productId;
        const id = String(p._id);
        const name = p.name || p.label || id;
        const qty = Number(record.totalQuantity);

        map.set(id, { value: id, label: name, available: qty });
        continue;
      }

      // ========== CASE B: raw WarehouseInventory with products[] ==========
      if (Array.isArray(record?.products)) {
        for (const item of record.products) {
          const p = item.productId;
          if (!p) continue;

          const id = String(p._id);
          const name = p.name || item.label || id;
          const qty = Number(item.quantity);

          if (!map.has(id)) {
            map.set(id, { value: id, label: name, available: qty });
          } else {
            map.get(id).available += qty;
          }
        }
        continue;
      }

      // ========== CASE C: fallback - unexpected structure ==========
      console.warn("Unhandled inventory record:", record);
    }

    const final = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    console.log("PARSED INVENTORY PRODUCTS:", final);

    setProductsForFromWarehouse(final);

  } catch (err) {
    console.error("Error loading products:", err);
    setProductsForFromWarehouse([]);
  } finally {
    setLoadingProducts(false);
  }
}



  async function loadTransfers() {
    try {
      const res = await fetch(`/stock-transfers/api/stock-transfers/`);
      const data = await res.json();
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      setTransfers([]);
    }
  }
  
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const selectedProduct = useMemo(() => productsForFromWarehouse.find(p => p.value === form.productId) || null, [productsForFromWarehouse, form.productId]);

  const availableQty = selectedProduct ? selectedProduct.available : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // validate fields
    if (!form.fromWarehouseId || !form.toWarehouseId || !form.productId) {
      setError("Please select from warehouse, to warehouse and product.");
      return;
    }
    const qty = Number(form.quantity || 0);
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    // Block if insufficient
    if (qty > availableQty) {
      setError(`Insufficient stock in source warehouse. Available: ${availableQty}`);
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch("/stock-transfers/api/stock-transfers/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          productId: form.productId,
          quantity: qty,
          reason: form.reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      // success
      setForm(initialForm);
      setProductsForFromWarehouse([]);
      await loadProductsForWarehouse(""); // clear
      await loadTransfers();
    } catch (err) {
      setError(err.message || "Failed to create transfer");
    } finally {
      setSubmitLoading(false);
    }
  };

  // filtered & paginated transfers
  const filteredTransfers = transfers.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.productLabel || t.reason || t.fromWarehouseId?.name || t.toWarehouseId?.name || "")
      .toString().toLowerCase().includes(s);
  });

  const pageCount = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const visibleTransfers = filteredTransfers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
    <MasterLayout>
      <Breadcrumb title="Stock Transfers" />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-3">
            <label className="form-label">From Warehouse</label>
            <select name="fromWarehouseId" className="form-control" value={form.fromWarehouseId} onChange={handleChange} required>
              <option value="">Select from warehouse</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label">To Warehouse</label>
            <select name="toWarehouseId" className="form-control" value={form.toWarehouseId} onChange={handleChange} required>
              <option value="">Select to warehouse</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label">Product (from selected warehouse)</label>
            <select
              name="productId"
              className="form-control"
              value={form.productId}
              onChange={handleChange}
              required
            >
              <option value="">{loadingProducts ? "Loading..." : "Select product"}</option>
              {productsForFromWarehouse.map((p, index) => (
                  <option key={`${p.value}-${index}`} value={p.value}>
                    {p.label} {p.available != null ? ` (Available: ${p.available})` : ""}
                  </option>
              ))}
            </select>
          </div>

          <div className="col-md-1">
            <label className="form-label">Available</label>
            <input type="text" className="form-control" value={availableQty} readOnly />
          </div>

          <div className="col-md-1">
            <label className="form-label">Qty</label>
            <input type="number" name="quantity" className="form-control" value={form.quantity} min={1} onChange={handleChange} required />
          </div>

          <div className="col-md-1">
            <label className="form-label">Reason</label>
            <input type="text" name="reason" className="form-control" value={form.reason} onChange={handleChange} placeholder="Optional" />
          </div>

          <div className="col-md-12 d-flex gap-2 mt-2 pt-3 pb-3">
            <button type="submit" className="btn btn-success" disabled={submitLoading}>
              {submitLoading ? "Transferring..." : "Transfer"}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { setForm(initialForm); setError(""); }}>
              Reset
            </button>
          </div>
        </form>

        {/* --- Transfer history --- */}
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div>
              <h5 className="card-title mb-0">Transfer History</h5>
            </div>
            <div className="d-flex align-items-center gap-2">
              <input type="text" placeholder="Search..." className="form-control" style={{width: 220}} value={search} onChange={e => { setSearch(e.target.value); setPageIndex(0); }} />
              <select className="form-control" style={{width: 120}} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
                {[5,10,20,50].map(n => <option key={n} value={n}>Show {n}</option>)}
              </select>
            </div>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="table basic-border-table mb-0">
                <thead>
                  <tr>
                    <th>Sr.No</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Transferred From</th>
                    <th>Transferred To</th>
                    <th>Reason</th>
                    <th>Transferred By</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">No transfers found</td>
                    </tr>
                  ) : visibleTransfers.map((t, i) => (
                    <tr key={t._id || i}>
                      <td className="text-center">{pageIndex * pageSize + i + 1}</td>
                      <td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}</td>
                      <td>{t.productLabel || t.productId?.name || (t.productId?._id ? t.productId._id : "")}</td>
                      <td className="text-center">{t.quantity}</td>
                      <td>{t.fromWarehouseId?.name ?? "N/A"}</td>
                      <td>{t.toWarehouseId?.name ?? "N/A"}</td>
                      <td>{t.reason || ""}</td>
                      <td>{t.userId?.name || "N/A"}</td> 
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination controls */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="btn-group">
                <button className="btn btn-outline-primary" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>First</button>
                <button className="btn btn-outline-primary" onClick={() => setPageIndex(p => Math.max(0, p-1))} disabled={pageIndex === 0}>Prev</button>
                <button className="btn btn-outline-primary" onClick={() => setPageIndex(p => Math.min(pageCount-1, p+1))} disabled={pageIndex >= pageCount-1}>Next</button>
                <button className="btn btn-outline-primary" onClick={() => setPageIndex(pageCount-1)} disabled={pageIndex >= pageCount-1}>Last</button>
              </div>

              <div>
                Page {pageIndex + 1} of {pageCount}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
}
