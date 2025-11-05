"use client";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";

export default function StockPurchasedPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/stock-purchase/api");
        const data = await res.json();
        setPurchases(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Error fetching purchased stock");
        setPurchases([]);
      }
      setLoading(false);
    };
    fetchPurchases();
  }, []);

  return (
    <MasterLayout>
      <Breadcrumb title='Stock purchased' />
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}
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
                  <th>Warehouse</th>
                  <th>Products</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase, idx) => (
                  <tr key={purchase._id || idx}>
                    <td>{purchase.date}</td>
                    <td>{purchase.invoiceNo}</td>
                    <td>{purchase.warehouseId && purchase.warehouseId.name ? purchase.warehouseId.name : ''}</td>
                    <td>
                      {Array.isArray(purchase.products)
                        ? purchase.products.map((p, i) => (
                            <div key={i}>
                              {p.productId && p.label ? p.label : ''} (Qty: {p.quantity}, Price: {p.price})
                            </div>
                          ))
                        : ''}
                    </td>
                    <td>{purchase.total || ''}</td>
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
