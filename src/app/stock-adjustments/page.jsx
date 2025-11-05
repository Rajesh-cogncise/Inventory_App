"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";

const initialForm = {
  warehouseId: "",
  productId: "",
  variationId: "",
  quantity: 0,
  reason: "",
};

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/stock-adjustments/api");
      const data = await res.json();
      setAdjustments(data);
    } catch (err) {
      setError("Failed to load adjustments");
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
      const url = editingId ? `/stock-adjustments/api?id=${editingId}` : "/stock-adjustments/api";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save adjustment");
      await fetchAdjustments();
      setForm(initialForm);
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Error saving adjustment");
    }
    setSubmitLoading(false);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      warehouseId: item.warehouseId,
      productId: item.productId,
      variationId: item.variationId,
      quantity: item.quantity,
      reason: item.reason,
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this adjustment?")) return;
    setError("");
    try {
      const res = await fetch(`/stock-adjustments/api?id=${item._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete adjustment");
      await fetchAdjustments();
    } catch (err) {
      setError("Failed to delete adjustment");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Stock Adjustments' />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {/* <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-2">
            <input type="text" name="warehouseId" className="form-control" placeholder="Warehouse ID" value={form.warehouseId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="text" name="productId" className="form-control" placeholder="Product ID" value={form.productId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="text" name="variationId" className="form-control" placeholder="Variation ID" value={form.variationId} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="number" name="quantity" className="form-control" placeholder="Quantity (+/-)" value={form.quantity} onChange={handleChange} required />
          </div>
          <div className="col-md-3">
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
