"use client";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";
import Breadcrumb from "@/components/Breadcrumb";

const initialRequest = {
    status: "Pending",
    generatedBy: "",
    userId: "",
    emailSent: false,
    notes: "",
    items: [],
};

const initialItem = {
    productId: "",
    variationId: "",
    warehouseId: "",
    currentStockAtRequest: 0,
    minimumStockLevelAtRequest: 0,
    quantityToOrder: 1,
};

export default function OrderRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [requestForm, setRequestForm] = useState(initialRequest);
    const [itemForm, setItemForm] = useState(initialItem);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchRequests();
        fetchUsers();
        fetchWarehouses();
        fetchProducts();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/order-requests/api");
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : [data]);
        } catch (err) {
            setError("Failed to load order requests");
        }
        setLoading(false);
    };

    const fetchUsers = async () => {
        // Replace with your users API
        const res = await fetch("/users/api");
        const data = await res.json();
        setUsers(data);
    };

    const fetchWarehouses = async () => {
        const res = await fetch("/warehouses/api");
        const data = await res.json();
        setWarehouses(data);
    };

    const fetchProducts = async () => {
        const res = await fetch("/products/api");
        const data = await res.json();
        setProducts(data);
    };

    const handleRequestChange = (e) => {
        const { name, value } = e.target;
    const [eodResult, setEodResult] = useState("");
        setRequestForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (e) => {
        const { name, value } = e.target;
        setItemForm((prev) => ({ ...prev, [name]: value }));
    };

    // End-of-Day process handler
    const handleEndOfDay = async () => {
        setEodResult("");
        try {
            const res = await fetch("/order-requests/end-of-day.js", { method: "POST" });
            const data = await res.json();
            setEodResult(data.message || "Done");
            await fetchRequests();
        } catch (err) {
            setEodResult("Failed to run end-of-day process");
        }
    };
    const handleAddItem = () => {
        setRequestForm((prev) => ({ ...prev, items: [...prev.items, itemForm] }));
        setItemForm(initialItem);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
                {/* End-of-Day Button for Admins */}
                <button className="btn btn-warning mb-3" onClick={handleEndOfDay}>
                    Run End-of-Day Process (Generate Order Requests)
                </button>
                {eodResult && <div className="alert alert-info">{eodResult}</div>}
        try {
            const method = editingId ? "PUT" : "POST";
            const url = "/order-requests/api";
            const body = editingId ? { ...requestForm, _id: editingId } : requestForm;
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Failed to save order request");
            await fetchRequests();
            setRequestForm(initialRequest);
            setEditingId(null);
        } catch (err) {
            setError(err.message || "Error saving order request");
        }
    };

    return (
        <MasterLayout>
            <Breadcrumb title='Order Requests' />
            <div className="container py-4">
                <form className="row g-3 mb-4" onSubmit={handleSubmit}>
                    <div className="col-md-2">
                        <select name="status" className="form-control" value={requestForm.status} onChange={handleRequestChange} required>
                            <option value="Pending">Pending</option>
                            <option value="Sent">Sent</option>
                            <option value="Fulfilled">Fulfilled</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <select name="generatedBy" className="form-control" value={requestForm.generatedBy} onChange={handleRequestChange} required>
                            <option value="">Generated By</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <select name="userId" className="form-control" value={requestForm.userId} onChange={handleRequestChange} required>
                            <option value="">User</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <input type="text" name="notes" className="form-control" placeholder="Notes" value={requestForm.notes} onChange={handleRequestChange} />
                    </div>
                    <div className="col-md-2">
                        <input type="checkbox" name="emailSent" checked={requestForm.emailSent} onChange={e => setRequestForm(prev => ({ ...prev, emailSent: e.target.checked }))} /> Email Sent
                    </div>
                    <div className="col-md-12">
                        <div className="d-flex gap-2 align-items-center">
                            <select name="productId" className="form-control" value={itemForm.productId} onChange={handleItemChange} required>
                                <option value="">Product</option>
                                {products.map((p) => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                            <input type="text" name="variationId" className="form-control" placeholder="Variation ID" value={itemForm.variationId} onChange={handleItemChange} required />
                            <select name="warehouseId" className="form-control" value={itemForm.warehouseId} onChange={handleItemChange} required>
                                <option value="">Warehouse</option>
                                {warehouses.map((w) => (
                                    <option key={w._id} value={w._id}>{w.name}</option>
                                ))}
                            </select>
                            <input type="number" name="currentStockAtRequest" className="form-control" placeholder="Current Stock" value={itemForm.currentStockAtRequest} onChange={handleItemChange} required />
                            <input type="number" name="minimumStockLevelAtRequest" className="form-control" placeholder="Min Stock Level" value={itemForm.minimumStockLevelAtRequest} onChange={handleItemChange} required />
                            <input type="number" name="quantityToOrder" className="form-control" placeholder="Qty To Order" value={itemForm.quantityToOrder} min={1} onChange={handleItemChange} required />
                            <button type="button" className="btn btn-info" onClick={handleAddItem}>Add Item</button>
                        </div>
                        <div className="mt-2">
                            <strong>Items:</strong>
                            <ul>
                                {requestForm.items.map((item, idx) => (
                                    <li key={idx}>{item.productId} (Var: {item.variationId}) Qty: {item.quantityToOrder} Warehouse: {item.warehouseId}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="col-12">
                        <button type="submit" className="btn btn-success">{editingId ? "Update Request" : "Create Request"}</button>
                        {editingId && <button type="button" className="btn btn-secondary ms-2" onClick={() => { setEditingId(null); setRequestForm(initialRequest); }}>Cancel</button>}
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
                                    <th>Status</th>
                                    <th>Generated By</th>
                                    <th>User</th>
                                    <th>Items</th>
                                    <th>Notes</th>
                                    <th>Email Sent</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center">No order requests found.</td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req._id}>
                                            <td>{req.status}</td>
                                            <td>{req.generatedBy?.name || req.generatedBy?.email || req.generatedBy}</td>
                                            <td>{req.userId?.name || req.userId?.email || req.userId}</td>
                                            <td>
                                                <ul>
                                                    {req.items.map((item, idx) => (
                                                        <li key={idx}>{item.productId} (Var: {item.variationId}) Qty: {item.quantityToOrder} Warehouse: {item.warehouseId}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td>{req.notes}</td>
                                            <td>{req.emailSent ? "Yes" : "No"}</td>
                                            <td>{new Date(req.createdAt).toLocaleString()}</td>
                                            <td>
                                                <button className="btn btn-sm btn-warning me-2" onClick={() => { setEditingId(req._id); setRequestForm(req); }}>Edit</button>
                                                <button className="btn btn-sm btn-danger" onClick={async () => { await fetch(`/order-requests/api?id=${req._id}`, { method: "DELETE" }); fetchRequests(); }}>Delete</button>
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
