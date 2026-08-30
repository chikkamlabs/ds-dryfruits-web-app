'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { createCustomer } from '@/lib/customersStore';
import type { CustomerStatus } from '@/lib/types';

export default function AdminAddCustomerPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Form State for all Customer table fields (schemas.sql)
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [points, setPoints] = useState<string>('0');
  const [credit, setCredit] = useState<string>('0');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<CustomerStatus>('active');
  const [notes, setNotes] = useState('');

  // Field refs for sequential keyboard navigation
  const nameRef = useRef<HTMLInputElement | null>(null);
  const mobileRef = useRef<HTMLInputElement | null>(null);
  const pointsRef = useRef<HTMLInputElement | null>(null);
  const creditRef = useRef<HTMLInputElement | null>(null);
  const locationRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLTextAreaElement | null>(null);
  const statusRef = useRef<HTMLSelectElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const fieldRefs = [
    nameRef,
    mobileRef,
    pointsRef,
    creditRef,
    locationRef,
    addressRef,
    statusRef,
    notesRef,
    saveBtnRef,
  ];

  // Auto-focus Full Name when page opens
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ESC key navigation to return to customers dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/admin/customers/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleFieldKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (index === fieldRefs.length - 1) return; // On submit button, proceed with form submit
      e.preventDefault();
      fieldRefs[index + 1]?.current?.focus();
    } else if (e.key === 'ArrowDown') {
      if (index < fieldRefs.length - 1) {
        e.preventDefault();
        fieldRefs[index + 1]?.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault();
        fieldRefs[index - 1]?.current?.focus();
      }
    }
  };

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const validateForm = () => {
    setNameError(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setNameError('Customer name is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedPoints = parseFloat(points) || 0;
    const parsedCredit = parseFloat(credit) || 0;

    const { data, error } = await createCustomer({
      name: name.trim(),
      mobile: mobile.trim() || undefined,
      points: parsedPoints,
      credit: parsedCredit,
      location: location.trim() || undefined,
      address: address.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
    } else if (data) {
      setSuccessMessage(`Customer "${data.name}" registered successfully!`);
      setTimeout(() => {
        router.push('/admin/customers/dashboard');
      }, 1000);
    }
  };

  return (
    <div id="admin-add-customer-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body: Sidebar + Form Content */}
      <div id="admin-add-customer-body" className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Add Customer Main Content */}
        <main
          id="admin-add-customer-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-3xl flex flex-col gap-6">
            {/* Breadcrumbs Navigation */}
            <div id="add-customer-breadcrumbs" className="breadcrumb-nav">
              <Link href="/admin/dashboard" className="breadcrumb-item">
                Admin
              </Link>
              <span>/</span>
              <Link href="/admin/customers/dashboard" className="breadcrumb-item">
                Customers
              </Link>
              <span>/</span>
              <span className="breadcrumb-item-active">Add Customer</span>
            </div>

            {/* Header Section */}
            <div id="add-customer-header-section" className="layout-flex-between">
              <div>
                <h1 id="add-customer-page-title" className="text-page-title flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Add New Customer
                </h1>
                <p id="add-customer-page-subtitle" className="text-subtitle mt-1">
                  Register a customer profile for billing, points, and credit tracking
                </p>
              </div>

              <Link
                id="back-to-customers-link"
                href="/admin/customers/dashboard"
                className="btn-base btn-secondary btn-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
            </div>

            {/* Success Banner */}
            {successMessage && (
              <div
                id="add-customer-success-banner"
                className="card-base p-4 border-l-4 border-success bg-success-bg flex items-center gap-3 animate-fade-in"
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <p className="text-body font-medium text-success text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="add-customer-error-banner"
                className="card-base p-4 border-l-4 border-danger bg-danger-bg flex items-start gap-3 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-label font-semibold text-danger">Failed to Create Customer</h4>
                  <p className="text-body text-danger text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Customer Form Card */}
            <div id="add-customer-form-card" className="card-base">
              <div className="card-header">
                <h2 id="customer-details-title" className="text-card-title">
                  Customer Profile Details
                </h2>
                <span className="text-caption text-secondary">Table: customers (schemas.sql)</span>
              </div>

              <form id="add-customer-form" onSubmit={handleSubmit} className="card-body flex flex-col gap-5">
                {/* Field 1: Name */}
                <div className="form-group">
                  <label htmlFor="customer-name-input" className="form-label">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="customer-name-input"
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    onKeyDown={(e) => handleFieldKeyDown(e, 0)}
                    placeholder="e.g. Ramesh Kumar, Sunita Verma"
                    className={`input-base ${nameError ? 'input-error' : ''}`}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  {nameError && (
                    <span id="customer-name-error" className="form-error">
                      {nameError}
                    </span>
                  )}
                  <span className="form-hint">
                    Primary name of the customer used in billing receipts.
                  </span>
                </div>

                {/* Field 2: Mobile Number */}
                <div className="form-group">
                  <label htmlFor="customer-mobile-input" className="form-label">
                    Mobile Number
                  </label>
                  <input
                    id="customer-mobile-input"
                    ref={mobileRef}
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 1)}
                    placeholder="e.g. 9876543210"
                    className="input-base font-mono"
                    disabled={isSubmitting}
                  />
                  <span className="form-hint">
                    10-digit mobile contact number for SMS receipts and customer lookup.
                  </span>
                </div>

                {/* Two-column layout for Points and Opening Credit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 3: Points */}
                  <div className="form-group">
                    <label htmlFor="customer-points-input" className="form-label">
                      Loyalty Points (Initial)
                    </label>
                    <input
                      id="customer-points-input"
                      ref={pointsRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, 2)}
                      placeholder="0.00"
                      className="input-base font-mono"
                      disabled={isSubmitting}
                    />
                    <span className="form-hint">
                      Starting reward points balance.
                    </span>
                  </div>

                  {/* Field 4: Credit */}
                  <div className="form-group">
                    <label htmlFor="customer-credit-input" className="form-label">
                      Opening Credit / Balance (₹)
                    </label>
                    <input
                      id="customer-credit-input"
                      ref={creditRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={credit}
                      onChange={(e) => setCredit(e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, 3)}
                      placeholder="0.00"
                      className="input-base font-mono"
                      disabled={isSubmitting}
                    />
                    <span className="form-hint">
                      Outstanding credit amount owed to the store.
                    </span>
                  </div>
                </div>

                {/* Field 5: Location / City */}
                <div className="form-group">
                  <label htmlFor="customer-location-input" className="form-label">
                    Location / Area
                  </label>
                  <input
                    id="customer-location-input"
                    ref={locationRef}
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 4)}
                    placeholder="e.g. Hyderabad, Banjara Hills, Secunderabad"
                    className="input-base"
                    disabled={isSubmitting}
                  />
                  <span className="form-hint">
                    Locality, landmark, or market district.
                  </span>
                </div>

                {/* Field 6: Full Address */}
                <div className="form-group">
                  <label htmlFor="customer-address-input" className="form-label">
                    Full Postal Address
                  </label>
                  <textarea
                    id="customer-address-input"
                    ref={addressRef}
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 5)}
                    placeholder="Flat/Shop number, Street, City, Pincode"
                    className="textarea-base"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Field 7: Status (ENUM: 'active' | 'inactive') */}
                <div className="form-group">
                  <label htmlFor="customer-status-select" className="form-label">
                    Account Status <span className="text-danger">*</span>
                  </label>
                  <select
                    id="customer-status-select"
                    ref={statusRef}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 6)}
                    className="select-base"
                    disabled={isSubmitting}
                  >
                    <option value="active">Active - Available for billing and transactions</option>
                    <option value="inactive">Inactive - Blocked or archived profile</option>
                  </select>
                </div>

                {/* Field 8: Notes */}
                <div className="form-group">
                  <label htmlFor="customer-notes-input" className="form-label">
                    Special Notes
                  </label>
                  <textarea
                    id="customer-notes-input"
                    ref={notesRef}
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 7)}
                    placeholder="e.g. Preferred dry fruits packaging, VIP customer, festival orders contact"
                    className="textarea-base"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Form Action Buttons */}
                <div id="add-customer-actions" className="layout-flex-between pt-4 border-t border-subtle mt-2">
                  <Link
                    id="cancel-add-customer-btn"
                    href="/admin/customers/dashboard"
                    className="btn-base btn-ghost btn-md"
                  >
                    Cancel
                  </Link>

                  <button
                    id="save-customer-submit-btn"
                    ref={saveBtnRef}
                    type="submit"
                    onKeyDown={(e) => handleFieldKeyDown(e, 8)}
                    disabled={isSubmitting}
                    className="btn-base btn-primary btn-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving Customer...' : 'Save Customer'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
