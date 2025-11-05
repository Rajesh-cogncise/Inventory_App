"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AsyncSelect from 'react-select/async';
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { useSession } from 'next-auth/react';
import { toast, Bounce, ToastContainer } from "react-toastify";
import { useTheme } from "@/hook/theme";


const initialState = {
    actualCompletedDate: '',
    workType: '',
    address: '',
    issuedDate: '',
    installer: '',
    products: null,
    status: 'Pending',
};


export default function EditJobPage() {
    const { data: session } = useSession();
    const params = useParams();
    // const router = useRouter();
    const [form, setForm] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [canReturnProducts, setCanReturnProducts] = useState(false);
    const { theme } = useTheme();
    // Fetch job data on mount
    useEffect(() => {
        const fetchJob = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/jobs?id=${params.jid}`);
                let data = {};
                const text = await res.text();
                if (text) {
                    data = JSON.parse(text);
                }
                if (!res.ok) throw new Error((data && data.error) || 'Failed to fetch job');
                let aDate = '';
                let iDate = '';
                if (data.actualCompletedDate) {
                    const date = new Date(data.actualCompletedDate);
                    if (!isNaN(date.getTime())) {
                        aDate = date.toISOString().slice(0, 10);
                    }
                }
                if (data.issuedDate) {
                    const date = new Date(data.issuedDate);
                    if (!isNaN(date.getTime())) {
                        iDate = date.toISOString().slice(0, 10);
                    }
                }
                if (data.installer) {
                    data.installer = { value: data.installer._id, label: data.installer.name };
                }
                if (data.status === "Installed") setCanReturnProducts(true);
                // Map products to correct structure (from totalProducts)
                const products = Array.isArray(data.totalProducts)
                    ? data.totalProducts.map(p => ({
                        value: p.value || p.productId?._id || p.productId,
                        label: p.label || p.productId?.name || '',
                        quantity: p.quantity,
                        warehouseId: p.warehouseId || ''
                    }))
                    : [];
                setForm({
                    actualCompletedDate: aDate,
                    workType: data.workType || '',
                    address: data.address || '',
                    installer: data.installer || '',
                    requirements: data.requirements || [],
                    issuedDate: iDate,
                    products,
                    status: data.status || 'Pending',
                });
            } catch (err) {
                toast.error(err.message, {
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
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (params.jid) fetchJob();
    }, [params.jid]);

    const handleChange = (e) => {
        console.log(e.target.name, e.target.value, form);
        setForm({ ...form, [e.target.name]: e.target.value });
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
            i === idx ? { ...p, quantity: Number(value) } : p
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
    useEffect(() => {
        // Fetch warehouses on mount
        fetch('/api/warehouses')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setWarehouseOptions(data.map(w => ({ value: w._id, label: w.name })));
                }
            });
    }, []);

    const handleReturnProducts = async () => {
        setLoading(true);
        setSuccess(false);
        const products = Array.isArray(form.products)
            ? form.products.map(p => ({
                productId: p.value,
                label: p.label,
                quantity: p.quantity || 1,
                warehouseId: p.warehouseId
            }))
            : [];
        const payload = {
            installer: form.installer?.value,
            products,
        };
        const res = await fetch(`/jobs/api?id=${params.jid}&returnProduct=true`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        setLoading(false);
        if (res.ok) {
            toast.success('Product returned successfully!', {
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        // Build totalProducts array for API
        const products = Array.isArray(form.products)
            ? form.products.map(p => ({
                productId: p.value,
                label: p.label,
                quantity: p.quantity || 1,
                warehouseId: p.warehouseId
            }))
            : [];
        const payload = {
            actualCompletedDate: form.actualCompletedDate,
            workType: form.workType,
            address: form.address,
            installer: form.installer?.value || null,
            status: form.status,
            issuedDate: form.issuedDate,
            userId: session?.user?.id || '',
            products,
        };
        const res = await fetch(`/jobs/api?id=${params.jid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        setLoading(false);
        if (res.ok) {
            toast.success('Job updated successfully!', {
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
    const handleInstallerChange = (selectedOption) => {
        setForm({ ...form, installer: selectedOption ? { value: selectedOption.value, label: selectedOption.label } : null });
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
    return (
        <MasterLayout>
            <Breadcrumb title='Edit Job' />
            <ToastContainer />
            <div className="col-md-12">
                <div className="card">
                    <div className="card-header">
                        <h6 className="card-title mb-0">Edit Job</h6>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row gy-4">
                                <div className="col-12">
                                    <label className="form-label" htmlFor="actualCompletedDate"> Date</label>
                                    <input id="actualCompletedDate" type="date" name="actualCompletedDate" className="form-control" value={form.actualCompletedDate} onChange={handleChange} required disabled={loading} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Work Type</label>
                                    <input type="text" name="workType" className="form-control" value={form.workType} onChange={handleChange} disabled={loading} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Address</label>
                                    <input type="text" name="address" className="form-control" value={form.address} onChange={handleChange} disabled={loading} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Field Worker</label>
                                    {canReturnProducts ? (
                                        <input type="text" className="form-control" value={form.installer?.label || ''} disabled />
                                    ) : (
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
                                                    color: theme === "light" ? '#202020' : '#ffffff',
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
                                    )}
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Status</label>
                                    <select
                                        name="status"
                                        className="form-control"
                                        value={form.status}
                                        onChange={handleChange}
                                        required
                                        disabled={loading || canReturnProducts} // Disable if can return products
                                    >
                                        <option value="">Select status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Issued">Issued</option>
                                        <option value="Installed">Installed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Requirements</label>
                                    <table className="table basic-border-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>Product </th>
                                                <th>Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(form.requirements) && form.requirements.length > 0 ? (
                                                form.requirements.map((product, idx) => (
                                                    <tr key={product.value + idx}>
                                                        <td>
                                                            <span className="me-2">{product.label}</span>
                                                        </td>
                                                        <td>
                                                            <span className="me-2">{product.quantity}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="text-center">No products selected</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="col-12">
                                    <label className="form-label" htmlFor="issuedDate">Issued Date</label>
                                    <input id="issuedDate" type="date" name="issuedDate" className="form-control" value={form.issuedDate} onChange={handleChange} required disabled={loading} />
                                </div>
                                {!canReturnProducts &&
                                    <div className="col-12">
                                        <label className="form-label">Total Products</label>
                                        <AsyncSelect
                                            styles={{
                                                control: (baseStyles, state) => ({
                                                    ...baseStyles,
                                                    color: '#202020',
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
                                            name="products[]"
                                            isDisabled={loading}
                                        />
                                    </div>
                                }
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
                                                        form.products.map((product, idx) => {
                                                            console.log(product);
                                                            return (

                                                            <tr key={product.value + idx}>
                                                                <td>
                                                                    <span className="me-2">{product.label}</span>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={product.quantity}
                                                                        onChange={e => handleQuantityChange(idx, e.target.value)}
                                                                        className="form-control form-control-sm me-2"
                                                                        style={{ width: 80 }}
                                                                        disabled={loading}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <select
                                                                        className="form-select form-select-sm"
                                                                        value={product.warehouseId || ''}
                                                                        onChange={e => handleWarehouseChange(idx, e.target.value)}
                                                                        required
                                                                        style={{ width: 160 }}
                                                                        disabled={loading}
                                                                    >
                                                                        <option value="">Select warehouse</option>
                                                                        {warehouseOptions.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                            </tr>

                                                        )})
                                                    }


                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className="col-12 d-flex gap-2">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>Update Job</button>
                                    {canReturnProducts &&
                                        <button type="submit" className="btn btn-warning" disabled={loading} onClick={(s) => {
                                            s.preventDefault();
                                            handleReturnProducts();
                                            // setForm({...form, status: 'Pending'});
                                            // setCanReturnProducts(false);
                                        }}>Return Products</button>
                                    }
                                </div>
                                {error && <div className="col-12"><p className="text-danger">{error}</p></div>}
                                {success && <div className="col-12"><p className="text-success">{success}</p></div>}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MasterLayout >
    );
}