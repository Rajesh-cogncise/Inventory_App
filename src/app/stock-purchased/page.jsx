"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState, useCallback } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";
import Select from "react-select";

/**
 * StockPurchasedPage with filters + "View Items" modal
 */

export default function StockPurchasedPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [purchases, setPurchases] = useState([]);

  // dropdown data
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  // filters stored as react-select option objects or string for date
  const [filters, setFilters] = useState({
    warehouse: null,
    supplier: null,
    from: "",
    to: ""
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [activePurchase, setActivePurchase] = useState(null);

  // fetch purchases with current filters
  const fetchPurchases = useCallback(async (useFilters = true) => {
    setLoading(true);
    setError("");

    try {
      // build query from filters only if useFilters true
      const params = new URLSearchParams();
      if (useFilters) {
        if (filters.supplier?.value) params.append("supplierId", filters.supplier.value);
        if (filters.warehouse?.value) params.append("warehouseId", filters.warehouse.value);
        if (filters.from) params.append("fromDate", filters.from);
        if (filters.to) params.append("toDate", filters.to);
      }

      const query = params.toString();
      const url = query ? `/stock-purchase/api?${query}` : `/stock-purchase/api`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPurchases(Array.isArray(data) ? data : []);
      } else {
        setError(data.error || "Failed to fetch purchases");
        setPurchases([]);
      }
    } catch (err) {
      setError("Error fetching purchased stock");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // load dropdowns and initial purchases
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [wRes, sRes] = await Promise.all([
          fetch("warehouses/api"),
          fetch("suppliers/api")
        ]);

        const [warehouses, suppliers] = await Promise.all([wRes.json(), sRes.json()]);

        setWarehouseOptions(Array.isArray(warehouses) ? warehouses.map(w => ({ value: w._id, label: w.name })) : []);
        setSupplierOptions(Array.isArray(suppliers) ? suppliers.map(s => ({ value: s._id, label: s.name })) : []);
      } catch (err) {
        setWarehouseOptions([]);
        setSupplierOptions([]);
      }
    };

    loadDropdowns();
    fetchPurchases(false); // initial: load all
  }, [fetchPurchases]);

  // handlers
  const onSearch = () => fetchPurchases(true);
  const onReset = () => {
    setFilters({ warehouse: null, supplier: null, from: "", to: "" });
    fetchPurchases(false); // load all
  };

  // utility to format Decimal128 or plain numbers to 3 decimals
  function formatDecimal(value, digits = 3) {
    if (value === null || value === undefined || value === "") return (0).toFixed(digits);
    if (typeof value === "object" && value.$numberDecimal) {
      const n = Number(value.$numberDecimal);
      return isNaN(n) ? (0).toFixed(digits) : n.toFixed(digits);
    }
    const n = Number(value);
    return isNaN(n) ? (0).toFixed(digits) : n.toFixed(digits);
  }

  // open modal for a purchase
  const openModal = (purchase) => {
    setActivePurchase(purchase);
    setShowModal(true);
  };

  const closeModal = () => {
    setActivePurchase(null);
    setShowModal(false);
  };

  // compute line total safely (price may be Decimal128 object)
  const getLineTotal = (price, qty) => {
    const p = (typeof price === "object" && price.$numberDecimal) ? Number(price.$numberDecimal) : Number(price || 0);
    const q = Number(qty || 0);
    const val = p * q;
    return isNaN(val) ? 0 : val;
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Stock purchased" />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {/* FILTER BAR */}
        <div className="card p-3 mb-3">
          <h6 className="mb-3">Search Filters</h6>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Warehouse</label>
              <Select
                isClearable
                options={warehouseOptions}
                value={filters.warehouse}
                onChange={opt => setFilters({ ...filters, warehouse: opt })}
                placeholder="All Warehouses"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Supplier</label>
              <Select
                isClearable
                options={supplierOptions}
                value={filters.supplier}
                onChange={opt => setFilters({ ...filters, supplier: opt })}
                placeholder="All Suppliers"
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.from}
                onChange={e => setFilters({ ...filters, from: e.target.value })}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.to}
                onChange={e => setFilters({ ...filters, to: e.target.value })}
              />
            </div>

            <div className="col-md-2 d-flex gap-2">
              <button type="button" className="btn btn-primary" onClick={onSearch}>
                Search
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={onReset}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="text-center py-5">
            <Icon icon="eos-icons:loading" className="icon text-3xl" /> Loading...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table basic-border-table mb-0">
              <thead>
                <tr>
                  <th>Sr.No</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Supplier Name</th>
                  <th>Warehouse</th>
                  <th>Created By</th>
                  <th>Product Details</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase, idx) => (
                  <tr key={purchase._id || idx}>
                    <td>{idx + 1}</td>
                    <td>{purchase.date ? new Date(purchase.date).toLocaleDateString() : ""}</td>
                    <td>{purchase.invoiceNo}</td>
                    <td>{purchase.supplier?.name || ""}</td>
                    <td>{purchase.warehouseId?.name || ""}</td>

                   
                    <td>{purchase.userId?.name || "Unknown"}</td>

                    {/* Actions column with View Items button */}
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openModal(purchase)}
                      >
                        View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal (Bootstrap-style, pure React show/hide) */}
        {showModal && activePurchase && (
          <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
            <div
              className="modal fade show"
              tabIndex={-1}
              role="dialog"
              style={{ display: "block", zIndex: 1050 }}
              aria-modal="true"
            >
              <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Purchase Items - Invoice: {activePurchase.invoiceNo}</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                  </div>

                  <div className="modal-body">
                    <div className="mb-3">
                      <strong>Supplier:</strong> {activePurchase.supplier?.name || "N/A"} <br />
                      <strong>Warehouse:</strong> {activePurchase.warehouseId?.name || "N/A"} <br />
                      <strong>Date:</strong> {activePurchase.date ? new Date(activePurchase.date).toLocaleDateString() : ""}
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr>
                            <th >Sr.No</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price / unit</th>
                            <th>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(activePurchase.products) && activePurchase.products.length > 0 ? (
                            activePurchase.products.map((p, i) => {
                              const lineTotal = getLineTotal(p.price, p.quantity);
                              return (
                                <tr key={i}>
                                  <td className="text-center">{i + 1}</td>
                                  <td>{p.label || p.productId?.name || "Unnamed Product"}</td>
                                  <td>{p.quantity}</td>
                                  <td>${formatDecimal(p.price)}</td>
                                  <td>${Number(lineTotal).toFixed(3)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center text-muted">No products</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-end gap-3 mt-3">
                      <div className="text-right">
                        <div><strong>Subtotal:</strong> ${formatDecimal(activePurchase.subtotal)}</div>
                        <div><strong>GST:</strong> ${formatDecimal(activePurchase.gst ?? 0, 3)}</div>
                        <div><strong>Grand Total:</strong> ${formatDecimal(activePurchase.total)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MasterLayout>
  );
}
