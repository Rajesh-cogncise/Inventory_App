"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState, useCallback } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";
import Select from "react-select";

/**
 * StockPurchasedPage with filters:
 * - Supplier (react-select)
 * - Warehouse (react-select)
 * - From Date (from -> today)
 *
 * Default: loads ALL purchases 
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
    fetchPurchases(false); // initial: load all (NF1)
  }, [fetchPurchases]);

  // handlers
  const onSearch = () => fetchPurchases(true);
  const onReset = () => {
    setFilters({ warehouse: null, supplier: null, from: "", to: ""  });
    fetchPurchases(false); // load all
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Stock purchased" />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {/* FILTER BAR */}
        
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
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Supplier Name</th>
                  <th>Warehouse</th>
                  <th>Products</th>
                  <th>Quantity</th>
                  <th>Price/unit</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase, idx) => (
                  <tr key={purchase._id || idx}>
                    <td>{purchase.date ? new Date(purchase.date).toLocaleDateString() : ""}</td>
                    <td>{purchase.invoiceNo}</td>
                    <td>{purchase.supplier?.name || ""}</td>
                    <td>{purchase.warehouseId?.name || ""}</td>
                    <td>
                      {Array.isArray(purchase.products)
                        ? purchase.products.map((p, i) => <div key={i}>{p.label || (p.productId && p.productId.name) || ""}</div>)
                        : ""}
                    </td>
                    <td>
                      {Array.isArray(purchase.products)
                        ? purchase.products.map((p, i) => <div key={i}>{p.quantity}</div>)
                        : ""}
                    </td>
                    <td>
                      {Array.isArray(purchase.products)
                        ? purchase.products.map((p, i) => <div key={i}>${p.price}</div>)
                        : ""}
                    </td>
                    <td>${purchase.total || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
