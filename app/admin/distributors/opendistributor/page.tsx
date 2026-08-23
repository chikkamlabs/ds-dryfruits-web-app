'use client';

import React, { useEffect, useState, useId, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  MapPin,
  FileText,
  Calendar,
  Clock,
  Boxes,
  Layers,
  ShoppingBag,
  Edit,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  getDistributorById,
  updateDistributor,
  type DistributorDetailsWithPurchases,
} from '@/lib/distributorsStore';

function OpenDistributorContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get('id');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [distributor, setDistributor] = useState<DistributorDetailsWithPurchases | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Feedback notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Distributor details and purchases
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!distributorIdParam) {
        setIsLoading(false);
        setErrorMessage('No Distributor ID was provided in the URL parameter.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await getDistributorById(distributorIdParam);

        if (!isMounted) return;

        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.data) {
          setDistributor(res.data);
          setEditName(res.data.name);
          setEditLocation(res.data.location || '');
          setEditNotes(res.data.notes || '');
        } else {
          setErrorMessage('Distributor record could not be found.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to fetch distributor details';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [distributorIdParam]);

  // Handle Save Edited Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributor) return;

    if (!editName.trim()) {
      setErrorMessage('Distributor name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateDistributor(distributor.id, {
        name: editName.trim(),
        location: editLocation.trim() || null,
        notes: editNotes.trim() || null,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        setSuccessMessage('Distributor details updated successfully!');
        setDistributor((prev) =>
          prev
            ? {
                ...prev,
                name: res.data!.name,
                location: res.data!.location,
                notes: res.data!.notes,
                updated_at: res.data!.updated_at,
              }
            : null
        );
        setIsEditing(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update distributor details';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    if (distributor) {
      setEditName(distributor.name);
      setEditLocation(distributor.location || '');
      setEditNotes(distributor.notes || '');
    }
    setIsEditing(false);
  };

  return (
    <div id="admin-open-distributor-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main View Area */}
        <main id="admin-open-distributor-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-6xl mx-auto space-y-6">
            {/* Breadcrumb and Top Navigation Header */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <div className="breadcrumb-nav mb-1">
                  <Link href="/admin/dashboard" className="breadcrumb-item">
                    Home
                  </Link>
                  <span>/</span>
                  <Link href="/admin/distributors/dashboard" className="breadcrumb-item">
                    Distributors
                  </Link>
                  <span>/</span>
                  <span className="breadcrumb-item-active">
                    {distributor ? distributor.name : 'Distributor Profile'}
                  </span>
                </div>
                <div className="layout-flex-start gap-3 flex-wrap">
                  <h1 id="open-distributor-title" className="text-page-title font-bold text-text-primary">
                    {distributor ? distributor.name : 'Distributor Details'}
                  </h1>
                  {distributor && (
                    <span
                      id="distributor-code-badge"
                      className="badge-base badge-primary font-mono text-xs py-1 px-2.5"
                    >
                      {distributor.distributor_code}
                    </span>
                  )}
                </div>
              </div>

              <div className="layout-flex-start gap-3">
                <Link
                  id="add-purchase-shortcut-btn"
                  href="/admin/purchases/addpurchase"
                  className="btn-base btn-secondary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <PlusCircle className="w-4 h-4 text-primary" />
                  <span>New Purchase Bill</span>
                </Link>

                <Link
                  id="back-to-distributors-btn"
                  href="/admin/distributors/dashboard"
                  className="btn-base btn-primary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Distributors</span>
                </Link>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div
                id="open-distributor-error-banner"
                className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger-text layout-flex-between"
              >
                <div className="layout-flex-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                  <span className="text-small font-medium">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-danger font-bold text-small hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {successMessage && (
              <div
                id="open-distributor-success-banner"
                className="p-4 rounded-lg bg-success-bg border border-success-border text-success-text layout-flex-between"
              >
                <div className="layout-flex-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span className="text-small font-semibold">{successMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-success font-bold text-small hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="card-base p-12 layout-flex-center flex-col gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-body font-medium text-text-secondary">
                  Loading distributor information and purchase history...
                </p>
              </div>
            )}

            {/* Main Content when loaded */}
            {!isLoading && distributor && (
              <div className="space-y-6">
                {/* 1. DISTRIBUTOR DETAILS & EDIT SECTION */}
                <div id="distributor-profile-card" className="card-base p-6 space-y-6">
                  <div className="layout-flex-between border-b border-subtle pb-4 flex-wrap gap-4">
                    <div className="layout-flex-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-sm">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="layout-flex-start gap-2">
                          <h2
                            id="distributor-display-name"
                            className="text-section-title font-bold text-text-primary"
                          >
                            {distributor.name}
                          </h2>
                          <span className="badge-base badge-primary font-mono text-xs">
                            {distributor.distributor_code}
                          </span>
                        </div>
                        <p className="text-caption text-text-secondary mt-0.5">
                          Registered Supplier Partner
                        </p>
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        id="toggle-edit-distributor-btn"
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setIsEditing(true);
                        }}
                        className="btn-base btn-secondary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                      >
                        <Edit className="w-4 h-4 text-primary" />
                        <span>Edit Details</span>
                      </button>
                    )}
                  </div>

                  {/* Mode A: Viewing Details */}
                  {!isEditing ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Location */}
                        <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1">
                          <div className="layout-flex-start gap-1.5 text-caption font-bold text-text-secondary uppercase">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>Location / Market</span>
                          </div>
                          <p id="view-distributor-location" className="text-body font-semibold text-text-primary">
                            {distributor.location || 'Not specified'}
                          </p>
                        </div>

                        {/* Created At */}
                        <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1">
                          <div className="layout-flex-start gap-1.5 text-caption font-bold text-text-secondary uppercase">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>Partner Since</span>
                          </div>
                          <p className="text-body font-medium text-text-primary">
                            {new Date(distributor.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        {/* Total Bills */}
                        <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1">
                          <div className="layout-flex-start gap-1.5 text-caption font-bold text-text-secondary uppercase">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                            <span>Total Purchases</span>
                          </div>
                          <p id="view-total-purchases-badge" className="text-body font-bold text-primary">
                            {distributor.total_purchases} {distributor.total_purchases === 1 ? 'Purchase Bill' : 'Purchase Bills'}
                          </p>
                        </div>
                      </div>

                      {/* Notes Box */}
                      <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1">
                        <div className="layout-flex-start gap-1.5 text-caption font-bold text-text-secondary uppercase">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Notes & Contact Information</span>
                        </div>
                        <p id="view-distributor-notes" className="text-small text-text-primary whitespace-pre-wrap">
                          {distributor.notes || 'No special notes or contact references added for this distributor.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Mode B: Editing Details Form */
                    <form
                      id="edit-distributor-form"
                      onSubmit={handleSaveDetails}
                      className="p-5 rounded-xl bg-surface-subtle border-2 border-primary space-y-4 animate-fade-in"
                    >
                      <div className="layout-flex-between border-b border-subtle pb-3">
                        <span className="text-label font-bold text-primary">
                          Editing Distributor Information
                        </span>
                        <span className="text-caption text-text-muted">
                          Code: {distributor.distributor_code} (Locked)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name Input */}
                        <div className="form-group">
                          <label htmlFor="edit-distributor-name-input" className="form-label">
                            Distributor Name *
                          </label>
                          <input
                            id="edit-distributor-name-input"
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input-base"
                            required
                          />
                        </div>

                        {/* Location Input */}
                        <div className="form-group">
                          <label htmlFor="edit-distributor-location-input" className="form-label">
                            Location / Market Address
                          </label>
                          <input
                            id="edit-distributor-location-input"
                            type="text"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            placeholder="e.g. APMC Market, Navi Mumbai"
                            className="input-base"
                          />
                        </div>
                      </div>

                      {/* Notes Input */}
                      <div className="form-group">
                        <label htmlFor="edit-distributor-notes-input" className="form-label">
                          Notes / Contact Numbers / Terms
                        </label>
                        <textarea
                          id="edit-distributor-notes-input"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="e.g. Contact Person, Phone number, Delivery terms..."
                          className="textarea-base min-h-[5.5rem]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="layout-flex-between pt-2 border-t border-subtle">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="btn-base btn-ghost layout-flex-start gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>

                        <button
                          id="save-distributor-details-btn"
                          type="submit"
                          disabled={isSaving || !editName.trim()}
                          className="btn-base btn-primary layout-flex-start gap-2 shadow-sm"
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving Changes...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Save Details</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Retail Quantity Added */}
                    <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                      <div className="layout-flex-start gap-2 text-emerald-800 text-xs font-semibold uppercase">
                        <Boxes className="w-4 h-4" />
                        <span>Total Retail Quantity</span>
                      </div>
                      <div
                        id="stat-distributor-retail-qty"
                        className="text-stat-number text-2xl font-bold text-emerald-800 mt-2"
                      >
                        +{Number(distributor.total_retail_quantity).toLocaleString()}
                      </div>
                      <p className="text-caption text-emerald-700 mt-0.5">
                        Stock placed in shop inventory
                      </p>
                    </div>

                    {/* Warehouse Quantity Added */}
                    <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                      <div className="layout-flex-start gap-2 text-amber-800 text-xs font-semibold uppercase">
                        <Layers className="w-4 h-4" />
                        <span>Total Warehouse Quantity</span>
                      </div>
                      <div
                        id="stat-distributor-warehouse-qty"
                        className="text-stat-number text-2xl font-bold text-amber-800 mt-2"
                      >
                        +{Number(distributor.total_warehouse_quantity).toLocaleString()}
                      </div>
                      <p className="text-caption text-amber-700 mt-0.5">
                        Stock placed in godown storage
                      </p>
                    </div>

                    {/* Grand Total Quantity */}
                    <div className="p-4 rounded-lg bg-primary-light/60 border border-primary-muted">
                      <div className="layout-flex-start gap-2 text-primary text-xs font-semibold uppercase">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Grand Total Quantity</span>
                      </div>
                      <div
                        id="stat-distributor-grand-total-qty"
                        className="text-stat-number text-2xl font-bold text-primary mt-2"
                      >
                        +{Number(distributor.total_quantity).toLocaleString()}
                      </div>
                      <p className="text-caption text-text-secondary mt-0.5">
                        Combined product units purchased
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. PURCHASES LIST TABLE SECTION */}
                <div id="distributor-purchases-card" className="card-base overflow-hidden">
                  <div className="card-header layout-flex-between flex-wrap gap-3">
                    <div className="layout-flex-start gap-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      <h2 className="text-section-title font-bold">
                        Purchases History ({distributor.purchases.length})
                      </h2>
                    </div>

                    <Link
                      href="/admin/purchases/addpurchase"
                      className="btn-base btn-secondary btn-sm layout-flex-start gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-primary" />
                      <span>New Purchase with {distributor.name}</span>
                    </Link>
                  </div>

                  <div className="table-container">
                    <table id="distributor-purchases-table" className="table-base">
                      <thead className="table-header">
                        <tr>
                          <th className="table-th w-12">#</th>
                          <th className="table-th">Purchase ID</th>
                          <th className="table-th">Date & Time</th>
                          <th className="table-th text-right">Retail Qty</th>
                          <th className="table-th text-right">Warehouse Qty</th>
                          <th className="table-th text-right">Total Quantity</th>
                          <th className="table-th text-center">Status</th>
                          <th className="table-th">Notes / Ref</th>
                          <th className="table-th text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distributor.purchases.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="table-td text-center py-12 text-text-muted">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <ShoppingBag className="w-8 h-8 text-text-muted stroke-[1.5]" />
                                <p className="text-small font-medium">
                                  No purchase orders recorded for {distributor.name} yet.
                                </p>
                                <Link
                                  href="/admin/purchases/addpurchase"
                                  className="btn-base btn-primary btn-sm mt-2"
                                >
                                  Record First Purchase
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          distributor.purchases.map((purchase, index) => (
                            <tr
                              key={purchase.id}
                              id={`distributor-purchase-row-${purchase.purchase_id}`}
                              className="table-row hover:bg-surface-hover transition-colors"
                            >
                              {/* S.No */}
                              <td className="table-td font-mono text-caption text-text-muted">
                                {index + 1}
                              </td>

                              {/* Purchase Bill ID */}
                              <td className="table-td">
                                <Link
                                  href={`/admin/purchases/openpurchase?id=${purchase.id}`}
                                  className="font-mono font-bold text-primary hover:underline"
                                >
                                  {purchase.purchase_id}
                                </Link>
                              </td>

                              {/* Date & Time */}
                              <td className="table-td text-small text-text-secondary">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-text-primary">
                                    {new Date(purchase.created_at).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span className="text-caption text-text-muted">
                                    {new Date(purchase.created_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </td>

                              {/* Retail Quantity */}
                              <td className="table-td text-right font-bold text-emerald-800">
                                +{Number(purchase.total_retail_quantity).toLocaleString()}
                              </td>

                              {/* Warehouse Quantity */}
                              <td className="table-td text-right font-bold text-amber-800">
                                +{Number(purchase.total_warehouse_quantity).toLocaleString()}
                              </td>

                              {/* Total Quantity */}
                              <td className="table-td text-right font-bold text-text-primary">
                                +{Number(purchase.total_quantity).toLocaleString()}
                              </td>

                              {/* Status */}
                              <td className="table-td text-center">
                                <span
                                  className={`badge-base ${
                                    purchase.status === 'completed'
                                      ? 'badge-success'
                                      : 'badge-warning'
                                  } text-xs uppercase`}
                                >
                                  {purchase.status}
                                </span>
                              </td>

                              {/* Notes */}
                              <td className="table-td text-caption text-text-secondary max-w-xs truncate">
                                {purchase.notes || '—'}
                              </td>

                              {/* Action: Open Purchase */}
                              <td className="table-td text-right">
                                <Link
                                  id={`open-purchase-btn-${purchase.purchase_id}`}
                                  href={`/admin/purchases/openpurchase?id=${purchase.id}`}
                                  className="btn-base btn-outline btn-sm layout-flex-start gap-1.5 inline-flex"
                                >
                                  <span>Open</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="table-pagination layout-flex-between">
                    <span className="text-caption text-text-muted">
                      Total Purchases: <strong>{distributor.purchases.length}</strong> bills recorded
                    </span>
                    <span className="text-caption text-text-muted">
                      Click &quot;Open&quot; to inspect line items and quantities in detail
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminOpenDistributorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-app">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <OpenDistributorContent />
    </Suspense>
  );
}
