"use client";
import { useState } from "react";
import AsyncSelect from 'react-select/async';
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { useSession } from 'next-auth/react';
import { toast, Bounce, ToastContainer } from "react-toastify";


const initialState = {
    actualCompletedDate: (new Date()).toISOString().slice(0, 10), // default to today
    workType: '',
    address: '',
    installer: null,
    products: null,
    installerName: '',
    status: 'Pending',
};

export default function AddJobPage() {
    const { data: session, status } = useSession();
    const [form, setForm] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };


    const loadInstallers = async (inputValue, callback) => {
        try {
            const res = await fetch(`/installers/api?search=${encodeURIComponent(inputValue)}`);
            const data = await res.json();
            const options = Array.isArray(data)
                ? data.map(user => ({ value: user._id, label: user.name }))
                : [];
            callback(options);
        } catch (err) {
            callback([]);
        }
    };

    const handleInstallerChange = (selectedOption) => {
        setForm({ ...form, installer: selectedOption ? { value: selectedOption.value, label: selectedOption.label } : null });
    };

    // For react-select AsyncSelect
    const handleProductChange = (selectedOption) => {
        // Add quantity: 1 and warehouseId: '' to each selected product if not present
        const withQuantity = Array.isArray(selectedOption)
            ? selectedOption.map(opt => ({ ...opt, quantity: opt.quantity || 1, warehouseId: opt.warehouseId || '' }))
            : [];
        setForm({ ...form, products: withQuantity });
    };

    // Handle warehouse change for a product
    const handleWarehouseChange = (idx, value) => {
        const updated = form.products.map((p, i) =>
            i === idx ? { ...p, warehouseId: value } : p
        );
        setForm({ ...form, products: updated });
    };

    // Handle quantity change for a product
    const handleQuantityChange = (idx, value) => {
        const updated = form.products.map((p, i) =>
            i === idx ? { ...p, quantity: Math.max(1, Number(value) || 1) } : p
        );
        setForm({ ...form, products: updated });
    };

    // Load product options from API
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

    // Load warehouse options from API
    const [warehouseOptions, setWarehouseOptions] = useState([]);
    useState(() => {
        // Fetch warehouses on mount
        fetch('/api/warehouses')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setWarehouseOptions(data.map(w => ({ value: w._id, label: w.name })));
                }
            });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        // Build products array for API
        const products = Array.isArray(form.products)
            ? form.products.map(p => ({
                productId: p.value, // value is product._id from select
                quantity: p.quantity || 1,
                // warehouseId: p.warehouseId // required by schema
            }))
            : [];
        const payload = {
            actualCompletedDate: form.actualCompletedDate,
            workType: form.workType,
            address: form.address,
            installer: form.installer?.value || null,
            status: form.status,
            userId: session?.user?.id || '',
            products:[],
            requirements: products,
        };
        const res = await fetch("/jobs/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        setLoading(false);
        if (res.ok) {
            toast.success('Job created successfully!', {
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
        } else {
            const data = await res.json();
            toast.error(data.error, {
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
        }
    };

    return (
        <MasterLayout>
            <Breadcrumb title='Add Job' />
            <ToastContainer />
            <div className="col-md-12">
                <div className="card">
                    <div className="card-header">
                        <h6 className="card-title mb-0">Add Job</h6>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row gy-4">
                                <div className="col-12">
                                    <label className="form-label" htmlFor="actualCompletedDate">Date</label>
                                    <input id="actualCompletedDate" type="date" name="actualCompletedDate" className="form-control" value={form.actualCompletedDate} readOnly />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Work Type</label>
                                    <input type="text" name="workType" className="form-control" value={form.workType} onChange={handleChange} required />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Address</label>
                                    <input type="text" name="address" className="form-control" value={form.address} onChange={handleChange} required />
                                </div>
                                {/* <div className="col-12">
                                    <label className="form-label">Installer</label>
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
                                            singleValue: (baseStyles) => ({
                                                ...baseStyles,
                                                color: '#ffffff',
                                            }),
                                            option: (baseStyles) => ({
                                                ...baseStyles,
                                                color: '#202020',
                                            }),
                                        }}
                                        cacheOptions
                                        value={form.installer}
                                        loadOptions={loadInstallers}
                                        onChange={handleInstallerChange}
                                        placeholder="Search by name..."
                                        name="installer"
                                    />
                                </div> */}
                                {/* <div className="col-12">
                                    <label className="form-label">Status</label>
                                    <select
                                        name="status"
                                        className="form-control"
                                        value={form.status}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Installed">Installed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div> */}
                                <div className="col-12">
                                    <label className="form-label">Requirements</label>
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
                                        value={form.products}
                                        loadOptions={loadProductOptions}
                                        onChange={handleProductChange}
                                        placeholder="Search and select a product..."
                                        name="requirements[]"
                                    />
                                </div>
                                <div className="col-12">
                                    {/* Render quantity and warehouse input for each selected product */}
                                    {Array.isArray(form.products) && form.products.length > 0 && (
                                        <div className='table-responsive'>
                                            <table className='table basic-border-table mb-0'>
                                                <thead>
                                                    <tr>
                                                        <th>Product </th>
                                                        <th>Quantity</th>

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
                                                            </tr>

                                                        ))
                                                    }


                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>Add Job</button>
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