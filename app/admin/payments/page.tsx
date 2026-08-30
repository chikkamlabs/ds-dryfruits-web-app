'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Calendar,
  Search,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  RefreshCw,
  Eye,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import AdminSidebar from '../sidebar/page';
import AdminHeader from '../header/page';
import {
  getPaymentsData,
  PaymentBillRecord,
  PaymentSummary,
} from '../../../lib/paymentsStore';

export default function AdminPaymentsPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Date Filters (default today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Directly focus the search bar input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Pagination states (100 records per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 100;

  // State
  const [bills, setBills] = useState<PaymentBillRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalSale: 0,
    totalCash: 0,
    totalUpi: 0,
    totalCredit: 0,
    totalBillsCount: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPaymentsData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        searchQuery: searchQuery.trim() || undefined,
      });

      if (res.error && !res.data) {
        setError(res.error);
      } else if (res.data) {
        setBills(res.data.bills);
        setSummary(res.data.summary);
      }
    } catch (err: unknown) {
      setError('Failed to load payment transactions');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchQuery]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getPaymentsData({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          searchQuery: searchQuery.trim() || undefined,
        });

        if (!isMounted) return;
        if (res.error && !res.data) {
          setError(res.error);
        } else if (res.data) {
          setBills(res.data.bills);
          setSummary(res.data.summary);
          setCurrentPage(1);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError('Failed to load payment transactions');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, searchQuery]);

  const handleResetFilters = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Paginated bills (100 records per page)
  const totalPages = Math.ceil(bills.length / PAGE_SIZE) || 1;
  const paginatedBills = bills.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div id="admin-payments-layout" className="flex flex-col h-screen overflow-hidden bg-bg-app">
      {/* Top Navigation Bar with Menu toggle (3 lines) */}
      <AdminHeader
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <main id="admin-payments-main" className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Breadcrumbs & Top Bar with Title and Expenses Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--color-border-subtle)]">
            <div>
              <div className="breadcrumb-nav mb-2">
                <Link href="/admin/dashboard" className="breadcrumb-item">
                  Home
                </Link>
                <span>/</span>
                <span className="breadcrumb-item-active">Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <Wallet className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-page-title text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">
                    Payment Dashboard
                  </h1>
                  <p className="text-small text-[var(--color-text-muted)]">
                    Overview of total sales, payment modes, and daily expenses
                  </p>
                </div>
              </div>
            </div>

            {/* Total Expenses Button */}
            <div className="flex items-center gap-3">
              <Link
                id="btn-goto-expenses"
                href="/admin/expenses"
                className="btn-base btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm font-medium transition-all hover:shadow hover:opacity-95"
              >
                <TrendingUp className="w-4 h-4 text-amber-200" />
                <span>Total Expenses</span>
                <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-900/30 text-amber-100 border border-amber-500/20">
                  {formatCurrency(summary.totalExpenses)}
                </span>
                <ChevronRight className="w-4 h-4 ml-0.5 opacity-70" />
              </Link>

              <button
                id="btn-refresh-payments"
                onClick={fetchPayments}
                disabled={loading}
                title="Refresh data"
                className="btn-base btn-outline p-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Sale */}
            <div
              id="card-total-sale"
              className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Total Sale
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(summary.totalSale)}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Cash + UPI + Credit ({summary.totalBillsCount} bills)
                </div>
              </div>
            </div>

            {/* Card 2: Total Cash */}
            <div
              id="card-total-cash"
              className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Total Cash
                </span>
                <span className="p-2 rounded-lg bg-green-50 text-green-700">
                  <Banknote className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(summary.totalCash)}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Received in cash payments
                </div>
              </div>
            </div>

            {/* Card 3: Total UPI */}
            <div
              id="card-total-upi"
              className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Total UPI
                </span>
                <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <Smartphone className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(summary.totalUpi)}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Online UPI transactions
                </div>
              </div>
            </div>

            {/* Card 4: Total Credit */}
            <div
              id="card-total-credit"
              className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Total Credit
                </span>
                <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-amber-700">
                  {formatCurrency(summary.totalCredit)}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Outstanding customer credits
                </div>
              </div>
            </div>

            {/* Card 5: Total Expenses Button / Metric */}
            <Link
              id="card-total-expenses-link"
              href="/admin/expenses"
              className="card-base p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition-all shadow-xs flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                  Total Expenses
                </span>
                <span className="p-2 rounded-lg bg-rose-100 text-rose-700 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-rose-700">
                  {formatCurrency(summary.totalExpenses)}
                </div>
                <div className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <span>View Expenses table</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Filters Bar: Date (From to default today) & Search */}
          <div
            id="payments-filters-bar"
            className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                <Filter className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Filter Payments by Date</span>
              </div>

              {(startDate !== todayStr || endDate !== todayStr || searchQuery) && (
                <button
                  id="btn-reset-filters"
                  onClick={handleResetFilters}
                  className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                >
                  Reset to Today
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Date From */}
              <div className="form-group mb-0">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                  Date From:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-10" />
                  <input
                    id="filter-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-base input-with-icon-left text-sm py-2 w-full"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="form-group mb-0">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                  Date To:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-10" />
                  <input
                    id="filter-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-base input-with-icon-left text-sm py-2 w-full"
                  />
                </div>
              </div>

              {/* Search by Bill ID */}
              <div className="form-group mb-0 sm:col-span-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                  Search Bill ID / Customer:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-10" />
                  <input
                    ref={searchInputRef}
                    id="filter-search-query"
                    type="text"
                    autoFocus
                    placeholder="Search by Bill ID (e.g. BILL-...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-base input-with-icon-left text-sm py-2 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Payments Table: bill_id, customer name & mobile, total, cash, upi, credit */}
          <div className="card-base rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-card-title font-semibold text-[var(--color-text-primary)]">
                  Payment Records
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Showing {bills.length} bills in selected range
                </p>
              </div>

              <div className="text-xs font-medium text-[var(--color-text-muted)]">
                Range: <span className="text-[var(--color-text-primary)] font-semibold">{startDate || 'Any'}</span> to <span className="text-[var(--color-text-primary)] font-semibold">{endDate || 'Any'}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table id="table-payments" className="table-base w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <th className="py-3 px-4 font-semibold">Bill ID</th>
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold">Customer Details</th>
                    <th className="py-3 px-4 font-semibold text-right">Total (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right">Cash (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right">UPI (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right">Credit (₹)</th>
                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[var(--color-text-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                          <span>Loading payment records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : bills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[var(--color-text-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt className="w-8 h-8 opacity-30" />
                          <span className="font-medium">No payment records found</span>
                          <span className="text-xs">Try selecting a different date range.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedBills.map((bill) => (
                      <tr
                        key={bill.id}
                        id={`row-payment-${bill.id}`}
                        className="hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        {/* Bill ID */}
                        <td className="py-3 px-4 font-mono font-semibold text-[var(--color-primary)]">
                          <Link
                            href={`/admin/bills/openbill?id=${bill.id}`}
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{bill.bill_id}</span>
                          </Link>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {formatDateTime(bill.created_at)}
                        </td>

                        {/* Customer Name & Mobile */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--color-text-primary)]">
                            {bill.customer_name}
                          </div>
                          {bill.customer_mobile ? (
                            <div className="text-xs text-[var(--color-text-muted)]">
                              📱 {bill.customer_mobile}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--color-text-muted)] italic">
                              No mobile
                            </div>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-3 px-4 text-right font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                          {formatCurrency(bill.total)}
                        </td>

                        {/* Cash */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {bill.cash > 0 ? (
                            <span className="font-semibold text-green-700">
                              {formatCurrency(bill.cash)}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono">-</span>
                          )}
                        </td>

                        {/* UPI */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {bill.upi > 0 ? (
                            <span className="font-semibold text-blue-700">
                              {formatCurrency(bill.upi)}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Credit */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {bill.credit > 0 ? (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              {formatCurrency(bill.credit)}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Link
                            id={`btn-view-bill-${bill.id}`}
                            href={`/admin/bills/openbill?id=${bill.id}`}
                            className="btn-base btn-ghost p-1.5 rounded text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] inline-flex items-center gap-1 text-xs"
                            title="View Bill Details"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer Totals */}
                {bills.length > 0 && (
                  <tfoot>
                    <tr className="bg-[var(--color-surface-subtle)] border-t-2 border-[var(--color-border-strong)] font-bold text-sm">
                      <td colSpan={3} className="py-3.5 px-4 text-right uppercase tracking-wider text-[var(--color-text-primary)]">
                        Total:
                      </td>
                      <td className="py-3.5 px-4 text-right text-[var(--color-text-primary)]">
                        {formatCurrency(summary.totalSale)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-green-700">
                        {formatCurrency(summary.totalCash)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-blue-700">
                        {formatCurrency(summary.totalUpi)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-amber-700">
                        {formatCurrency(summary.totalCredit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls (100 per page) */}
            {bills.length > 0 && (
              <div className="p-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between flex-wrap gap-4 bg-[var(--color-surface)]">
                <div className="text-xs text-[var(--color-text-muted)]">
                  Showing <span className="font-semibold text-[var(--color-text-primary)]">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {Math.min(currentPage * PAGE_SIZE, bills.length)}
                  </span>{' '}
                  of <span className="font-semibold text-[var(--color-text-primary)]">{bills.length}</span> records (100 per page)
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="btn-base btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs text-[var(--color-text-secondary)] px-2 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="btn-base btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
