"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";

const initialSupplier = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  products: [],
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialSupplier);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/suppliers/api");
      const data = await res.json();
      console.log(data);
      setSuppliers(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError("Failed to load suppliers");
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const res = await fetch("/products/api");
    const data = await res.json();
    setProducts(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSelect = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(options[i].value);
    }
    setForm((prev) => ({ ...prev, products: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const method = editingId ? "PUT" : "POST";
      const url = "/suppliers/api";
      const body = editingId ? { ...form, _id: editingId } : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save supplier");
      await fetchSuppliers();
      setForm(initialSupplier);
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Error saving supplier");
    }
  };

  return (
    <MasterLayout>
      <div className="container py-4">
        <Breadcrumb title='Suppliers' />
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-2">
            <input type="text" name="name" className="form-control" placeholder="Name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="col-md-2">
            <input type="text" name="contact" className="form-control" placeholder="Contact" value={form.contact} onChange={handleChange} />
          </div>
          <div className="col-md-2">
            <input type="email" name="email" className="form-control" placeholder="Email" value={form.email} onChange={handleChange} />
          </div>
          <div className="col-md-2">
            <input type="text" name="phone" className="form-control" placeholder="Phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="col-md-2">
            <input type="text" name="address" className="form-control" placeholder="Address" value={form.address} onChange={handleChange} />
          </div>
          {/*<div className="col-md-2">
            <select name="products" className="form-control" multiple value={form.products} onChange={handleProductSelect}>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>*/}
          <div className="col-12 mb-20">
            <button type="submit" className="btn btn-success">{editingId ? "Update Supplier" : "Create Supplier"}</button>
            {editingId && <button type="button" className="btn btn-secondary ms-2" onClick={() => { setEditingId(null); setForm(initialSupplier); }}>Cancel</button>}
          </div>
        </form>
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {loading ? (
          <div className="text-center py-5">
            <Icon icon="eos-icons:loading" className="icon text-3xl" /> Loading...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  {/*<th>Products</th>*/}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">No suppliers found.</td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.contact}</td>
                      <td>{s.email}</td>
                      <td>{s.phone}</td>
                      <td>{s.address}</td>
                      {/*<td>
                        <ul>
                          {s.products?.map((p) => (
                            <li key={p._id || p}>{p.name || p}</li>
                          ))}
                        </ul>
                      </td>*/}
                      <td>
                        <button className="btn btn-sm btn-warning me-2" onClick={() => { setEditingId(s._id); setForm({ ...s, products: s.products?.map(p => p._id || p) }); }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={async () => { await fetch(`/suppliers/api?id=${s._id}`, { method: "DELETE" }); fetchSuppliers(); }}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
