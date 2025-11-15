"use client";

import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });

export default function StockAdjustmentsPage() {
  const [purchases, setPurchases] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
  const [editedPurchase, setEditedPurchase] = useState({});
  const [removedProducts, setRemovedProducts] = useState([]);

  // Fetch data
  useEffect(() => {
    fetchWarehouses();
    fetchSuppliers();
    fetchPurchases();
  }, []);

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

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/suppliers/api");
      const data = await res.json();
      setSuppliers(data);
    } catch {
      console.error("Failed to load suppliers");
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
      const res = await fetch(`/stock-adjustments/api?${params.toString()}`);
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

    // map products
    const productMap = {};
    purchase.products.forEach((p) => {
      productMap[p.productId] = p.quantity;
    });
    setEditedProducts(productMap);

    // set purchase fields
    setEditedPurchase({
      invoiceNo: purchase.invoiceNo || "",
      date: purchase.date ? new Date(purchase.date).toISOString().split("T")[0] : "",
      warehouseId: purchase.warehouseId?._id || "",
      supplierId: purchase.supplier?._id || "",
      gstpercent: purchase.gstpercent || 10,
    });

    setRemovedProducts([]);
    setModalOpen(true);
  };

  const handleQtyChange = (productId, value) => {
    setEditedProducts((prev) => ({
      ...prev,
      [productId]: Number(value),
    }));
  };

  const handleRemoveProduct = (productId) => {
    setEditedProducts((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    setRemovedProducts((prev) => [...prev, productId]);
  };
  
  const handleSaveChanges = async () => {
  try {
    if (!selectedPurchase) throw new Error("No purchase selected");

    // ✅ Build products correctly
    const validProducts = selectedPurchase.products
      .filter((p) => !removedProducts.includes(p.productId))
      .map((p) => {
        const newQty = Number(editedProducts[p.productId] ?? p.quantity);
        const oldQty = Number(p.quantity);
        const difference = newQty - oldQty;

        return {
          productId: p.productId,   // ✅ must be a string, backend casts to ObjectId
          oldQuantity: oldQty,
          newQuantity: newQty,
          difference: difference,
        };
      });

    const payload = {
      purchaseId: selectedPurchase._id,
      warehouseId: editedPurchase.warehouseId,
      products: validProducts,
      removedProducts,
      purchaseFields: {
        invoiceNo: editedPurchase.invoiceNo,
        date: editedPurchase.date,
        warehouseId: editedPurchase.warehouseId,
        supplierId: editedPurchase.supplierId,

        // ✅ Add these mandatory fields with fallback/defaults
        gst: selectedPurchase.gst ?? 0,
        gstpercent: selectedPurchase.gstpercent ?? editedPurchase.gstpercent ?? 0,
        subtotal: selectedPurchase.subtotal ?? 0,
      },
    };

    console.log("✅ Sending payload:", JSON.stringify(payload, null, 2));

    const res = await fetch("/stock-adjustments/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to save stock adjustment");
    }

    await fetchPurchases();
    setModalOpen(false);
    alert("Stock adjustment saved successfully!");
  } catch (err) {
    console.error("❌ Error saving stock adjustment:", err);
    alert(err.message || "Something went wrong while saving stock adjustment");
  }
};


  return (
    <MasterLayout>
      <Breadcrumb title="Stock Adjustments" />

      <div className="container py-4">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Filters */}
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

        {/* Table */}
        {loading ? (
          <div className="text-center py-5">
            <Icon icon="eos-icons:loading" className="text-3xl" /> Loading...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table basic-border-table mb-0 align-middle">
              <thead>
                <tr>
                  <th className="text-center">Sr.No</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Warehouse</th>
                  <th>Supplier</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length > 0 ? (
                  purchases.map((p, i) => (
                    <tr key={p._id}>
                      <td className="text-center">{(page - 1) * 10 + (i + 1)}</td>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td>{p.invoiceNo}</td>
                      <td>{p.warehouseId?.name}</td>
                      <td>{p.supplier?.name}</td>
                      <td>
                        {p.isTransferred ? (
                          <span className="badge bg-secondary">Products Transferred Cannot Modify the purchase.</span>
                        ) : (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => openEditModal(p)}
                          >
                            Edit Stock
                          </button>
                        )}
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

      {/* Modal */}
      {modalOpen && selectedPurchase && (
        <div className="modal fade show d-block" style={{ background: "#0008" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Purchase — {editedPurchase.invoiceNo}</h5>
                <button
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>

              <div className="modal-body">
                {/* Editable Fields */}
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <label className="form-label">Invoice No</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editedPurchase.invoiceNo}
                      onChange={(e) =>
                        setEditedPurchase((prev) => ({
                          ...prev,
                          invoiceNo: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editedPurchase.date}
                      onChange={(e) =>
                        setEditedPurchase((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Warehouse</label>
                    <select
                      className="form-select"
                      value={editedPurchase.warehouseId}
                      onChange={(e) =>
                        setEditedPurchase((prev) => ({
                          ...prev,
                          warehouseId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Supplier</label>
                    <select
                      className="form-select"
                      value={editedPurchase.supplierId}
                      onChange={(e) =>
                        setEditedPurchase((prev) => ({
                          ...prev,
                          supplierId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Products */}
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Sr.No</th>
                      <th>Product</th>
                      <th>Current Qty</th>
                      <th>New Qty</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.products.map((prod, i) =>
                      !removedProducts.includes(prod.productId) ? (
                        <tr key={prod.productId}>
                          <td>{i + 1}</td>
                          <td>{prod.label}</td>
                          <td>{prod.quantity}</td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: "90px" }}
                              value={editedProducts[prod.productId] || 0}
                              onChange={(e) =>
                                handleQtyChange(prod.productId, e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveProduct(prod.productId)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ) : null
                    )}
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
