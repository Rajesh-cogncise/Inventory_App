"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";

export default function ReportsPage() {
  const [lowStock, setLowStock] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [stockHistory, setStockHistory] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLowStock();
    fetchInventoryValue();
    fetchStockHistory();
  }, []);

  const fetchLowStock = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/warehouse-inventory/api?lowStock=true");
      const data = await res.json();
      setLowStock(data);
    } catch (err) {
      setError("Failed to load low stock report");
    }
    setLoading(false);
  };

  const fetchConsumption = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/jobs/api?report=consumption";
      if (dateRange.from && dateRange.to) {
        url += `&from=${dateRange.from}&to=${dateRange.to}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setConsumption(data);
    } catch (err) {
      setError("Failed to load consumption report");
    }
    setLoading(false);
  };

  const fetchInventoryValue = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/warehouse-inventory/api?report=value");
      const data = await res.json();
      setInventoryValue(data.value || 0);
    } catch (err) {
      setError("Failed to load inventory value");
    }
    setLoading(false);
  };

  const fetchStockHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/warehouse-inventory/api?report=history");
      const data = await res.json();
      setStockHistory(data);
    } catch (err) {
      setError("Failed to load stock movement history");
    }
    setLoading(false);
  };

  return (
    <MasterLayout>
        <Breadcrumb title='Reports' />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        <div className="mb-5">
          <h6 className="fw-light">Low Stock Report</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Warehouse</th>
                  <th>Product</th>
                  <th>Variation</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 ? (
                  <tr><td colSpan={5} className="text-center">No low stock items.</td></tr>
                ) : (
                  lowStock.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.warehouseId}</td>
                      <td>{item.productId}</td>
                      <td>{item.variationId}</td>
                      <td>{item.currentStock}</td>
                      <td>{item.minimumStockLevel}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mb-5">
          <h6 className="fw-light">Product Consumption Report</h6>
          <form className="row g-2 mb-2" onSubmit={e => { e.preventDefault(); fetchConsumption(); }}>
            <div className="col-auto">
              <input type="date" className="form-control" value={dateRange.from} onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))} />
            </div>
            <div className="col-auto">
              <input type="date" className="form-control" value={dateRange.to} onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))} />
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" type="submit">Filter</button>
            </div>
          </form>
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Job</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Variation</th>
                  <th>Quantity</th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {consumption.length === 0 ? (
                  <tr><td colSpan={7} className="text-center">No consumption records.</td></tr>
                ) : (
                  consumption.map((c, idx) => (
                    <tr key={idx}>
                      <td>{c._id}</td>
                      <td>{c.userId}</td>
                      <td>{new Date(c.createdAt).toLocaleString()}</td>
                      <td>{c.productId}</td>
                      <td>{c.variationId}</td>
                      <td>{c.quantity}</td>
                      <td>{c.warehouseId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mb-5">
          <h6 className="fw-light">Inventory Value Report</h6>
          <div className="alert alert-info">
            Total Inventory Value: <strong>${inventoryValue.toLocaleString()}</strong>
          </div>
        </div>
        <div className="mb-5">
          <h6 className="fw-light">Stock Movement History</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Warehouse</th>
                  <th>Product</th>
                  <th>Variation</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>User</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {stockHistory.length === 0 ? (
                  <tr><td colSpan={8} className="text-center">No stock movement history.</td></tr>
                ) : (
                  stockHistory.map((h, idx) => (
                    <tr key={idx}>
                      <td>{new Date(h.date).toLocaleString()}</td>
                      <td>{h.warehouseId}</td>
                      <td>{h.productId}</td>
                      <td>{h.variationId}</td>
                      <td>{h.type}</td>
                      <td>{h.quantity}</td>
                      <td>{h.userId}</td>
                      <td>{h.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
}
