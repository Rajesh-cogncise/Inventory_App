"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState } from "react";
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import MasterLayout from "@/masterLayout/MasterLayout";

export default function StockTransfersPage() {
  const [form, setForm] = useState({
    date: '',
    invoiceNo: '',
    products: [], // array of { value, label, quantity, variationId }
    total: 0,
    warehouseId: '',
    supplier: '',
  });
  const [loading, setLoading] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [supplierOptions, setSuppliersOptions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch warehouses from API
    const fetchWarehouses = async () => {
      try {
        const res = await fetch('/api/warehouses');
        const data = await res.json();
        if (Array.isArray(data)) {
          setWarehouseOptions(data.map(w => ({ value: w._id, label: w.name })));
        }
      } catch (err) {
        setWarehouseOptions([]);
      }
      setLoading(false);
    };
    fetchWarehouses();

    // Fetch Suppliers

    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/supplier');
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuppliersOptions(data.map(w => ({ value: w._id, label: w.name })));
        }
      } catch (err) {
        setSuppliersOptions([]);
      }
      setLoading(false);
    };
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch('/stock-purchase/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      console.log(form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create stock purchase');
      setForm({
        date: '',
        invoiceNo: '',
        products: [],
        total: 0,
        supplier: '',
        warehouseId: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    } 
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Async load product options
  const loadProductOptions = async (inputValue, callback) => {
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(inputValue)}`);
      const data = await res.json();
      const options = Array.isArray(data)
        ? data.map(product => ({ value: product._id, label: product.name }))
        : [];
      callback(options);
    } catch (err) {
      callback([]);
    }
  };

  // Handle product selection
  const handleProductsChange = (selected) => {
    // Add default quantity and variationId if not present
    const withDetails = Array.isArray(selected)
      ? selected.map(opt => {
        // const existing = form.products.find(p => p.value === opt.value) || {};
        return {
          ...opt,
          productId: opt.value,
          quantity: 1,
        };
      })
      : [];

    setForm({ ...form, products: withDetails });
  };

  // Handle quantity/variation change for a product
  const handleProductFieldChange = (idx, field, value) => {
    const updated = form.products.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p
    );
    const total = updated.reduce((sum, p) => {
      const price = parseFloat(p.price) || 0;
      const quantity = parseInt(p.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
    setForm({ ...form, products: updated, total: total });
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Stock Purchase' />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        <form className="flex flex-column g-3 mb-4" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              name="date"
              className="form-control"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Invoice No</label>
            <input
              type="text"
              name="invoiceNo"
              className="form-control"
              value={form.invoiceNo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">From Supplier</label>
            <Select
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,
                  background: 'transparent',
                }),
                noOptionsMessage: (baseStyles) => ({
                  ...baseStyles,
                  color: '#202020',
                }),
                option: (baseStyles) => ({
                  ...baseStyles,
                  color: '#202020',
                }),
              }}
              options={supplierOptions}
              value={supplierOptions.find(opt => opt.value === form.supplier) || null}
              onChange={opt => setForm({ ...form, supplier: opt ? opt.value : '' })}
              isClearable
              placeholder="Select from Suppliers..."
              isDisabled={loading}
              name="supplier"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">To Warehouse</label>
            <Select
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,
                  background: 'transparent',
                }),
                noOptionsMessage: (baseStyles) => ({
                  ...baseStyles,
                  color: '#202020',
                }),
                option: (baseStyles) => ({
                  ...baseStyles,
                  color: '#202020',
                }),
              }}
              options={warehouseOptions}
              value={warehouseOptions.find(opt => opt.value === form.warehouseId) || null}
              onChange={opt => setForm({ ...form, warehouseId: opt ? opt.value : '' })}
              isClearable
              placeholder="Select from warehouse..."
              isDisabled={loading}
              name="fromWarehouseId"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Products</label>
            <AsyncSelect
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,
                  background: 'transparent',
                }),
                noOptionsMessage: (baseStyles) => ({
                  ...baseStyles,
                  color: '#202020',
                }),
                option: (baseStyles) => ({
                  ...baseStyles,
                  color: '#202020',
                }),
              }}
              isMulti
              cacheOptions
              defaultOptions
              value={form.products}
              loadOptions={loadProductOptions}
              onChange={handleProductsChange}
              placeholder="Search and select products..."
              isClearable
              name="products"
            />
          </div>
          {Array.isArray(form.products) && form.products.length > 0 && (
            <div className="table-responsive mb-3">
              <table className="table basic-border-table mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {form.products.map((product, idx) => (
                    <tr key={product.value}>
                      <td>{product.label}</td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={product.price || ''}
                          onChange={e => handleProductFieldChange(idx, 'price', e.target.value)}
                          placeholder="Price"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          value={product.quantity || 1}
                          onChange={e => handleProductFieldChange(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Total Cost</label>
            <input
              type="number"
              name="totalCost"
              className="form-control"
              value={form.total}
              readOnly
            />
          </div>
          <div className=" d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Purchase
            </button>
          </div>
        </form>
      </div>
    </MasterLayout>
  );
}
