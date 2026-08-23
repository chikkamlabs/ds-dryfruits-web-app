'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Key,
  History,
  Coins,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { getCustomerById, updateCustomer, deleteCustomer } from '@/lib/customersStore';
import type { Customer, CustomerStatus } from '@/lib/types';

function OpenCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerParamId = searchParams.get('id');

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields on Customer table (schemas.sql)
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [points, setPoints] = useState<string>('0');
  const [credit, setCredit] = useState<string>('0');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<CustomerStatus>('active');
  const [notes, setNotes] = useState('');

  // Messages & Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCustomer() {
      if (!customerParamId) {
        if (!isMounted) return;
        setIsLoading(false);
        setErrorMessage('No customer ID specified in request URL.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await getCustomerById(customerParamId);

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error);
      } else if (data) {
        setCustomer(data);
        setName(data.name || '');
        setMobile(data.mobile || '');
        setPoints(String(data.points ?? 0));
        setCredit(String(data.credit ?? 0));
        setLocation(data.location || '');
        setAddress(data.address || '');
        setStatus(data.status || 'active');
        setNotes(data.notes || '');
      } else {
        setErrorMessage('Customer not found in database.');
      }
      setIsLoading(false);
    }

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [customerParamId]);

  const validateForm = () => {
    setNameError(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setNameError('Customer name is required.');
      return false;
    }
    return true;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedPoints = parseFloat(points) || 0;
    const parsedCredit = parseFloat(credit) || 0;

    const { data, error } = await updateCustomer(customer.id, {
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
      setCustomer(data);
      setSuccessMessage(`Customer "${data.name}" profile updated successfully!`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;

    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await deleteCustomer(customer.id);
    setIsDeleting(false);

    if (error) {
      setErrorMessage(`Cannot delete customer: ${error}`);
      setShowDeleteConfirm(false);
    } else {
      router.push('/admin/customers/dashboard');
    }
  };

  return (
    <div id="admin-open-customer-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body */}
      <div id="admin-open-customer-body" className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Edit Customer Main Content */}
        <main
          id="admin-open-customer-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-3xl flex flex-col gap-6">
            {/* Breadcrumbs Navigation */}
            <div id="open-customer-breadcrumbs" className="breadcrumb-nav">
              <Link href="/admin/dashboard" className="breadcrumb-item">
                Admin
              </Link>
              <span>/</span>
              <Link href="/admin/customers/dashboard" className="breadcrumb-item">
                Customers
              </Link>
              <span>/</span>
              <span className="breadcrumb-item-active">
                {customer ? customer.name : 'Edit Customer'}
              </span>
            </div>

            {/* Header Section */}
            <div id="open-customer-header-section" className="layout-flex-between flex-wrap gap-4">
              <div>
                <h1 id="open-customer-page-title" className="text-page-title flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  {customer ? `Edit Customer: ${customer.name}` : 'Edit Customer'}
                </h1>
                <p id="open-customer-page-subtitle" className="text-subtitle mt-1">
                  Update customer information, contact details, points, and credit balance
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                {customer && (
                  <Link
                    id="view-customer-transactions-link"
                    href={`/admin/customers/transactions?id=${customer.id}`}
                    className="btn-base btn-primary btn-md inline-flex items-center gap-1.5"
                  >
                    <History className="w-4 h-4" />
                    <span>View Transactions</span>
                  </Link>
                )}
                <Link
                  id="back-to-customers-btn"
                  href="/admin/customers/dashboard"
                  className="btn-base btn-secondary btn-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Link>
                {customer && (
                  <button
                    id="open-delete-customer-dialog-btn"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-base btn-danger btn-md"
                    title="Delete this customer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Success Banner */}
            {successMessage && (
              <div
                id="open-customer-success-banner"
                className="card-base p-4 border-l-4 border-success bg-success-bg flex items-center gap-3 animate-fade-in"
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <p className="text-body font-medium text-success text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="open-customer-error-banner"
                className="card-base p-4 border-l-4 border-danger bg-danger-bg flex items-start gap-3 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-label font-semibold text-danger">Action Error</h4>
                  <p className="text-body text-danger text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading ? (
              <div className="card-base p-6 flex flex-col gap-4">
                <div className="h-6 w-48 animate-skeleton rounded" />
                <div className="h-10 w-full animate-skeleton rounded" />
                <div className="h-10 w-full animate-skeleton rounded" />
                <div className="h-10 w-full animate-skeleton rounded" />
              </div>
            ) : !customer ? (
              <div className="card-base p-8 text-center">
                <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
                <h3 className="text-section-title font-semibold mb-2">Customer Not Found</h3>
                <p className="text-subtitle text-sm mb-4">
                  The requested customer profile could not be found in the database.
                </p>
                <Link
                  href="/admin/customers/dashboard"
                  className="btn-base btn-primary btn-md inline-flex"
                >
                  Return to Customers Dashboard
                </Link>
              </div>
            ) : (
              <>
                {/* Customer Edit Form Card */}
                <div id="edit-customer-form-card" className="card-base">
                  <div className="card-header">
                    <h2 id="edit-customer-title" className="text-card-title">
                      Customer Profile Information
                    </h2>
                    <span
                      className={`badge-base ${
                        customer.status === 'active' ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      <span className="capitalize">{customer.status}</span>
                    </span>
                  </div>

                  <form id="edit-customer-form" onSubmit={handleUpdate} className="card-body flex flex-col gap-5">
                    {/* Field 1: Name */}
                    <div className="form-group">
                      <label htmlFor="edit-customer-name-input" className="form-label">
                        Customer Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="edit-customer-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError(null);
                        }}
                        className={`input-base ${nameError ? 'input-error' : ''}`}
                        disabled={isSubmitting}
                      />
                      {nameError && (
                        <span id="edit-customer-name-error" className="form-error">
                          {nameError}
                        </span>
                      )}
                    </div>

                    {/* Field 2: Mobile Number */}
                    <div className="form-group">
                      <label htmlFor="edit-customer-mobile-input" className="form-label">
                        Mobile Number
                      </label>
                      <input
                        id="edit-customer-mobile-input"
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="input-base font-mono"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Points and Credit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Field 3: Points */}
                      <div className="form-group">
                        <label htmlFor="edit-customer-points-input" className="form-label">
                          Loyalty Points
                        </label>
                        <input
                          id="edit-customer-points-input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                          className="input-base font-mono"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Field 4: Credit */}
                      <div className="form-group">
                        <label htmlFor="edit-customer-credit-input" className="form-label">
                          Outstanding Credit (₹)
                        </label>
                        <input
                          id="edit-customer-credit-input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={credit}
                          onChange={(e) => setCredit(e.target.value)}
                          className="input-base font-mono font-semibold text-accent"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Field 5: Location */}
                    <div className="form-group">
                      <label htmlFor="edit-customer-location-input" className="form-label">
                        Location / City
                      </label>
                      <input
                        id="edit-customer-location-input"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="input-base"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Field 6: Address */}
                    <div className="form-group">
                      <label htmlFor="edit-customer-address-input" className="form-label">
                        Full Address
                      </label>
                      <textarea
                        id="edit-customer-address-input"
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="textarea-base"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Field 7: Status */}
                    <div className="form-group">
                      <label htmlFor="edit-customer-status-select" className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        id="edit-customer-status-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                        className="select-base"
                        disabled={isSubmitting}
                      >
                        <option value="active">Active - Available for billing and transactions</option>
                        <option value="inactive">Inactive - Blocked or archived profile</option>
                      </select>
                    </div>

                    {/* Field 8: Notes */}
                    <div className="form-group">
                      <label htmlFor="edit-customer-notes-input" className="form-label">
                        Notes
                      </label>
                      <textarea
                        id="edit-customer-notes-input"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="textarea-base"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Read-Only Database Metadata */}
                    <div
                      id="customer-metadata-section"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded bg-surface-subtle border border-border-subtle mt-2"
                    >
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <Key className="w-4 h-4 text-muted flex-shrink-0" />
                        <span className="font-mono text-caption truncate" title={customer.id}>
                          UUID: {customer.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <Coins className="w-4 h-4 text-accent flex-shrink-0" />
                        <span>
                          Current Credit Balance:{' '}
                          <strong className="text-accent font-mono">
                            ₹{Number(customer.credit).toFixed(2)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
                        <span>
                          Created:{' '}
                          {customer.created_at
                            ? new Date(customer.created_at).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                      {customer.updated_at && (
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
                          <span>
                            Last Updated:{' '}
                            {new Date(customer.updated_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Form Action Buttons */}
                    <div id="edit-customer-actions" className="layout-flex-between pt-4 border-t border-subtle mt-2">
                      <Link
                        id="cancel-edit-customer-btn"
                        href="/admin/customers/dashboard"
                        className="btn-base btn-ghost btn-md"
                      >
                        Cancel
                      </Link>

                      <button
                        id="save-changes-customer-btn"
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-base btn-primary btn-md"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && customer && (
        <div id="delete-confirm-modal" className="modal-backdrop animate-fade-in">
          <div className="modal-container animate-scale-in">
            <div className="modal-header">
              <h3 className="text-section-title font-semibold text-danger flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Confirm Customer Deletion
              </h3>
            </div>
            <div className="modal-body">
              <p className="text-body mb-2">
                Are you sure you want to delete customer <strong>&quot;{customer.name}&quot;</strong>
                {customer.mobile ? ` (${customer.mobile})` : ''}?
              </p>
              <p className="text-small text-danger bg-danger-bg p-3 rounded border border-danger-border">
                Warning: If this customer has existing billing records or ledger transactions, database
                foreign key constraints may restrict deletion.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-base btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-customer-btn"
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-base btn-danger btn-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOpenCustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="layout-page-container layout-flex-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-body font-medium">Loading customer...</p>
          </div>
        </div>
      }
    >
      <OpenCustomerContent />
    </Suspense>
  );
}
