"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast, Bounce, ToastContainer } from "react-toastify";

const initialState = {
  name: '',
  description: '',
  sku: '',
  type: '',
  secondaryType: '',
  brand: '',
  minimumStockThreshold: 0,
  isActive: true,
};


const Page = () => {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch product data on mount
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/products/api?id=${params.pid}`);
        let data = {};
        const text = await res.text();
        if (text) {
          data = JSON.parse(text);
        }
        if (!res.ok) throw new Error((data && data.error) || 'Failed to fetch product');
        setForm({
          name: data.name || '',
          description: data.description || '',
          sku: data.sku || '',
          type: data.type || '',
          secondaryType: data.secondaryType || '',
          brand: data.brand || '',
          minimumStockThreshold: data.minimumStockThreshold || 0,
          isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (params.pid) fetchProduct();
  }, [params.pid]);

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
      const res = await fetch(`/products/api?id=${params.pid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      let data = {};
      const text = await res.text();
      if (text) {
        data = JSON.parse(text);
      }
      if (!res.ok) throw new Error((data && data.error) || 'Failed to update product');
      toast.success('Product updated successfully!', {
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
      setSuccess('Product updated successfully!');
      // Optionally redirect or refresh
      router.push('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Edit Product' />
        <ToastContainer />

        {/* TableDataLayer */}
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Edit Product</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row gy-4">
                  <div className="col-12">
                    <label className="form-label" htmlFor="name">Name*</label>
                    <input id="name" type="text" name="name" className="form-control" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <input type="text" name="description" className="form-control" value={form.description} onChange={handleChange} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">SKU*</label>
                    <input type="text" name="sku" className="form-control" value={form.sku} onChange={handleChange} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Type*</label>
                    <select
                      name="type"
                      className="form-control"
                      value={form.type}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select type</option>
                      <option value="single-split">Single Split</option>
                      <option value="multi-split">Multi Split</option>
                      <option value="ducted">Ducted</option>
                      <option value="heat-pumps">Heat Pumps</option>
                    </select>
                  </div>
                  {['single-split', 'multi-split', 'ducted'].includes(form.type) && (
                    <div className="col-12">
                      <label className="form-label">Secondary Type</label>
                      <select
                        name="secondaryType"
                        className="form-control"
                        value={form.secondaryType}
                        onChange={handleChange}
                      >
                        <option value="">Select secondary type</option>
                        <option value="ODU">ODU</option>
                        <option value="IDU">IDU</option>
                      </select>
                    </div>
                  )}
                  {/* secondaryType input moved above and now conditional/select */}
                  <div className="col-12">
                    <label className="form-label">Brand*</label>
                    <input type="text" name="brand" className="form-control" value={form.brand} onChange={handleChange} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Minimum Stock Threshold</label>
                    <input type="number" name="minimumStockThreshold" className="form-control" value={form.minimumStockThreshold} onChange={handleChange} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="horizontal1">Active</label>
                    <div className="form-switch switch-primary d-flex align-items-center gap-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        name="isActive"
                        id="horizontal1"
                        checked={form.isActive} onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary" disabled={loading}>Update Product</button>
                  </div>
                  {error && <div className="col-12"><p className="text-danger">{error}</p></div>}
                  {success && <div className="col-12"><p className="text-success">{success}</p></div>}
                </div>
              </form>
            </div>
          </div>
        </div>
      </MasterLayout>
    </>
  );
};

export default Page;
