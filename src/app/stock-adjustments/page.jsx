"use client";

import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { Icon } from "@iconify/react";

export default function StockAdjustmentsPage() {
  const [purchases, setPurchases] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [warehouseId, setWarehouseId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editedProducts, setEditedProducts] = useState({});

  // Fetch warehouses on load
  useEffect(() => {
    fetchWarehouses();
    fetchPurchases();
  }, []);

  // Fetch filtered data
  useEffect(() => {
    fetchPurchases();
  }, [warehouseId, fromDate, toDate, page]);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/warehouses/api");
      const data = await res.json();
      setWarehouses(data);
    } catch {
      console.error("Failed to load warehouses");
    }
  };

  const fetchPurchases = async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (warehouseId) params.append("warehouseId", warehouseId);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    params.append("page", page);

    try {
      const res = await fetch(`/stock-purchase/api?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load purchases");
      const data = await res.json();

      setPurchases(data.items || data);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);
    const productMap = {};
    purchase.products.forEach((p) => {
      productMap[p.productId] = p.quantity;
    });
    setEditedProducts(productMap);
    setModalOpen(true);
  };

  const handleQtyChange = (productId, value) => {
    setEditedProducts((prev) => ({
      ...prev,
      [productId]: Number(value),
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const res = await fetch("/stock-adjustments/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: selectedPurchase._id,
          products: editedProducts,
        }),
      });
      if (!res.ok) throw new Error("Failed to update quantities");
      await fetchPurchases();
      setModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Stock Adjustments" />

      <div className="container py-4">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* 🔍 Filters */}
        <div className="row g-3 mb-5 align-items-end">
          <div className="col-md-3">
            <label className="form-label fw-semibold">Warehouse</label>
            <select
              className="form-select"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">From Date</label>
            <input
              type="date"
              className="form-control"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">To Date</label>
            <input
              type="date"
              className="form-control"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="col-md-1">
            <button className="btn btn-primary mt-3 w-100" onClick={() => fetchPurchases()}>
              <Icon icon="mdi:search" /> Filter
            </button>
          </div>
        </div>

        {/* 📋 Table */}
        {loading ? (
          <div className="text-center py-5">
            <Icon icon="eos-icons:loading" className="text-3xl" /> Loading...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th className="text-center">Sr.No</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Warehouse</th>
                  <th>Supplier</th>  
                  {/*<th>Last Updated By</th>    */}                           
                  <th>Action</th>
                  
                </tr>
              </thead>
              <tbody>
                {purchases.length > 0 ? (
                  purchases.map((p, i) => (
                    <tr key={p._id}>
                      <td className="text-center">{(page - 1) * 5 + (i + 1)}</td>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td>{p.invoiceNo}</td>
                      <td>{p.warehouseId?.name}</td>
                      <td>{p.supplier?.name}</td>   
                      {/*<td>{p.lastAdjustedBy || "—"}</td>       */}           
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openEditModal(p)}
                        >
                          Edit Stock
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="d-flex justify-content-between mt-3">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🧾 Modal */}
      {modalOpen && selectedPurchase && (
        <div className="modal fade show d-block" style={{ background: "#0008" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Edit Products — {selectedPurchase.invoiceNo}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th className="text-center">Sr.No</th>
                      <th>Product</th>
                      <th>Current Qty</th>
                      <th>New Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.products.map((prod, i) => (
                      <tr key={prod.productId}>
                        <td>{i + 1}</td>
                        <td>{prod.label}</td>
                        <td>{prod.quantity}</td>
                        <td>
                          <input
                            type="number"
                            value={editedProducts[prod.productId]}
                            className="form-control"
                            style={{ width: "90px" }}
                            onChange={(e) =>
                              handleQtyChange(prod.productId, e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Close
                </button>
                <button className="btn btn-success" onClick={handleSaveChanges}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MasterLayout>
  );
}
