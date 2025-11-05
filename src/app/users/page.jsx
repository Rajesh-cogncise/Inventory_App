"use client";
import React, { useEffect, useState } from "react";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Icon } from "@iconify/react";
import Breadcrumb from "@/components/Breadcrumb";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editId, setEditId] = useState(null);
    const [editUser, setEditUser] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/users/api");
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : [data]);
        } catch (err) {
            setError("Failed to load users");
        }
        setLoading(false);
    };

    const handleEdit = (user) => {
        setEditId(user._id);
        setEditUser({ ...user });
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditUser((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleEditSave = async () => {
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/users/api", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editUser),
            });
            if (!res.ok) throw new Error("Failed to update user");
            setEditId(null);
            setEditUser({});
            fetchUsers();
        } catch (err) {
            setError("Failed to update user");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        setError("");
        try {
            const res = await fetch(`/users/api?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete user");
            fetchUsers();
        } catch (err) {
            setError("Failed to delete user");
        }
    };

    return (
        <MasterLayout>
            <Breadcrumb title='Users' />
            <div className="container py-4">
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
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center">No users found.</td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u._id}>
                                            {editId === u._id ? (
                                                <>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            name="name"
                                                            value={editUser.name || ""}
                                                            onChange={handleEditChange}
                                                            disabled={saving}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="email"
                                                            className="form-control"
                                                            name="email"
                                                            value={editUser.email || ""}
                                                            onChange={handleEditChange}
                                                            disabled={saving}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select"
                                                            name="role"
                                                            value={editUser.role || ""}
                                                            onChange={handleEditChange}
                                                            disabled={saving}
                                                        >
                                                            <option value="admin">Admin</option>
                                                            <option value="user">User</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            name="active"
                                                            checked={!!editUser.active}
                                                            onChange={handleEditChange}
                                                            disabled={saving}
                                                        />
                                                        <span className="ms-2">{editUser.active ? "Active" : "Inactive"}</span>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-success btn-sm me-2" onClick={handleEditSave} disabled={saving}>
                                                            <Icon icon="mdi:content-save" /> Save
                                                        </button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)} disabled={saving}>
                                                            Cancel
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{u.name}</td>
                                                    <td>{u.email}</td>
                                                    <td>{u.role}</td>
                                                    <td>{u.active ? "Active" : "Inactive"}</td>
                                                    <td>
                                                        <button className="btn btn-primary btn-sm me-2" onClick={() => handleEdit(u)}>
                                                            <Icon icon="mdi:pencil" /> Edit
                                                        </button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>
                                                            <Icon icon="mdi:delete" /> Delete
                                                        </button>
                                                    </td>
                                                </>
                                            )}
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
