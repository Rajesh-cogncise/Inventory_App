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
  // editedProducts: { [productIdString]: { productId, label, quantity, price, originalQuantity? } }
  // quantity and price may be numbers or "" (empty string) — empty string prevents NaN in inputs
  const [editedProducts, setEditedProducts] = useState({});
  const [editedPurchase, setEditedPurchase] = useState({});
  const [removedProducts, setRemovedProducts] = useState([]);

  // New product state (strings so empty input doesn't produce NaN)
  const [newProductQty, setNewProductQty] = useState("1");
  const [newProductPrice, setNewProductPrice] = useState("0");
  const [allProducts, setAllProducts] = useState([]); // fetch all products
  const [newSelectedProduct, setNewSelectedProduct] = useState(null);

  // side effects: fetch lookups and purchases
  useEffect(() => {
    fetchWarehouses();
    fetchSuppliers();
    fetchPurchases();
    fetchAllProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, fromDate, toDate, page]);

  // fetch all products from /products/api (Option A confirmed)
  const fetchAllProducts = async () => {
    try {
      const res = await fetch("/products/api");
      const data = await res.json();
      setAllProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products", err);
      setAllProducts([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/warehouses/api");
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load warehouses", err);
      setWarehouses([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/suppliers/api");
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load suppliers", err);
      setSuppliers([]);
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

      setPurchases(data.items || data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching purchases:", err);
      setError(err.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal and prepare editedProducts map
  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);

    const productMap = {};
    (purchase.products || []).forEach((p) => {
      const id = String(p.productId);
      productMap[id] = {
        productId: id,
        label:
          p.label ||
          p.name ||
          (p.product && (p.product.label || p.product.name)) ||
          id,
        // Use number or empty string. here we use numeric initial values
        quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
        price: Number.isFinite(Number(p.price)) ? Number(p.price) : 0,
        originalQuantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      };
    });
    setEditedProducts(productMap);

    setEditedPurchase({
      invoiceNo: purchase.invoiceNo || "",
      date: purchase.date ? new Date(purchase.date).toISOString().split("T")[0] : "",
      warehouseId: purchase.warehouseId?._id || purchase.warehouseId || "",
      supplierId: purchase.supplier?._id || purchase.supplier || "",
      gstpercent: purchase.gstpercent ?? 0,
    });

    setRemovedProducts([]);
    setNewSelectedProduct(null);
    setNewProductQty("1");
    setNewProductPrice("0");
    setModalOpen(true);
  };

  // selection for new product (react-select returns object or null)
  const handleAddProductSelect = (product) => {
    setNewSelectedProduct(product);
    if (product?.price !== undefined && product?.price !== null) {
      setNewProductPrice(String(product.price));
    }
  };

  // add new product into editedProducts map
  const addNewProductToList = () => {
    if (!newSelectedProduct || !(newSelectedProduct._id || newSelectedProduct.id || newSelectedProduct.productId)) {
      alert("Please select a product to add");
      return;
    }

    const id = String(newSelectedProduct._id || newSelectedProduct.id || newSelectedProduct.productId);
    const qtyToAdd = Math.max(0, Number(newProductQty === "" ? 0 : Number(newProductQty)));
    const priceToUse = Number(newProductPrice === "" ? 0 : Number(newProductPrice));

    setEditedProducts((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        copy[id] = {
          ...copy[id],
          quantity: Number(copy[id].quantity || 0) + qtyToAdd,
          price: priceToUse,
        };
      } else {
        copy[id] = {
          productId: id,
          label: newSelectedProduct.label || newSelectedProduct.name || id,
          quantity: qtyToAdd,
          price: priceToUse,
          originalQuantity: 0,
        };
      }
      return copy;
    });

    // reset new product inputs
    setNewSelectedProduct(null);
    setNewProductQty("1");
    setNewProductPrice("0");
  };

  // remove product from the edited list; if originally present, mark removed
  const handleRemoveProduct = (productId) => {
    const id = String(productId);
    setEditedProducts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    const originallyExisted = (selectedPurchase?.products || []).some(
      (p) => String(p.productId) === id
    );
    if (originallyExisted) {
      setRemovedProducts((prev) => {
        const set = new Set(prev.map(String));
        set.add(id);
        return Array.from(set);
      });
    }
  };

  // Helpers to safely update quantity/price in editedProducts, allow empty string in inputs
  const updateProductField = (pid, field, rawValue) => {
    // rawValue is string from input
    let value;
    if (rawValue === "") {
      // keep empty string in UI (so user can clear)
      value = "";
    } else {
      // parse number (allow decimals)
      const n = Number(rawValue);
      value = Number.isNaN(n) ? "" : n;
    }

    setEditedProducts((prev) => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        [field]: value,
      },
    }));
  };

  // Save changes: build payload consistent with backend expectation
  const handleSaveChanges = async () => {
  try {
    if (!selectedPurchase) throw new Error("No purchase selected");

    // Map products: include oldQuantity per product
    const productsArray = Object.values(editedProducts).map((p) => {
      // Find the original product in this purchase
      const original = (selectedPurchase.products || []).find(
        (sp) => String(sp.productId) === String(p.productId)
      );
      const oldQty = original ? Number(original.quantity || 0) : 0;
      const newQty = Math.max(0, Number(p.quantity ?? 0));

      return {
        productId: String(p.productId),
        label: p.label,
        oldQuantity: oldQty,    // quantity in current purchase before edit
        newQuantity: newQty,    // quantity after edit
        difference: newQty - oldQty,
        price: Number(p.price ?? 0),
      };
    });

    const payload = {
      purchaseId: selectedPurchase._id,
      purchaseFields: {
        invoiceNo: editedPurchase.invoiceNo,
        date: editedPurchase.date,
        warehouseId: editedPurchase.warehouseId,
        supplierId: editedPurchase.supplierId,
        gst: selectedPurchase.gst ?? 0,
        gstpercent: editedPurchase.gstpercent ?? selectedPurchase.gstpercent ?? 0,
        subtotal: selectedPurchase.subtotal ?? 0,
      },
      products: productsArray,
      removedProducts: removedProducts.map(String),
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    const res = await fetch("/stock-adjustments/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to save stock adjustment");
    }

    await fetchPurchases();
    setModalOpen(false);
    setEditedProducts({});
    alert("Stock adjustment saved successfully!");
  } catch (err) {
    console.error("Error saving stock adjustment:", err);
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
                      <td>{p.date ? new Date(p.date).toLocaleDateString() : "-"}</td>
                      <td>{p.invoiceNo}</td>
                      <td>{p.warehouseId?.name}</td>
                      <td>{p.supplier?.name}</td>
                      <td>
                        {p.isTransferred ? (
                          <span className="badge bg-secondary">
                            Products Transferred Cannot Modify the purchase.
                          </span>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => openEditModal(p)}>
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
                onClick={() => setPage((s) => Math.max(1, s - 1))}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((s) => s + 1)}
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
                  onClick={() => {
                    setModalOpen(false);
                    setEditedProducts({});
                  }}
                />
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
                      onChange={(e) => setEditedPurchase((prev) => ({ ...prev, invoiceNo: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editedPurchase.date}
                      onChange={(e) => setEditedPurchase((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Warehouse</label>
                    <select
                      className="form-select"
                      value={editedPurchase.warehouseId || ""}
                      onChange={(e) => setEditedPurchase((prev) => ({ ...prev, warehouseId: e.target.value }))}
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
                      value={editedPurchase.supplierId || ""}
                      onChange={(e) =>
                        setEditedPurchase((prev) => ({ ...prev, supplierId: e.target.value }))
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

                {/* Add New Product */}
                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <Select
                      options={allProducts}
                      getOptionLabel={(p) => p.label || p.name || p._id}
                      getOptionValue={(p) => p._id}
                      value={newSelectedProduct}
                      onChange={handleAddProductSelect}
                      placeholder="Select Product"
                      isClearable
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Quantity"
                      min={0}
                      value={newProductQty}
                      onChange={(e) => setNewProductQty(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price"
                      min={0}
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                    />
                  </div>
                  <div className="col-md-1">
                    <button className="btn btn-primary" onClick={addNewProductToList}>
                      Add
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Sr.No</th>
                      <th>Product</th>
                      <th>Current Qty</th>
                      <th>New Qty</th>
                      <th>Price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(editedProducts).length > 0 ? (
                      Object.entries(editedProducts).map(([pid, p], i) => {
                        const original = (selectedPurchase.products || []).find(
                          (sp) => String(sp.productId) === String(pid)
                        );
                        const currentQty = original ? Number(original.quantity || 0) : 0;

                        // input values: show "" for empty states, else show number
                        const qtyValue = p.quantity === "" ? "" : p.quantity;
                        const priceValue = p.price === "" ? "" : p.price;

                        return (
                          <tr key={pid}>
                            <td>{i + 1}</td>
                            <td>{p.label || (original && (original.label || original.name)) || pid}</td>
                            <td>{currentQty}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: "80px" }}
                                min={0}
                                value={qtyValue}
                                onChange={(e) => updateProductField(pid, "quantity", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: "80px" }}
                                min={0}
                                value={priceValue}
                                onChange={(e) => updateProductField(pid, "price", e.target.value)}
                              />
                            </td>
                            <td>
                              <button className="btn btn-sm btn-danger" onClick={() => handleRemoveProduct(pid)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          No products in invoice
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setModalOpen(false);
                    setEditedProducts({});
                  }}
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
