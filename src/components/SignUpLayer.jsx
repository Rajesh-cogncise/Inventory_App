"use client"


import { useState } from 'react';
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';


const SignUpLayer = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', username: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { data: session, status } = useSession();

  // Only allow access if logged in and admin
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    redirect('/sign-in');
    return null;
  }
  if (session.user.role !== 'admin') {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='bg-white p-8 rounded shadow-md'>
          <h2 className='text-1xl mt-40 text-center'>Access Denied</h2>
          <p className='text-center'>You must be an admin to create new users.</p>
          <div className='max-w-500-px mx-auto mb-40'>
            <img src='/assets/images/forbidden/forbidden-img.png' alt='' />
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess('User created successfully!');
      setForm({ name: '', email: '', password: '', username: '', role: 'user' });
    } else {
      setError(data.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <section className='auth bg-base d-flex flex-wrap'>
      <div className='auth-right py-32 px-24 d-flex flex-column justify-content-start'>
        <div className='max-w-464-px mx-auto w-100'>
          <div>
            {/* <Link href='/' className='mb-40 max-w-290-px'>
              <img src='assets/images/logo.png' alt='' />
            </Link>
            <h4 className='mb-12'>Create a New User</h4> */}
            <p className='mb-32 text-secondary-light text-lg'>
              Only admins can create new users.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='icon-field mb-16'>
              <span className='icon top-50 translate-middle-y'>
                <Icon icon='f7:person' />
              </span>

              <input
                type='text'
                name='name'
                className='form-control h-56-px bg-neutral-50 radius-12'
                placeholder='Name'
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className='icon-field mb-16'>
              <span className='icon top-50 translate-middle-y'>
                <Icon icon='solar:user-id-linear' />
              </span>
              <input
                type='text'
                name='username'
                className='form-control h-56-px bg-neutral-50 radius-12'
                placeholder='Username'
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className='icon-field mb-16'>
              <span className='icon top-50 translate-middle-y'>
                <Icon icon='oui:app-users-roles' />
              </span>
              
              <select
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  name="role"
                  value={form.role}
                  onChange={handleChange}
              >
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
              </select>
            </div>
            <div className='icon-field mb-16'>
              <span className='icon top-50 translate-middle-y'>
                <Icon icon='mage:email' />
              </span>
              <input
                type='email'
                name='email'
                className='form-control h-56-px bg-neutral-50 radius-12'
                placeholder='Email'
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className='mb-20'>
              <div className='position-relative '>
                <div className='icon-field'>
                  <span className='icon top-50 translate-middle-y'>
                    <Icon icon='solar:lock-password-outline' />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name='password'
                    className='form-control h-56-px bg-neutral-50 radius-12'
                    id='your-password'
                    placeholder='Password'
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <span
                  className='toggle-password ri-eye-line cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light'
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
              <span className='mt-12 text-sm text-secondary-light'>
                Your password must have at least 8 characters
              </span>
            </div>
            <button
              type='submit'
              className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
              disabled={loading}
            >
              {loading ? 'Creating user...' : 'Create User'}
            </button>
            {error && <div className='text-danger mt-2'>{error}</div>}
            {success && <div className='text-success mt-2'>{success}</div>}
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignUpLayer;
