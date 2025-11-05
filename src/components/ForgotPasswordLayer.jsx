"use client";
import { useSearchParams } from 'next/navigation'

import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";


import React, { useState } from "react";

const ForgotPasswordLayer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(!1);
  const [newPassword, setNewPassword] = useState("");
  const searchParams = useSearchParams()

  const search = searchParams.get('token');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let errorMsg = "Error sending reset email";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          // If response is not JSON, keep default errorMsg
        }
        throw new Error(errorMsg);
      }
      setShowModal(true);
      setEmail("");
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: search, password: newPassword }),
      }); 
      if (!res.ok) {
        let errorMsg = "Error resetting password";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        }

        catch {
          // If response is not JSON, keep default errorMsg
        }   
        throw new Error(errorMsg);
      }
      setMessage("Password reset successfully!");
      setNewPassword("");
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  }


  if (search) {
    return (<>
      <section className='auth forgot-password-page bg-base d-flex flex-wrap'>
        <div className='auth-left d-lg-block d-none'>
          <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
            <img src='assets/images/auth/forgot-pass-img.jpg' className='image-cover' />
          </div>
        </div>
        <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
          <div className='max-w-464-px mx-auto w-100'>
            <div>
              <h4 className='mb-12'>Enter New Password</h4>
            </div>
            <form onSubmit={handleNewPassword}>
              <div className='icon-field'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='mage:email' />
                </span>
                <input
                  type='password'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Enter Password'
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button
                type='submit'
                className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
                disabled={loading}
              >
                {loading ? "Sending..." : "Continue"}
              </button>
              {message && <div className='alert alert-danger mt-3'>{message}</div>}
              {message && <div className='text-center'>
                <Link
                  href='/sign-in'
                  className='text-primary-600 fw-bold mt-24'
                >
                  Back to Sign In
                </Link>
              </div>
              }
            </form>
          </div>
        </div>
      </section>
    </>)
  } else {
    return (<>
      <section className='auth forgot-password-page bg-base d-flex flex-wrap'>
        <div className='auth-left d-lg-block d-none'>
          <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
            <img src='assets/images/auth/forgot-pass-img.jpg' className='image-cover' />
          </div>
        </div>
        <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
          <div className='max-w-464-px mx-auto w-100'>
            <div>
              <h4 className='mb-12'>Forgot Password</h4>
              <p className='mb-32 text-secondary-light text-lg'>
                Enter the email address associated with your account and we will
                send you a link to reset your password.
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className='icon-field'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='mage:email' />
                </span>
                <input
                  type='email'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Enter Email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button
                type='submit'
                className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
                disabled={loading}
              >
                {loading ? "Sending..." : "Continue"}
              </button>
              {message && <div className='alert alert-danger mt-3'>{message}</div>}
              <div className='text-center'>
                <Link
                  href='/sign-in'
                  className='text-primary-600 fw-bold mt-24'
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
      {/* Modal */}
      <div
        className={`modal fade${showModal ? ' show d-block' : ''}`}
        id='exampleModal'
        tabIndex={-1}
        aria-hidden={!showModal}
        style={showModal ? { background: 'rgba(0,0,0,0.5)' } : {}}
      >
        <div className='modal-dialog modal-dialog modal-dialog-centered'>
          <div className='modal-content radius-16 bg-base'>
            <div className='modal-body p-40 text-center'>
              <div className='mb-32'>
                <img src='assets/images/auth/envelop-icon.png' alt='' />
              </div>
              <h6 className='mb-12'>Verify your Email</h6>
              <p className='text-secondary-light text-sm mb-0'>
                Thank you, check your email for instructions to reset your
                password
              </p>
              <button
                type='button'
                className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
                onClick={() => setShowModal(false)}
              >
                Okay
              </button>
              <div className='mt-32 text-sm'>
                <p className='mb-0'>
                  Don’t receive an email?{" "}
                  <Link href='/resend' className='text-primary-600 fw-semibold'>
                    Resend
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>)
  }
};

export default ForgotPasswordLayer;
