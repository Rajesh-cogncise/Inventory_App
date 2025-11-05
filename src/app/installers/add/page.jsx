"use client";
import { useState } from "react";
import AsyncSelect from 'react-select/async';
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { useSession } from 'next-auth/react';
import { toast, Bounce, ToastContainer } from "react-toastify";

const initialState = {
    name: '',
    stockIssued: 0,
    stockInstalled: 0,
    contactNo: '',
    notes: [],
    jobs: [],
};

export default function AddInstallerPage() {
    const { data: session, status } = useSession();
    const [form, setForm] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const loadJobs = async (inputValue, callback) => {
        try {
            const res = await fetch(`/api/jobs?id=${inputValue}`);
            const data = await res.json();
            const options = data.map(job => ({ value: job.id, label: job.name }));
            callback(options);
        }
        catch (err) {
            console.error('Error fetching jobs:', err);
            callback([]);
        }
    };

    const handleJobsChange = (selectedOptions) => {
        console.log(selectedOptions)
        setForm({ ...form, jobs: selectedOptions || [] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        const res = await fetch("/installers/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        setLoading(false);
        if (res.ok) {
            toast.success('Installer added successfully!', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: false,
                progress: undefined,
                theme: "light",
                transition: Bounce,
            });
            setSuccess(true);
            setForm(initialState);
        }
    };

    return (
        <MasterLayout>
            <Breadcrumb title='Add Job' />
            <ToastContainer />
            <div className="col-md-12">
                <div className="card">
                    <div className="card-header">
                        <h6 className="card-title mb-0">Add Installer</h6>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row gy-4">
                                <div className="col-12">
                                    <label className="form-label" htmlFor="name">Name</label>
                                    <input id="name" type="text" name="name" className="form-control" value={form.name} onChange={handleChange} required />
                                </div>
                                {/* <div className="col-12">
                                    <label className="form-label">Stock Issued</label>
                                    <input type="text" name="stockIssued" className="form-control" value={form.stockIssued} onChange={handleChange} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Stock Installed</label>
                                    <input type="text" name="stockInstalled" className="form-control" value={form.stockInstalled} onChange={handleChange} />
                                </div> */}
                                <div className="col-12">
                                    <label className="form-label">Contact Number</label>
                                    <input type="text" name="contactNo" className="form-control" value={form.contactNo} onChange={handleChange} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Notes</label>
                                    <div className="mb-20 d-flex gap-2">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Add a note..."
                                            value={form.noteInput || ''}
                                            onChange={e => setForm({ ...form, noteInput: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                if (form.noteInput && form.noteInput.trim()) {
                                                    setForm({
                                                        ...form,
                                                        notes: [...form.notes, form.noteInput.trim()],
                                                        noteInput: ''
                                                    });
                                                }
                                            }}
                                        >Add</button>
                                    </div>
                                    {Array.isArray(form.notes) && form.notes.length > 0 && (
                                        <div className="table-responsive">
                                            <table className="table basic-border-table mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Note</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {form.notes.map((note, idx) => (
                                                        <tr key={idx}>
                                                            <td>{idx + 1}</td>
                                                            <td>{note}</td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm"
                                                                    onClick={() => {
                                                                        setForm({
                                                                            ...form,
                                                                            notes: form.notes.filter((_, i) => i !== idx)
                                                                        });
                                                                    }}
                                                                >Delete</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* <div className="col-12">
                                    <label className="form-label">Jobs</label>
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
                                        cacheOptions
                                        defaultOptions
                                        isClearable
                                        isMulti
                                        value={form.jobs}
                                        loadOptions={loadJobs}
                                        onChange={handleJobsChange}
                                        placeholder="Enter job ID"
                                        name="jobs[]"
                                    />
                                </div> */}
                                <div className="col-12">
                                    {/* Render quantity and warehouse input for each selected product */}
                                    {Array.isArray(form.products) && form.products.length > 0 && (
                                        <div className='table-responsive'>
                                            <table className='table basic-border-table mb-0'>
                                                <thead>
                                                    <tr>
                                                        <th>Product </th>
                                                        <th>Quantity</th>
                                                        <th>Warehouse</th>

                                                    </tr>
                                                </thead>
                                                <tbody>


                                                    {
                                                        form.products.map((product, idx) => (

                                                            <tr key={product.value + idx}>
                                                                <td>
                                                                    <span className="me-2">{product.label}</span>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={typeof product.quantity === 'number' && !isNaN(product.quantity) ? product.quantity : 1}
                                                                        onChange={e => handleQuantityChange(idx, e.target.value)}
                                                                        className="form-control form-control-sm me-2"
                                                                        style={{ width: 80 }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <select
                                                                        className="form-select form-select-sm"
                                                                        value={product.warehouseId || ''}
                                                                        onChange={e => handleWarehouseChange(idx, e.target.value)}
                                                                        required
                                                                        style={{ width: 160 }}
                                                                    >
                                                                        <option value="">Select warehouse</option>
                                                                        {warehouseOptions.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                            </tr>

                                                        ))
                                                    }


                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>Add Installer</button>
                                </div>
                                {error && <div className="col-12"><p className="text-danger">{error}</p></div>}
                                {success && <div className="col-12"><p className="text-success">{success}</p></div>}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MasterLayout>
    );
}