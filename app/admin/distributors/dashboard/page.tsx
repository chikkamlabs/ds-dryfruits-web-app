'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  MapPin,
  FileText,
  Boxes,
  ExternalLink,
  X,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  getDistributors,
  createDistributor,
  type DistributorWithStats,
} from '@/lib/distributorsStore';

export default function AdminDistributorsDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [distributors, setDistributors] = useState<DistributorWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Distributor Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load distributors
  const fetchDistributors = async (query = searchQuery) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await getDistributors(query);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        setDistributors(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load distributors';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await getDistributors();
        if (!isMounted) return;
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.data) {
          setDistributors(res.data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load distributors';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered distributors client-side for immediate responsive typing
  const filteredDistributors = useMemo(() => {
    if (!searchQuery.trim()) return distributors;
    const q = searchQuery.toLowerCase().trim();
    return distributors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.distributor_code.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.location && d.location.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q))
    );
  }, [distributors, searchQuery]);

  // Aggregate Metrics
  const totalDistributorsCount = distributors.length;
  const totalPurchasesCount = useMemo(
    () => distributors.reduce((sum, d) => sum + (Number(d.total_purchases) || 0), 0),
    [distributors]
  );
  const totalSuppliedQuantity = useMemo(
    () => distributors.reduce((sum, d) => sum + (Number(d.total_quantity) || 0), 0),
    [distributors]
  );

  // Handle Add Distributor Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMessage('Distributor Name is required.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await createDistributor({
      name: newName.trim(),
      location: newLocation.trim() || null,
      notes: newNotes.trim() || null,
    });

    setIsCreating(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setSuccessMessage(`Distributor "${res.data.name}" added successfully with code ${res.data.distributor_code}!`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewLocation('');
      setNewNotes('');
      // Refresh list
      fetchDistributors();
    }
  };

  return (
    <div id="admin-distributors-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <main id="admin-distributors-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-7xl mx-auto space-y-6">
            {/* Top Breadcrumb & Page Header */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <div className="breadcrumb-nav mb-1">
                  <Link href="/admin/dashboard" className="breadcrumb-item">
                    Home
                  </Link>
                  <span>/</span>
                  <span className="breadcrumb-item-active">Distributors</span>
                </div>
                <h1 id="distributors-dashboard-title" className="text-page-title font-bold text-text-primary">
                  Distributors Directory
                </h1>
                <p className="text-subtitle mt-0.5">
                  Manage vendors, supplier partners, locations, contact notes, and purchase order histories
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                <button
                  id="open-add-distributor-modal-btn"
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setIsAddModalOpen(true);
                  }}
                  className="btn-base btn-primary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Distributor</span>
                </button>
              </div>
            </div>

            {/* Notifications / Alerts */}
            {errorMessage && (
              <div
                id="distributors-error-banner"
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
                id="distributors-success-banner"
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

            {/* METRIC CARDS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Distributors */}
              <div
                id="metric-total-distributors"
                className="card-base p-5 layout-flex-between hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="text-caption font-semibold text-text-secondary uppercase tracking-wider">
                    Total Distributors
                  </span>
                  <div
                    id="stat-total-distributors-count"
                    className="text-stat-number text-3xl font-bold text-primary mt-1"
                  >
                    {totalDistributorsCount}
                  </div>
                  <span className="text-caption text-text-muted mt-1 block">
                    Registered vendor suppliers
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-primary-light text-primary">
                  <Truck className="w-7 h-7" />
                </div>
              </div>

              {/* Card 2: Total Purchases Count */}
              <div
                id="metric-total-purchases-count"
                className="card-base p-5 layout-flex-between hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="text-caption font-semibold text-text-secondary uppercase tracking-wider">
                    Total Purchases
                  </span>
                  <div
                    id="stat-total-purchases-count"
                    className="text-stat-number text-3xl font-bold text-secondary mt-1"
                  >
                    {totalPurchasesCount}
                  </div>
                  <span className="text-caption text-text-muted mt-1 block">
                    Procurement bills recorded
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary-light text-secondary">
                  <ShoppingBag className="w-7 h-7" />
                </div>
              </div>

              {/* Card 3: Total Supplied Stock Units */}
              <div
                id="metric-total-supplied-stock"
                className="card-base p-5 layout-flex-between hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="text-caption font-semibold text-text-secondary uppercase tracking-wider">
                    Total Units Procured
                  </span>
                  <div
                    id="stat-total-supplied-units"
                    className="text-stat-number text-3xl font-bold text-accent mt-1"
                  >
                    {totalSuppliedQuantity.toLocaleString()}
                  </div>
                  <span className="text-caption text-text-muted mt-1 block">
                    Retail & godown additions
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-accent-light text-accent">
                  <Boxes className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* SEARCH AND CONTROLS BAR */}
            <div id="distributors-search-card" className="card-base p-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Search Input */}
                <div className="sm:col-span-8 md:col-span-9 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
                  <input
                    id="search-distributors-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search distributors by name, ID code (e.g. distri-101), or location..."
                    className="input-base !pl-10 w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Refresh and Action */}
                <div className="sm:col-span-4 md:col-span-3 layout-flex-start justify-end gap-2">
                  <button
                    id="refresh-distributors-btn"
                    type="button"
                    onClick={() => fetchDistributors(searchQuery)}
                    className="btn-base btn-secondary px-4 py-2 rounded-lg layout-flex-center gap-1.5 w-full sm:w-auto shadow-xs font-medium"
                    title="Refresh List"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* DISTRIBUTORS TABLE CARD */}
            <div id="distributors-table-card" className="card-base overflow-hidden">
              <div className="card-header layout-flex-between">
                <div className="layout-flex-start gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h2 className="text-card-title font-bold">
                    Distributors Directory ({filteredDistributors.length})
                  </h2>
                </div>
                {searchQuery && (
                  <span className="text-caption text-text-muted">
                    Filtered by: &quot;{searchQuery}&quot;
                  </span>
                )}
              </div>

              <div className="table-container">
                <table id="distributors-directory-table" className="table-base">
                  <thead className="table-header">
                    <tr>
                      <th className="table-th w-12">#</th>
                      <th className="table-th">Distributor ID</th>
                      <th className="table-th">Distributor Name</th>
                      <th className="table-th">Location</th>
                      <th className="table-th text-center">Total Purchases</th>
                      <th className="table-th">Notes</th>
                      <th className="table-th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="table-td text-center py-12 text-text-muted">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                            <span className="text-small font-medium">Loading distributors directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDistributors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="table-td text-center py-12 text-text-muted">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Truck className="w-8 h-8 text-text-muted stroke-[1.5]" />
                            <p className="text-small font-medium">No distributors found.</p>
                            <p className="text-caption">
                              {searchQuery
                                ? `No vendor matched "${searchQuery}". Try a different keyword.`
                                : 'Click "Add Distributor" above to create your first vendor.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDistributors.map((dist, index) => (
                        <tr
                          key={dist.id}
                          id={`distributor-row-${dist.distributor_code}`}
                          className="table-row hover:bg-surface-hover transition-colors"
                        >
                          {/* Serial Number */}
                          <td className="table-td font-mono text-caption text-text-muted">
                            {index + 1}
                          </td>

                          {/* Distributor Code / ID */}
                          <td className="table-td">
                            <span className="badge-base badge-primary font-mono text-xs">
                              {dist.distributor_code}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="table-td font-bold text-text-primary">
                            <Link
                              href={`/admin/distributors/opendistributor?id=${dist.id}`}
                              className="hover:text-primary hover:underline transition-colors"
                            >
                              {dist.name}
                            </Link>
                          </td>

                          {/* Location */}
                          <td className="table-td text-small text-text-secondary">
                            {dist.location ? (
                              <div className="layout-flex-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                <span>{dist.location}</span>
                              </div>
                            ) : (
                              <span className="text-caption text-text-muted italic">Not specified</span>
                            )}
                          </td>

                          {/* Total Purchases */}
                          <td className="table-td text-center">
                            <span
                              id={`distributor-purchases-badge-${dist.distributor_code}`}
                              className={`badge-base ${
                                dist.total_purchases > 0 ? 'badge-secondary' : 'badge-neutral'
                              } font-semibold`}
                            >
                              {dist.total_purchases} {dist.total_purchases === 1 ? 'bill' : 'bills'}
                            </span>
                          </td>

                          {/* Notes */}
                          <td className="table-td text-small text-text-secondary max-w-xs truncate">
                            {dist.notes ? (
                              <div className="layout-flex-start gap-1.5" title={dist.notes}>
                                <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                <span className="truncate">{dist.notes}</span>
                              </div>
                            ) : (
                              <span className="text-caption text-text-muted italic">—</span>
                            )}
                          </td>

                          {/* Action Button: Open */}
                          <td className="table-td text-right">
                            <Link
                              id={`open-distributor-btn-${dist.distributor_code}`}
                              href={`/admin/distributors/opendistributor?id=${dist.id}`}
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
                  Showing <strong>{filteredDistributors.length}</strong> of <strong>{distributors.length}</strong> distributors
                </span>
                <span className="text-caption text-text-muted">
                  Click &quot;Open&quot; to view and edit details or inspect purchase records
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ADD DISTRIBUTOR MODAL / DIALOG */}
      {isAddModalOpen && (
        <div
          id="add-distributor-modal-backdrop"
          className="modal-backdrop flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => !isCreating && setIsAddModalOpen(false)}
        >
          <div
            id="add-distributor-modal-container"
            className="modal-container max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header layout-flex-between">
              <div className="layout-flex-start gap-2">
                <div className="p-2 rounded-lg bg-primary-light text-primary">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="add-distributor-modal-title" className="text-card-title font-bold">
                    Add New Distributor
                  </h3>
                  <p className="text-caption text-text-muted">
                    Enter supplier vendor name, location, and notes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isCreating}
                className="btn-base btn-ghost btn-icon-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body space-y-4">
                {/* Name */}
                <div className="form-group">
                  <label htmlFor="modal-distributor-name" className="form-label">
                    Distributor Name *
                  </label>
                  <input
                    id="modal-distributor-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Royal Dry Fruits Wholesalers"
                    className="input-base"
                    required
                    autoFocus
                  />
                </div>

                {/* Location */}
                <div className="form-group">
                  <label htmlFor="modal-distributor-location" className="form-label">
                    Location / City / Market (Optional)
                  </label>
                  <input
                    id="modal-distributor-location"
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. APMC Market, Vashi, Navi Mumbai"
                    className="input-base"
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label htmlFor="modal-distributor-notes" className="form-label">
                    Notes / Contact Details (Optional)
                  </label>
                  <textarea
                    id="modal-distributor-notes"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Contact Person: Rajesh Bhai (+91 98765 43210), delivers on Tuesdays..."
                    className="textarea-base min-h-[5rem]"
                  />
                </div>
              </div>

              <div className="modal-footer layout-flex-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isCreating}
                  className="btn-base btn-ghost"
                >
                  Cancel
                </button>

                <button
                  id="submit-create-distributor-btn"
                  type="submit"
                  disabled={isCreating || !newName.trim()}
                  className="btn-base btn-primary layout-flex-start gap-2"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Distributor...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Distributor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
