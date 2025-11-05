"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditInstallersPage() {
    const { data: session } = useSession();
    const params = useParams();
    // const router = useRouter();
    const [form, setForm] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch job data on mount
    useEffect(() => {
        const fetchInstaller = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/installers/api?id=${params.jid}`);

                const text = await res.text();
                if (text) {
                    setForm(JSON.parse(text));
                }
                if (!res.ok) throw new Error((data && data.error) || 'Failed to fetch job');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (params.jid) fetchInstaller();
    }, [params.jid]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleJobsChange = (selectedOptions) => {
        console.log(selectedOptions, form);
        setForm({ ...form, jobs: selectedOptions || [] });
    };

    const loadJobs = async (inputValue, callback) => {
        try {
            const res = await fetch(`/api/jobs?id=${inputValue}`);
            if (!res.ok) setError('Failed to fetch jobs, please use the job ID directly.');
            const data = await res.json();
            const options = data.map(job => ({ value: job.id, label: job.name }));
            callback(options);
        }
        catch (err) {
            console.error('Error fetching jobs:', err);
            callback([]);
        }
    };

    useEffect(() => {

    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const payload = {
                ...form,
                _id: params.jid,
            };
            const res = await fetch('/installers/api', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                // setSuccess('Installer updated successfully!');
                toast.success('Installer updated successfully!', {
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
            } else {
                const data = await res.json();
                setError(data.error || 'Update failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
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
                                    <label className="form-label" htmlFor="name">Name</label>
                                    <input disabled={loading} id="name" type="text" name="name" className="form-control" value={form.name} onChange={handleChange} required />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Stock Issued</label>
                                    <input disabled={loading} type="text" name="stockIssued" className="form-control" value={form.stockIssued} onChange={handleChange} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Stock Installed</label>
                                    <input disabled={loading} type="text" name="stockInstalled" className="form-control" value={form.stockInstalled} onChange={handleChange} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Contact Number</label>
                                    <input disabled={loading} type="text" name="contactNo" className="form-control" value={form.contactNo} onChange={handleChange} />
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

                                <div className="col-12">
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
                                </div>
                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>Update Installer</button>
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