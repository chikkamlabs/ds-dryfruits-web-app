'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  ArrowUpDown,
  History,
  Phone,
  Coins,
  Receipt,
  X,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  getCustomers,
  addCustomerTransaction,
  type CustomerWithStats,
} from '@/lib/customersStore';
import type { TransactionCalculation } from '@/lib/types';

export default function AdminCustomersDashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add Transaction Modal State
  const [selectedCustomerForTx, setSelectedCustomerForTx] = useState<CustomerWithStats | null>(null);
  const [txCalculation, setTxCalculation] = useState<TransactionCalculation>('sum');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNotes, setTxNotes] = useState<string>('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [txModalError, setTxModalError] = useState<string | null>(null);
  const [txSuccessMessage, setTxSuccessMessage] = useState<string | null>(null);

  const loadCustomers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await getCustomers();
    if (error) {
      setErrorMessage(error);
    } else {
      setCustomers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await getCustomers();
      if (!isMounted) return;
      if (error) {
        setErrorMessage(error);
      } else {
        setCustomers(data || []);
      }
      setIsLoading(false);
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter customers strictly by customer name (and phone if helpful)
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return customers.filter((cust) => {
      if (!query) return true;
      const matchesName = cust.name ? cust.name.toLowerCase().includes(query) : false;
      const matchesMobile = cust.mobile ? cust.mobile.toLowerCase().includes(query) : false;
      return matchesName || matchesMobile;
    });
  }, [customers, searchQuery]);

  // Aggregate Metrics: Total customers & Total Credit (sum of all customers.credit)
  const totalCustomersCount = customers.length;
  const totalCreditAmount = useMemo(() => {
    return customers.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  }, [customers]);

  // Handle Quick Add Transaction submission
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForTx) return;

    setTxModalError(null);
    setTxSuccessMessage(null);

    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxModalError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmittingTx(true);
    const { data, error } = await addCustomerTransaction({
      customer_id: selectedCustomerForTx.id,
      calculation: txCalculation,
      amount: parsedAmount,
      notes: txNotes.trim() || undefined,
    });

    setIsSubmittingTx(false);

    if (error) {
      setTxModalError(error);
    } else if (data) {
      setTxSuccessMessage(
        `Transaction of ₹${parsedAmount.toFixed(2)} (${txCalculation === 'sum' ? '+ Credit Added' : '- Credit Settled'}) recorded successfully!`
      );
      // Reload customer records to reflect updated credit balance
      await loadCustomers();
      setTimeout(() => {
        setSelectedCustomerForTx(null);
        setTxAmount('');
        setTxNotes('');
        setTxCalculation('sum');
        setTxSuccessMessage(null);
      }, 1200);
    }
  };

  const openTxModal = (customer: CustomerWithStats) => {
    setSelectedCustomerForTx(customer);
    setTxCalculation('sum');
    setTxAmount('');
    setTxNotes('');
    setTxModalError(null);
    setTxSuccessMessage(null);
  };

  return (
    <div id="admin-customers-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body: Sidebar + Main Content */}
      <div id="admin-customers-body" className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Customers Main Content */}
        <main
          id="admin-customers-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container flex flex-col gap-6">
            {/* Breadcrumb Navigation */}
            <div id="customers-breadcrumbs" className="breadcrumb-nav">
              <Link href="/admin/dashboard" className="breadcrumb-item">
                Admin
              </Link>
              <span>/</span>
              <span className="breadcrumb-item-active">Customers</span>
            </div>

            {/* Page Header with Add Customer CTA */}
            <div id="customers-header-section" className="layout-flex-between flex-wrap gap-4">
              <div>
                <h1 id="customers-page-title" className="text-page-title flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Customer Directory
                </h1>
                <p id="customers-page-subtitle" className="text-subtitle mt-1">
                  Manage retail client accounts, loyalty points, and credit ledgers
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                <button
                  id="customers-refresh-btn"
                  type="button"
                  onClick={loadCustomers}
                  disabled={isLoading}
                  className="btn-base btn-secondary btn-md"
                  title="Refresh customers"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <Link
                  id="add-customer-cta-btn"
                  href="/admin/customers/addcustomer"
                  className="btn-base btn-primary btn-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Customer</span>
                </Link>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="customers-error-banner"
                className="card-base p-4 border-l-4 border-danger bg-danger-bg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-label font-semibold text-danger">Database Notice</h4>
                  <p className="text-body text-danger text-sm mt-0.5">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={loadCustomers}
                  className="btn-base btn-secondary btn-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Metric Summary Cards */}
            <div id="customers-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Customers */}
              <div id="metric-total-customers" className="card-base p-5">
                <div className="layout-flex-between mb-2">
                  <span className="text-label">Total Customers</span>
                  <div className="p-2 rounded-md bg-surface-subtle text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div id="total-customers-count" className="text-stat-number">
                  {isLoading ? '...' : totalCustomersCount}
                </div>
                <span className="text-caption text-secondary mt-1">
                  Registered customer profiles in database
                </span>
              </div>

              {/* Total Credit */}
              <div id="metric-total-credit" className="card-base p-5">
                <div className="layout-flex-between mb-2">
                  <span className="text-label">Total Outstanding Credit</span>
                  <div className="p-2 rounded-md bg-surface-subtle text-accent">
                    <Coins className="w-5 h-5" />
                  </div>
                </div>
                <div
                  id="total-credit-amount"
                  className="text-stat-number text-accent font-mono"
                >
                  {isLoading ? '...' : `₹${totalCreditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <span className="text-caption text-secondary mt-1">
                  Cumulative outstanding balance calculated from customers.credit
                </span>
              </div>
            </div>

            {/* Search Bar (Search Customer Name) */}
            <div id="customers-search-card" className="card-base p-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="search-customer-name-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer name (e.g. Rahul, Priya)..."
                  className="input-base pl-9 pr-8 w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-primary"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Customers Table */}
            <div id="customers-table-wrapper" className="table-container">
              <table id="customers-table" className="table-base">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Mobile Number</th>
                    <th className="table-th">Customer Name</th>
                    <th className="table-th text-right">Points</th>
                    <th className="table-th text-right">Credit (₹)</th>
                    <th className="table-th text-center">Total Bills</th>
                    <th className="table-th text-center">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // Skeleton rows during loading
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="table-row">
                        <td className="table-td">
                          <div className="h-4 w-28 animate-skeleton rounded" />
                        </td>
                        <td className="table-td">
                          <div className="h-4 w-36 animate-skeleton rounded" />
                        </td>
                        <td className="table-td text-right">
                          <div className="h-4 w-12 animate-skeleton rounded ml-auto" />
                        </td>
                        <td className="table-td text-right">
                          <div className="h-4 w-16 animate-skeleton rounded ml-auto" />
                        </td>
                        <td className="table-td text-center">
                          <div className="h-4 w-10 animate-skeleton rounded mx-auto" />
                        </td>
                        <td className="table-td text-center">
                          <div className="h-4 w-14 animate-skeleton rounded mx-auto" />
                        </td>
                        <td className="table-td text-right">
                          <div className="h-7 w-32 animate-skeleton rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="layout-flex-center flex-col gap-2">
                          <FolderOpen className="w-10 h-10 text-muted stroke-1" />
                          <p id="empty-customers-title" className="text-card-title text-secondary font-medium">
                            {searchQuery ? 'No customers match your search' : 'No customers recorded yet'}
                          </p>
                          <p className="text-subtitle text-xs max-w-sm">
                            {searchQuery
                              ? 'Try searching with a different name or clear the search input.'
                              : 'Add your first customer to track purchases, points, and ledger credit.'}
                          </p>
                          {searchQuery ? (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="btn-base btn-secondary btn-sm mt-2"
                            >
                              Clear Search
                            </button>
                          ) : (
                            <Link
                              href="/admin/customers/addcustomer"
                              className="btn-base btn-primary btn-sm mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Customer</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const hasCredit = Number(customer.credit) > 0;
                      return (
                        <tr
                          key={customer.id}
                          id={`customer-row-${customer.id}`}
                          className="table-row"
                        >
                          {/* Mobile number */}
                          <td className="table-td font-mono text-sm">
                            {customer.mobile ? (
                              <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                                <Phone className="w-3.5 h-3.5 text-muted" />
                                {customer.mobile}
                              </span>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="table-td font-medium text-primary">
                            <div>{customer.name}</div>
                            {customer.location && (
                              <span className="text-caption text-secondary block text-xs">
                                {customer.location}
                              </span>
                            )}
                          </td>

                          {/* Points */}
                          <td className="table-td text-right font-mono font-medium text-secondary">
                            {Number(customer.points).toFixed(2)}
                          </td>

                          {/* Credit */}
                          <td className="table-td text-right font-mono font-medium">
                            <span
                              className={
                                hasCredit
                                  ? 'text-accent font-semibold'
                                  : 'text-secondary'
                              }
                            >
                              ₹{Number(customer.credit).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>

                          {/* Total Bills */}
                          <td className="table-td text-center">
                            <span className="badge-base badge-neutral font-mono text-xs">
                              <Receipt className="w-3 h-3 mr-1" />
                              {customer.total_bills}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="table-td text-center">
                            <span
                              className={`badge-base ${
                                customer.status === 'active'
                                  ? 'badge-success'
                                  : 'badge-neutral'
                              }`}
                            >
                              <span
                                className={`status-dot ${
                                  customer.status === 'active'
                                    ? 'status-dot-success'
                                    : 'status-dot-neutral'
                                }`}
                              />
                              <span className="capitalize">{customer.status}</span>
                            </span>
                          </td>

                          {/* Action Buttons: Add transaction, Transactions, Open */}
                          <td className="table-td text-right">
                            <div className="layout-flex-start justify-end gap-1.5 flex-wrap">
                              {/* 1. Add Transaction Button (hover card / tap modal) */}
                              <button
                                id={`add-tx-btn-${customer.id}`}
                                type="button"
                                onClick={() => openTxModal(customer)}
                                className="btn-base btn-primary btn-sm inline-flex items-center gap-1"
                                title="Add credit transaction (sum/subtract)"
                              >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                <span>Add Transaction</span>
                              </button>

                              {/* 2. Transactions History Link */}
                              <Link
                                id={`view-tx-btn-${customer.id}`}
                                href={`/admin/customers/transactions?id=${customer.id}`}
                                className="btn-base btn-secondary btn-sm inline-flex items-center gap-1"
                                title="View transaction history"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>Transactions</span>
                              </Link>

                              {/* 3. Open / Edit Customer Link */}
                              <Link
                                id={`open-customer-btn-${customer.id}`}
                                href={`/admin/customers/opencustomer?id=${customer.id}`}
                                className="btn-base btn-outline btn-sm inline-flex items-center gap-1"
                                title="Edit customer details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Table Footer */}
              {!isLoading && filteredCustomers.length > 0 && (
                <div id="customers-table-footer" className="table-pagination">
                  <span className="text-small text-secondary">
                    Showing <strong className="text-primary">{filteredCustomers.length}</strong> of{' '}
                    <strong className="text-primary">{customers.length}</strong> customers
                  </span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Transaction Modal / Popover Card */}
      {selectedCustomerForTx && (
        <div
          id="add-transaction-modal-backdrop"
          className="modal-backdrop animate-fade-in"
        >
          <div
            id="add-transaction-modal-card"
            className="modal-container max-w-md animate-scale-in"
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3
                  id="tx-modal-title"
                  className="text-section-title font-semibold flex items-center gap-2"
                >
                  <ArrowUpDown className="w-5 h-5 text-primary" />
                  Add Customer Transaction
                </h3>
                <p className="text-caption text-secondary mt-0.5">
                  Customer:{' '}
                  <strong className="text-primary">{selectedCustomerForTx.name}</strong>
                  {selectedCustomerForTx.mobile ? ` (${selectedCustomerForTx.mobile})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForTx(null)}
                className="btn-icon p-1 text-muted hover:text-primary"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddTransactionSubmit}>
              <div className="modal-body flex flex-col gap-4">
                {/* Current Credit Display */}
                <div className="p-3 rounded bg-surface-subtle border border-border-subtle flex items-center justify-between">
                  <span className="text-small text-secondary">Current Outstanding Credit:</span>
                  <span className="font-mono font-bold text-accent">
                    ₹
                    {Number(selectedCustomerForTx.credit).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Success Banner */}
                {txSuccessMessage && (
                  <div className="p-3 rounded bg-success-bg border border-success-border flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    <p className="text-small font-medium text-success">{txSuccessMessage}</p>
                  </div>
                )}

                {/* Error Banner */}
                {txModalError && (
                  <div className="p-3 rounded bg-danger-bg border border-danger-border flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                    <p className="text-small text-danger">{txModalError}</p>
                  </div>
                )}

                {/* Calculation Selector: sum vs subtract */}
                <div className="form-group">
                  <label className="form-label">
                    Calculation Action <span className="text-danger">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      id="tx-type-sum-btn"
                      onClick={() => setTxCalculation('sum')}
                      className={`p-3 rounded border text-left flex items-start gap-2.5 transition-all ${
                        txCalculation === 'sum'
                          ? 'border-accent bg-surface shadow-sm ring-2 ring-accent/20'
                          : 'border-border bg-surface-subtle hover:bg-surface'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-label font-semibold text-primary">Sum (+)</div>
                        <div className="text-caption text-secondary text-xs">
                          Increase customer credit (Debit)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="tx-type-subtract-btn"
                      onClick={() => setTxCalculation('subtract')}
                      className={`p-3 rounded border text-left flex items-start gap-2.5 transition-all ${
                        txCalculation === 'subtract'
                          ? 'border-success bg-surface shadow-sm ring-2 ring-success/20'
                          : 'border-border bg-surface-subtle hover:bg-surface'
                      }`}
                    >
                      <MinusCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-label font-semibold text-primary">Subtract (-)</div>
                        <div className="text-caption text-secondary text-xs">
                          Settle/Reduce credit (Payment)
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount Field */}
                <div className="form-group">
                  <label htmlFor="tx-amount-input" className="form-label">
                    Amount (₹) <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold">
                      ₹
                    </span>
                    <input
                      id="tx-amount-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      className="input-base pl-8 font-mono"
                      disabled={isSubmittingTx}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* Notes Field */}
                <div className="form-group">
                  <label htmlFor="tx-notes-input" className="form-label">
                    Notes / Reference (Optional)
                  </label>
                  <input
                    id="tx-notes-input"
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="e.g. Cash received in store, UPI payment ref, Manual credit correction"
                    className="input-base"
                    disabled={isSubmittingTx}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  id="cancel-add-tx-btn"
                  type="button"
                  onClick={() => setSelectedCustomerForTx(null)}
                  disabled={isSubmittingTx}
                  className="btn-base btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-tx-btn"
                  type="submit"
                  disabled={isSubmittingTx}
                  className="btn-base btn-primary btn-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingTx ? 'Recording...' : 'Record Transaction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
