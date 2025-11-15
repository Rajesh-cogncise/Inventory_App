// app/(your-route)/warehouse-inventory-page.jsx
"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import React, { useMemo, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { flexRender } from "@tanstack/react-table";

function formatDecimal3(val) {
  if (val === null || val === undefined) return "0.000";
  if (typeof val === "object" && (val.$numberDecimal || val.toString)) {
    const s = val.$numberDecimal ? val.$numberDecimal : val.toString();
    return Number(s).toFixed(3);
  }
  return Number(val).toFixed(3);
}

export default function WarehouseInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalRows, setModalRows] = useState([]); // invoices returned by API
  const [modalProductName, setModalProductName] = useState("");
  const [modalWarehouseName, setModalWarehouseName] = useState("");

  useEffect(() => {
    fetchWarehouses();
    fetchInventory();
  }, []);

  async function fetchWarehouses() {
    try {
      const res = await fetch("/warehouses/api");
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      setWarehouses([]);
    }
  }

  async function fetchInventory(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse) params.append("warehouseId", selectedWarehouse);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      const url = params.toString() ? `/warehouse-inventory/api/warehouse-inventory?${params.toString()}` : `/warehouse-inventory/api`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Error fetching inventory");
        setInventory([]);
      } else {
        setInventory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("Error fetching inventory");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  // Flat rows (one row per product)
  // Replace your flattenedData useMemo with this robust version
const flattenedData = useMemo(() => {
  if (!Array.isArray(inventory) || inventory.length === 0) return [];

  const merged = {};

  for (const record of inventory) {
    // Possible warehouse id/name locations
    const warehouseObj = record?.warehouseId;
    const warehouseId = warehouseObj?._id ?? warehouseObj ?? record?.warehouseId ?? "unknown";
    const warehouseName = (warehouseObj && (warehouseObj.name || warehouseObj.label)) || record?.warehouse || "N/A";

    // CASE A: record has products[] array (your canonical schema)
    if (Array.isArray(record.products) && record.products.length > 0) {
      for (const p of record.products) {
        // productId might be nested object or string
        const prodObj = p?.productId;
        const productId = prodObj?._id ?? prodObj ?? String(p?.productId ?? "");
        if (!productId) continue;

        const key = `${warehouseId}_${productId}`;

        const productName =
          (prodObj && (prodObj.name || prodObj.label)) ||
          p?.label ||
          p?.name ||
          "N/A";

        const qty = Number(p?.quantity ?? 0);

        if (!merged[key]) {
          merged[key] = {
            _inventoryId: record?._id,
            warehouseId,
            warehouse: warehouseName,
            productId,
            productName,
            productLabel: p?.label ?? "",
            type: (prodObj && prodObj.type) || p?.type || "N/A",
            quantity: qty,
          };
        } else {
          merged[key].quantity += qty;
        }
      }

      continue; // move to next record
    }

    // CASE B: record itself is already a grouped inventory item
    // e.g. { productId: {...} , totalQuantity: X } or { productId: id, quantity: X }
    const maybeProdObj = record?.productId;
    const maybeProductId = maybeProdObj?._id ?? maybeProdObj ?? record?.productId ?? null;

    if (maybeProductId) {
      const productId = String(maybeProductId);
      const key = `${warehouseId}_${productId}`;

      const productName =
        (maybeProdObj && (maybeProdObj.name || maybeProdObj.label)) ||
        record?.productName ||
        record?.productLabel ||
        "N/A";

      // prefer explicit totals, fall back to quantity or currentStock
      const qty =
        Number(record?.totalQuantity ?? record?.quantity ?? record?.currentStock ?? 0);

      if (!merged[key]) {
        merged[key] = {
          _inventoryId: record?._id,
          warehouseId,
          warehouse: warehouseName,
          productId,
          productName,
          productLabel: record?.productLabel ?? "",
          type: (maybeProdObj && maybeProdObj.type) || record?.type || "N/A",
          quantity: qty,
        };
      } else {
        merged[key].quantity += qty;
      }

      continue;
    }

    // CASE C: defensive - sometimes record.products missing but record contains nested product info under different names
    // attempt to find any plausible product-like fields
    if (record?.products === undefined && (record?.product || record?.items)) {
      const arr = record.product ? [record.product] : record.items;
      if (Array.isArray(arr)) {
        for (const p of arr) {
          const productId = p?.productId?._id ?? p?.productId ?? p?._id ?? p?.id;
          if (!productId) continue;
          const key = `${warehouseId}_${productId}`;
          const productName = p?.label || p?.name || "N/A";
          const qty = Number(p?.quantity ?? 0);
          if (!merged[key]) {
            merged[key] = {
              _inventoryId: record?._id,
              warehouseId,
              warehouse: warehouseName,
              productId,
              productName,
              productLabel: p?.label ?? "",
              type: p?.type ?? "N/A",
              quantity: qty,
            };
          } else {
            merged[key].quantity += qty;
          }
        }
      }
    }
  }

  // Return as array consumed by your table (same shape as before)
  return Object.values(merged);
}, [inventory]);


  const totalQuantity = flattenedData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // columns for table
  const columns = React.useMemo(() => [
    { header: "Sr. No", accessorFn: (_, i) => i + 1, id: "srNo" },
    { accessorKey: 'warehouse', header: 'Warehouse' },
    { accessorKey: 'productName', header: 'Product Name' },
    { accessorKey: 'type', header: 'Product Type' },
    { accessorKey: 'quantity', header: 'Quantity' },
    {
      id: "p_actions",
      header: "Purchases Done",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => openProductModal(r)}
          >
            View Purchase
          </button>
        );
        }
      }

  ], []);

  const table = useReactTable({
    data: flattenedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  // OPEN modal -> fetch invoices for product + warehouse
  async function openProductModal(row) {
    const pid = row.productId;
    const wid = row.warehouseId;
    setModalProductName(row.productName || row.productLabel || "Product");
    setModalWarehouseName(row.warehouse || "");
    setModalOpen(true);
    setModalLoading(true);
    setModalRows([]);

    try {
      const params = new URLSearchParams({ productId: pid, warehouseId: wid });
      const res = await fetch(`/warehouse-inventory/api/purchases-by-product?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setModalRows([]);
        setError(data.error || "Failed to fetch purchases for product");
      } else {
        setModalRows(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setModalRows([]);
      setError("Failed to fetch purchases for product");
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setModalRows([]);
  }

  return (
    <MasterLayout>
      <Breadcrumb title='Warehouses Inventory' />
      <div className="container py-4">
        <div className="d-flex align-items-center gap-10 mb-10">
          <Link href="/warehouses" className="btn btn-primary d-flex align-items-center">
            <Icon icon="mage:home-3" className="me-2" /> All Warehouses
          </Link>

          <form onSubmit={fetchInventory} className="d-flex align-items-center gap-2">
            <select name="warehouseId" className="form-control" onChange={e => setSelectedWarehouse(e.target.value)} value={selectedWarehouse}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}{w.location ? ` (${w.location})` : ""}</option>)}
            </select>

            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            <button type="submit" className="btn btn-primary ms-2">Search</button>
            <button type="button" className="btn btn-outline-secondary ms-1" onClick={() => { setSelectedWarehouse(""); setFromDate(""); setToDate(""); fetchInventory(); }}>Reset</button>
          </form>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {loading ? (
          <div className="text-center py-5"><Icon icon="eos-icons:loading" className="icon text-3xl" /> Loading...</div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-10">Warehouse Inventory</h5>
              <input type="text" placeholder="Search all columns..." value={table.getState().globalFilter ?? ''} onChange={e => table.setGlobalFilter(e.target.value)} className="form-control" />
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table basic-border-table mb-0">
                  <thead>
                    {table.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>
                        {hg.headers.map(h => (
                          <th key={h.id} colSpan={h.colSpan} onClick={h.column.getToggleSortingHandler()} className="px-10 py-3 text-left text-md  font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                            {h.isPlaceholder ? null : (
                              <div className="flex items-center">
                                {h.column.columnDef.header}
                                {{
                                  asc: ' 🔼',
                                  desc: ' 🔽'
                                }[h.column.getIsSorted()] ?? null}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-4">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-10 py-6 whitespace-nowrap text-sm text-gray-900 text-capitalize">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>

                </table>
              </div>
            </div>

            {/* pagination controls (copied from previous style) */}
            <div className='card-footer'>
              <div className="d-flex justify-content-between gap-2 mt-4">
                <div className="btn-group radius-8" role="group">
                  <button type="button" className="btn btn-primary-600" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><Icon icon="mage:caret-left-fill" /></button>
                  <button type="button" className="btn btn-primary-400" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><Icon icon="mage:caret-left" /></button>
                  <button type="button" className="btn btn-primary-400" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><Icon icon="mage:caret-right" /></button>
                  <button type="button" className="btn btn-primary-600" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><Icon icon="mage:caret-right-fill" /></button>
                </div>
                <span>Page <strong>{table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</strong></span>
                <div className="d-flex align-items-center gap-2">
                  <span>Go to page:
                    <input type="number" defaultValue={table.getState().pagination.pageIndex + 1} onChange={e => table.setPageIndex(e.target.value ? Number(e.target.value) - 1 : 0)} className="border p-1 rounded w-44-px" />
                  </span>
                  <select value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} className="p-1 border rounded">
                    {[10,20,30,40,50].map(s => <option key={s} value={s}>Show {s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        
        {/* ---------- Modal ---------- */}
{modalOpen && (
  <div style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <div style={{
      width: "90%",
      maxWidth: 950,
      background: "#fff",
      borderRadius: 8,
      padding: 20,
      maxHeight: "85vh",
      overflowY: "auto",
      boxShadow: "0px 0px 15px rgba(0,0,0,0.2)"
    }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0 text-xl">
          <strong>Purchase History:</strong> {modalProductName}
          {modalWarehouseName && (
            <span className="text-muted text-xl" >
              {" "} ({modalWarehouseName})
            </span>
          )}
        </h4>
        <button className="btn btn-sm btn-outline-danger" onClick={closeModal}>
          ✕ Close
        </button>
      </div>

      {/* Body */}
      {modalLoading ? (
        <div className="text-center py-5">
          <span className="spinner-border spinner-border-sm me-2"></span> Loading...
        </div>
      ) : modalRows.length === 0 ? (
        <div className="text-center text-muted py-4">
          No purchase records found for this product in this warehouse.
        </div>
      ) : (
        modalRows.map(inv => (
          <div key={inv._id} className="mb-3 p-3 border rounded" style={{ background: "#fafafa" }}>
            {/* Invoice Header */}
            <div className="d-flex justify-content-between mb-2">
              <div>
                <strong>Invoice:</strong> {inv.invoiceNo} <br />
                <strong>Supplier:</strong> {inv.supplierName || "N/A"} <br />
                <strong>Date:</strong> {inv.date ? new Date(inv.date).toLocaleDateString() : ""}
              </div>

              <div className="text-end">
                <strong>GST:</strong> {formatDecimal3(inv.gst)} <br />
                <strong>Total:</strong> {formatDecimal3(inv.total)}
              </div>
            </div>

            {/* Product Table */}
            <div className="table-responsive">
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "50%" }}>Product</th>
                    <th className="text-center" style={{ width: "15%" }}>Qty</th>
                    <th className="text-center" style={{ width: "15%" }}>Price</th>
                    <th className="text-end" style={{ width: "20%" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.products.map((pr, idx) => (
                    <tr key={idx}>
                      <td>{pr.label || modalProductName}</td>
                      <td className="text-center">{pr.quantity}</td>
                      <td className="text-center">{formatDecimal3(pr.price)}</td>
                      <td className="text-end">
                        {Number(pr.lineTotal).toLocaleString(undefined, {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}

      </div>
    </MasterLayout>
  );
}
