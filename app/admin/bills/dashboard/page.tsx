'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Receipt,
  PlusCircle,
  Search,
  Calendar,
  RefreshCw,
  FolderOpen,
  User,
  ShoppingBag,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Boxes,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { getBills, type BillWithDetails } from '@/lib/billsStore';
import type { BillStatus } from '@/lib/types';

// Helper to get local date string YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminBillsDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filters: default dates to today
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');

  // Pagination states (100 records per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 100;

  // Data states
  const [bills, setBills] = useState<BillWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Date presets
  const setDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'today') {
      const str = format(today);
      setStartDate(str);
      setEndDate(str);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const str = format(yesterday);
      setStartDate(str);
      setEndDate(str);
    } else if (preset === 'week') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      setStartDate(format(firstDay));
      setEndDate(format(today));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(format(firstDay));
      setEndDate(format(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await getBills({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        searchQuery: searchQuery || undefined,
        status: statusFilter,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        setBills(res.data);
        setTotalCount(res.count ?? res.data.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch bill records';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, searchQuery, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    const fetchBills = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await getBills({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          searchQuery: searchQuery || undefined,
          status: statusFilter,
        });

        if (!isMounted) return;

        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.data) {
          setBills(res.data);
          setTotalCount(res.count ?? res.data.length);
          setCurrentPage(1);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to fetch bill records';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBills();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, searchQuery, statusFilter]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return bills.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  }, [bills]);

  const totalQuantitySum = useMemo(() => {
    return bills.reduce((acc, curr) => acc + (Number(curr.total_quantity) || 0), 0);
  }, [bills]);

  // Paginated bills (100 records per page)
  const totalPages = Math.ceil(bills.length / PAGE_SIZE) || 1;
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return bills.slice(startIndex, startIndex + PAGE_SIZE);
  }, [bills, currentPage, PAGE_SIZE]);

  return (
    <div id="admin-bills-dashboard-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader onToggleSidebar={() => setIsSidebarOpen(true)} onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main View Area */}
        <main id="admin-bills-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-7xl mx-auto space-y-6">
            {/* 1. Header & Quick Actions */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <div className="breadcrumb-nav mb-1">
                  <Link href="/admin/dashboard" className="breadcrumb-item">
                    Home
                  </Link>
                  <span>/</span>
                  <span className="breadcrumb-item-active">Bills</span>
                </div>
                <div className="layout-flex-start gap-3 flex-wrap">
                  <h1 id="bills-dashboard-title" className="text-page-title font-bold text-text-primary">
                    Billing Dashboard
                  </h1>
                  <span id="total-bills-counter-badge" className="badge-base badge-primary text-xs px-2.5 py-1 font-bold">
                    Total Bills: {totalCount}
                  </span>
                </div>
              </div>

              <div className="layout-flex-start gap-3 flex-wrap">
                <button
                  id="refresh-bills-btn"
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="btn-base btn-outline px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                  title="Refresh bills"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <Link
                  id="create-new-bill-btn"
                  href="/admin/createbill"
                  className="btn-base btn-primary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Bill</span>
                </Link>
              </div>
            </div>

            {/* 2. Top Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div id="stat-total-bills" className="card-base p-4">
                <div className="layout-flex-between">
                  <div>
                    <span className="text-small text-muted block mb-1">Total Bills</span>
                    <span className="text-stat-number font-bold text-primary">{totalCount}</span>
                  </div>
                  <div className="p-3 bg-primary-light text-primary rounded-lg">
                    <Receipt className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div id="stat-total-revenue" className="card-base p-4">
                <div className="layout-flex-between">
                  <div>
                    <span className="text-small text-muted block mb-1">Total Revenue</span>
                    <span className="text-stat-number font-bold text-success">
                      ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-success-light text-success rounded-lg">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div id="stat-total-quantity" className="card-base p-4">
                <div className="layout-flex-between">
                  <div>
                    <span className="text-small text-muted block mb-1">Total Items Sold (Qty)</span>
                    <span className="text-stat-number font-bold text-secondary">
                      {totalQuantitySum.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary-light text-secondary rounded-lg">
                    <Boxes className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Search & Filter Bar */}
            <div id="bills-filter-panel" className="card-base p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Search by Bill ID */}
                <div className="md:col-span-4 form-group mb-0">
                  <label htmlFor="bills-search-input" className="form-label text-xs">
                    Search by Bill ID
                  </label>
                  <div className="relative">
                    <input
                      id="bills-search-input"
                      type="text"
                      placeholder="e.g. bill-260822-1 or 1001..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-base pl-9 text-sm"
                    />
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-muted hover:text-primary text-xs absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Date Filters (From Date & To Date - Default Today) */}
                <div className="md:col-span-3 form-group mb-0">
                  <label htmlFor="bills-from-date" className="form-label text-xs flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>From Date</span>
                  </label>
                  <input
                    id="bills-from-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-base text-sm"
                  />
                </div>

                <div className="md:col-span-3 form-group mb-0">
                  <label htmlFor="bills-to-date" className="form-label text-xs flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>To Date</span>
                  </label>
                  <input
                    id="bills-to-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-base text-sm"
                  />
                </div>

                {/* Status Filter */}
                <div className="md:col-span-2 form-group mb-0">
                  <label htmlFor="bills-status-select" className="form-label text-xs">
                    Status
                  </label>
                  <select
                    id="bills-status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as BillStatus | 'all')}
                    className="select-base text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Quick Date Presets */}
              <div className="layout-flex-between flex-wrap gap-2 pt-2 border-t border-subtle text-xs">
                <div className="layout-flex-start gap-1.5 flex-wrap">
                  <span className="text-muted font-medium mr-1">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset('today')}
                    className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
                      startDate === todayStr && endDate === todayStr
                        ? 'bg-primary text-inverted border-primary'
                        : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset('yesterday')}
                    className="px-2.5 py-1 rounded-md border text-xs font-semibold bg-surface text-secondary border-border hover:bg-surface-hover"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset('week')}
                    className="px-2.5 py-1 rounded-md border text-xs font-semibold bg-surface text-secondary border-border hover:bg-surface-hover"
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset('month')}
                    className="px-2.5 py-1 rounded-md border text-xs font-semibold bg-surface text-secondary border-border hover:bg-surface-hover"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset('all')}
                    className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
                      startDate === '' && endDate === ''
                        ? 'bg-primary text-inverted border-primary'
                        : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                    }`}
                  >
                    All Time
                  </button>
                </div>

                {(startDate !== todayStr || endDate !== todayStr || searchQuery || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(todayStr);
                      setEndDate(todayStr);
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div
                id="bills-error-banner"
                className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger-text layout-flex-between"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="btn-base btn-danger btn-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 4. Bills Records Table */}
            <div id="bills-table-container" className="card-base overflow-hidden">
              <div className="p-4 border-b border-subtle layout-flex-between">
                <div className="layout-flex-start gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  <h2 className="text-section-title font-bold text-text-primary">Bills Record List</h2>
                </div>
                <span className="text-caption text-muted">
                  Showing {bills.length} of {totalCount} records
                </span>
              </div>

              {isLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-body text-muted">Loading bills records...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-muted">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h3 className="text-card-title font-bold text-text-primary">No Bills Found</h3>
                  <p className="text-small text-muted max-w-md">
                    No billing records matched your current date range or search query. You can create a new bill
                    or adjust your filters.
                  </p>
                  <Link
                    href="/admin/createbill"
                    className="btn-base btn-primary btn-sm mt-2 layout-flex-start gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create New Bill</span>
                  </Link>
                </div>
              ) : (
                <div className="table-container overflow-x-auto">
                  <table id="bills-dashboard-table" className="table-base">
                    <thead>
                      <tr className="table-header">
                        <th className="table-th w-14 text-center">S.No</th>
                        <th className="table-th">Bill ID</th>
                        <th className="table-th">Customer Name & Mobile</th>
                        <th className="table-th text-center">Total Products & Quantity</th>
                        <th className="table-th text-right">Total Price</th>
                        <th className="table-th text-center">Status</th>
                        <th className="table-th text-center w-28">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBills.map((bill, index) => {
                        const productCount = bill.total_products_count ?? bill.items.length;
                        const qtyCount = bill.total_quantity ?? bill.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                        const serialNumber = (currentPage - 1) * PAGE_SIZE + index + 1;

                        return (
                          <tr
                            key={bill.id}
                            id={`bill-row-${bill.id}`}
                            className="table-row hover:bg-surface-hover transition-colors"
                          >
                            {/* 1. S.No */}
                            <td className="table-td text-center text-muted font-medium">
                              {serialNumber}
                            </td>

                            {/* 2. Bill ID */}
                            <td className="table-td font-semibold text-primary">
                              <div className="flex flex-col">
                                <span>{bill.bill_id}</span>
                                <span className="text-caption text-muted">
                                  {new Date(bill.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </td>

                            {/* 3. Customer Name & Mobile */}
                            <td className="table-td">
                              {bill.customer ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{bill.customer.name}</span>
                                  </span>
                                  <span className="text-caption text-muted">
                                    {bill.customer.mobile || 'No Mobile'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted text-small italic">Walk-in Customer</span>
                              )}
                            </td>

                            {/* 4. Total Products & Quantity (Numbers only as requested) */}
                            <td className="table-td text-center">
                              <span className="badge-base badge-neutral font-bold text-xs py-1 px-2.5">
                                {productCount} / {qtyCount}
                              </span>
                            </td>

                            {/* 5. Total Price */}
                            <td className="table-td text-right font-bold text-primary">
                              ₹{Number(bill.total).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>

                            {/* 6. Status */}
                            <td className="table-td text-center">
                              {bill.status === 'completed' ? (
                                <span className="badge-base badge-success text-xs font-semibold py-0.5 px-2">
                                  <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                  Completed
                                </span>
                              ) : (
                                <span className="badge-base badge-warning text-xs font-semibold py-0.5 px-2">
                                  <Clock className="w-3 h-3 mr-1 inline" />
                                  Draft
                                </span>
                              )}
                            </td>

                            {/* 7. Open Action Button */}
                            <td className="table-td text-center">
                              <Link
                                id={`open-bill-btn-${bill.id}`}
                                href={`/admin/bills/openbill?id=${bill.id}`}
                                className="btn-base btn-outline btn-sm layout-flex-center gap-1 font-semibold text-primary hover:bg-primary-light"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>Open</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination Footer (100 records per page) */}
                  {bills.length > 0 && (
                    <div id="bills-pagination-bar" className="p-4 border-t border-subtle layout-flex-between flex-wrap gap-3 bg-surface">
                      <span className="text-small text-muted">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, bills.length)} of {bills.length} bills
                      </span>

                      {totalPages > 1 && (
                        <div className="layout-flex-start gap-2">
                          <button
                            id="bills-prev-page-btn"
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn-base btn-secondary btn-sm px-3 py-1.5 rounded-md disabled:opacity-50 layout-flex-start gap-1 text-xs"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Previous</span>
                          </button>

                          <span className="text-xs font-semibold text-text-secondary px-2">
                            Page {currentPage} of {totalPages}
                          </span>

                          <button
                            id="bills-next-page-btn"
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="btn-base btn-secondary btn-sm px-3 py-1.5 rounded-md disabled:opacity-50 layout-flex-start gap-1 text-xs"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
