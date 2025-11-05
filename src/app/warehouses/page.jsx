"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import { useEffect, useState } from "react";

const initialState = {
  name: '',
  location: '',
  address: '',
  isActive: true,
};

const WarehousesPage = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetch('/warehouses/api')
      .then((res) => res.json())
      .then(setWarehouses);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/warehouses/api?id=${editId}` : '/warehouses/api';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save warehouse');
      setSuccess(editId ? 'Warehouse updated!' : 'Warehouse added!');
      setForm(initialState);
      setEditId(null);
      fetch('/warehouses/api').then((res) => res.json()).then(setWarehouses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse) => {
    setForm({
      name: warehouse.name,
      location: warehouse.location,
      address: warehouse.address,
      isActive: warehouse.isActive,
    });
    setEditId(warehouse._id);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this warehouse?')) return;
    await fetch(`/warehouses/api?id=${id}`, { method: 'DELETE' });
    fetch('/warehouses/api').then((res) => res.json()).then(setWarehouses);
  };

  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Warehouses' />
        <div className="col-md-12">
          <div className='card mb-20'>
            <div className='card-header'>
              <h5 className='card-title mb-0'>Warehouses List</h5>
            </div>
            <div className='card-body'>
              <div className='table-responsive'>
                <table className='table basic-border-table mb-0'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map((w) => (
                      <tr key={w._id}>
                        <td>{w.name}</td>
                        <td>{w.location}</td>
                        <td>{w.address}</td>
                        <td>{w.isActive ? 'Active' : 'Inactive'}</td>
                        <td>
                          <button className="btn btn-sm btn-info me-2" type="button" onClick={() => handleEdit(w)}>Edit</button>
                          {w.isActive ? (
                            <button className="btn btn-sm btn-danger" type="button" onClick={() => handleDeactivate(w._id)}>Deactivate</button>
                          ) : (
                            <button className="btn btn-sm btn-success" type="button" onClick={async () => {
                              await fetch(`/warehouses/api?id=${w._id}`, { method: 'PATCH' });
                              fetch('/warehouses/api').then((res) => res.json()).then(setWarehouses);
                            }}>Activate</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">{editId ? 'Edit' : 'Add'} Warehouse</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row gy-3">
                  <div className="col-12">
                    <label className="form-label">Name</label>
                    <input type="text" name="name" className="form-control" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Location</label>
                    <input type="text" name="location" className="form-control" value={form.location} onChange={handleChange} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Address</label>
                    <input type="text" name="address" className="form-control" value={form.address} onChange={handleChange} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Active</label>
                    <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-3" disabled={loading}>{editId ? 'Update' : 'Add'} Warehouse</button>
                {error && <p className="text-danger mt-2">{error}</p>}
                {success && <p className="text-success mt-2">{success}</p>}
              </form>
            </div>
          </div>

        </div>
      </MasterLayout>
    </>
  );
};

export default WarehousesPage;
