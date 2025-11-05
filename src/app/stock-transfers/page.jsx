"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";

const initialForm = {
  fromWarehouseId: "",
  toWarehouseId: "",
  productId: "",
  variationId: "",
  quantity: 0,
  reason: "",
};

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/stock-transfers/api");
      const data = await res.json();
      setTransfers(data);
    } catch (err) {
      setError("Failed to load transfers");
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/stock-transfers/api?id=${editingId}` : "/stock-transfers/api";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save transfer");
      await fetchTransfers();
      setForm(initialForm);
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Error saving transfer");
    }
    setSubmitLoading(false);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      fromWarehouseId: item.fromWarehouseId,
      toWarehouseId: item.toWarehouseId,
      productId: item.productId,
      variationId: item.variationId,
      quantity: item.quantity,
      reason: item.reason,
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this transfer?")) return;
    setError("");
    try {
      const res = await fetch(`/stock-transfers/api?id=${item._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transfer");
      await fetchTransfers();
    } catch (err) {
      setError("Failed to delete transfer");
    }
  };

  return (
    <MasterLayout>
        <Breadcrumb title='Stock Transfers' />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {/* <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-2">
            <input type="text" name="fromWarehouseId" className="form-control" placeholder="From Warehouse ID" value={form.fromWarehouseId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="text" name="toWarehouseId" className="form-control" placeholder="To Warehouse ID" value={form.toWarehouseId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="text" name="productId" className="form-control" placeholder="Product ID" value={form.productId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="text" name="variationId" className="form-control" placeholder="Variation ID" value={form.variationId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="number" name="quantity" className="form-control" placeholder="Quantity" value={form.quantity} onChange={handleChange} required />
          </div>
          <div className="col-md-1">
            <input type="text" name="reason" className="form-control" placeholder="Reason" value={form.reason} onChange={handleChange} />
          </div>
          <div className="col-md-1 d-flex gap-2">
            <button type="submit" className="btn btn-success" disabled={submitLoading}>
              {editingId ? "Update" : "Add"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(initialForm); }}>
                Cancel
              </button>
            )}
          </div>
        </form> */}
        {loading ? (
          <div className="text-center py-5">
            <Icon icon="eos-icons:loading" className="icon text-3xl" /> Loading...
          </div>
        ) : (
          <div className="text-center py-5">
            <Icon icon="eos-icons:loading" className="icon text-3xl" /> Coming Soon...
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
