'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Calendar,
  RefreshCw,
  FolderOpen,
  Boxes,
  Truck,
  AlertCircle,
  Package,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import {
  getPurchases,
  getPurchasesByProducts,
  type PurchaseWithDetails,
  type ProductPurchaseSummary,
} from '@/lib/purchasesStore';

// Helper to get local date string YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminPurchasesDashboardPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'by_distributors' | 'by_products'>('by_distributors');

  // Filters: default dates to today
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Directly focus the search bar input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Data states
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductPurchaseSummary[]>([]);
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

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (viewMode === 'by_distributors') {
        const res = await getPurchases({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          distributorSearch: searchQuery || undefined,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.data) {
          setPurchases(res.data);
        }
      } else {
        const res = await getPurchasesByProducts({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          distributorSearch: searchQuery || undefined,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.data) {
          setProductSummaries(res.data);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch purchase records';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (viewMode === 'by_distributors') {
          const res = await getPurchases({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            distributorSearch: searchQuery || undefined,
          });

          if (!isMounted) return;

          if (res.error) {
            setErrorMessage(res.error);
          } else if (res.data) {
            setPurchases(res.data);
          }
        } else {
          const res = await getPurchasesByProducts({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            distributorSearch: searchQuery || undefined,
          });

          if (!isMounted) return;

          if (res.error) {
            setErrorMessage(res.error);
          } else if (res.data) {
            setProductSummaries(res.data);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to fetch purchase records';
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
  }, [viewMode, startDate, endDate, searchQuery]);

  // Derived metrics for current view
  const totalPurchasesCount = useMemo(() => {
    if (viewMode === 'by_distributors') {
      return purchases.length;
    }
    return productSummaries.reduce((sum, p) => sum + p.purchase_count, 0);
  }, [viewMode, purchases, productSummaries]);

  const totalRetailQty = useMemo(() => {
    if (viewMode === 'by_distributors') {
      return purchases.reduce((sum, p) => sum + (Number(p.total_retail_quantity) || 0), 0);
    }
    return productSummaries.reduce((sum, p) => sum + (Number(p.total_retail_quantity) || 0), 0);
  }, [viewMode, purchases, productSummaries]);

  const totalWarehouseQty = useMemo(() => {
    if (viewMode === 'by_distributors') {
      return purchases.reduce((sum, p) => sum + (Number(p.total_warehouse_quantity) || 0), 0);
    }
    return productSummaries.reduce((sum, p) => sum + (Number(p.total_warehouse_quantity) || 0), 0);
  }, [viewMode, purchases, productSummaries]);

  const totalCombinedQty = useMemo(() => {
    return totalRetailQty + totalWarehouseQty;
  }, [totalRetailQty, totalWarehouseQty]);

  return (
    <div id="admin-purchases-layout" className="flex flex-col h-screen overflow-hidden bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader onToggleSidebar={() => setIsSidebarOpen(true)} onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Purchases Content */}
        <main id="admin-purchases-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-7xl mx-auto space-y-6">
            {/* Header: Page Title and Add Purchase CTA */}
            <div id="purchases-header-section" className="layout-flex-between flex-wrap gap-4">
              <div>
                <h1 id="purchases-page-title" className="text-page-title font-bold text-text-primary">
                  Purchases
                </h1>
                <p id="purchases-page-subtitle" className="text-subtitle mt-1">
                  Track vendor purchase stock, update retail and warehouse inventories
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                <button
                  id="refresh-purchases-btn"
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="btn-base btn-secondary btn-icon-sm"
                  title="Refresh purchases list"
                  aria-label="Refresh purchases list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <Link
                  id="add-purchase-btn"
                  href="/admin/purchases/addpurchase"
                  className="btn-base btn-primary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Add Purchase</span>
                </Link>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div
                id="purchases-error-banner"
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

            {/* Dashboard Summary Statistics */}
            <div id="purchases-stats-grid" className="layout-grid-dashboard">
              {/* Stat 1: Total Purchases */}
              <div id="stat-total-purchases" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Total Purchases
                  </span>
                  <div className="p-2 rounded-lg bg-primary-light text-primary">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-total-purchases-value" className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalPurchasesCount}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    {startDate && endDate && startDate === endDate
                      ? `Purchases recorded on ${startDate}`
                      : startDate || endDate
                      ? `Recorded in selected date range`
                      : 'All-time purchase transactions'}
                  </p>
                </div>
              </div>

              {/* Stat 2: Total Retail Quantity */}
              <div id="stat-retail-quantity" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Total Retail Quantity
                  </span>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-retail-qty-value" className="text-stat-number font-bold text-emerald-800">
                    {isLoading ? '...' : totalRetailQty.toLocaleString()}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    Units / kg added to shop retail stock
                  </p>
                </div>
              </div>

              {/* Stat 3: Total Warehouse Quantity */}
              <div id="stat-warehouse-quantity" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Total Warehouse Quantity
                  </span>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-warehouse-qty-value" className="text-stat-number font-bold text-amber-800">
                    {isLoading ? '...' : totalWarehouseQty.toLocaleString()}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    Units / kg added to godown stock
                  </p>
                </div>
              </div>

              {/* Stat 4: Combined Inventory Added */}
              <div id="stat-combined-quantity" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Total Quantity Added
                  </span>
                  <div className="p-2 rounded-lg bg-secondary-light text-secondary">
                    <Truck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-combined-qty-value" className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalCombinedQty.toLocaleString()}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    Total stock volume received
                  </p>
                </div>
              </div>
            </div>

            {/* Filter & View Switcher Section */}
            <div id="purchases-filter-panel" className="card-base p-4 space-y-4">
              {/* Top Row: View Selector (By distributors / By products) & Date Quick Filters */}
              <div className="layout-flex-between flex-wrap gap-4 border-b border-subtle pb-4">
                {/* View Selection Tabs */}
                <div className="flex items-center bg-surface-subtle p-1 rounded-lg border border-border">
                  <button
                    id="filter-by-distributors-tab"
                    type="button"
                    onClick={() => setViewMode('by_distributors')}
                    className={`px-4 py-2 text-xs font-semibold rounded-md transition-all layout-flex-start gap-1.5 ${
                      viewMode === 'by_distributors'
                        ? 'bg-[#5d4037] text-white shadow-xs font-bold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>By Distributors (Default)</span>
                  </button>

                  <button
                    id="filter-by-products-tab"
                    type="button"
                    onClick={() => setViewMode('by_products')}
                    className={`px-4 py-2 text-xs font-semibold rounded-md transition-all layout-flex-start gap-1.5 ${
                      viewMode === 'by_products'
                        ? 'bg-[#5d4037] text-white shadow-xs font-bold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>By Products</span>
                  </button>
                </div>

                {/* Quick Date Range Buttons */}
                <div className="layout-flex-start gap-1.5 flex-wrap">
                  <span className="text-caption text-text-muted mr-1">Quick:</span>
                  <button
                    id="preset-today-btn"
                    type="button"
                    onClick={() => setDatePreset('today')}
                    className={`btn-base btn-sm text-xs ${
                      startDate === todayStr && endDate === todayStr
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    id="preset-yesterday-btn"
                    type="button"
                    onClick={() => setDatePreset('yesterday')}
                    className="btn-base btn-secondary btn-sm text-xs"
                  >
                    Yesterday
                  </button>
                  <button
                    id="preset-week-btn"
                    type="button"
                    onClick={() => setDatePreset('week')}
                    className="btn-base btn-secondary btn-sm text-xs"
                  >
                    This Week
                  </button>
                  <button
                    id="preset-month-btn"
                    type="button"
                    onClick={() => setDatePreset('month')}
                    className="btn-base btn-secondary btn-sm text-xs"
                  >
                    This Month
                  </button>
                  <button
                    id="preset-all-btn"
                    type="button"
                    onClick={() => setDatePreset('all')}
                    className="btn-base btn-ghost btn-sm text-xs text-text-secondary hover:text-text-primary"
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Bottom Row: Search Input and From/To Date Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Search Bar */}
                <div className="md:col-span-6 form-group">
                  <label htmlFor="search-purchases-input" className="form-label">
                    {viewMode === 'by_distributors'
                      ? 'Search Distributor Name / Purchase ID'
                      : 'Search Product Name / ID / Barcode'}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
                    <input
                      ref={searchInputRef}
                      id="search-purchases-input"
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        viewMode === 'by_distributors'
                          ? 'Search by distributor name, code, or bill ID...'
                          : 'Search by product name, code, category...'
                      }
                      className="input-base input-with-icon-left w-full"
                    />
                  </div>
                </div>

                {/* From Date */}
                <div className="md:col-span-3 form-group">
                  <label htmlFor="filter-from-date" className="form-label layout-flex-start gap-1">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    <span>From Date</span>
                  </label>
                  <input
                    id="filter-from-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-base w-full"
                  />
                </div>

                {/* To Date */}
                <div className="md:col-span-3 form-group">
                  <label htmlFor="filter-to-date" className="form-label layout-flex-start gap-1">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    <span>To Date</span>
                  </label>
                  <input
                    id="filter-to-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-base w-full"
                  />
                </div>
              </div>
            </div>

            {/* TAB VIEW 1: BY DISTRIBUTORS (DEFAULT) */}
            {viewMode === 'by_distributors' && (
              <div id="purchases-by-distributors-card" className="card-base overflow-hidden">
                <div className="table-container">
                  <table id="purchases-distributors-table" className="table-base">
                    <thead className="table-header">
                      <tr>
                        <th id="th-purchase-id" className="table-th">
                          Purchase ID
                        </th>
                        <th id="th-distributor-name" className="table-th">
                          Distributor Name
                        </th>
                        <th id="th-purchase-date" className="table-th">
                          Date & Time
                        </th>
                        <th id="th-total-retail-qty" className="table-th text-right">
                          Total Retail Quantity
                        </th>
                        <th id="th-warehouse-qty" className="table-th text-right">
                          Warehouse Quantity
                        </th>
                        <th id="th-total-combined-qty" className="table-th text-right">
                          Total Quantity
                        </th>
                        <th id="th-purchase-status" className="table-th text-center">
                          Status
                        </th>
                        <th id="th-purchase-action" className="table-th text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="table-td text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                              <span className="text-body text-text-secondary font-medium">
                                Loading purchases from Supabase...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : purchases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="table-td text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Package className="w-10 h-10 text-text-muted stroke-[1.5]" />
                              <p className="text-card-title font-semibold text-text-primary">
                                No purchases found
                              </p>
                              <p className="text-small text-text-muted max-w-md">
                                {searchQuery || startDate || endDate
                                  ? 'No purchases match the selected date range and search filter.'
                                  : 'No purchases have been recorded yet.'}
                              </p>
                              <div className="mt-3 layout-flex-center gap-3">
                                {(searchQuery || startDate !== todayStr || endDate !== todayStr) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSearchQuery('');
                                      setDatePreset('today');
                                    }}
                                    className="btn-base btn-secondary btn-sm"
                                  >
                                    Reset to Today
                                  </button>
                                )}
                                <Link
                                  href="/admin/purchases/addpurchase"
                                  className="btn-base btn-primary btn-sm layout-flex-start gap-2"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                  <span>Add First Purchase</span>
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        purchases.map((purchase) => {
                          const dateObj = new Date(purchase.created_at);
                          const dateFormatted = dateObj.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          });
                          const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <tr
                              key={purchase.id}
                              id={`purchase-row-${purchase.purchase_id}`}
                              className="table-row hover:bg-surface-hover transition-colors"
                            >
                              {/* Purchase_id */}
                              <td className="table-td">
                                <span className="font-mono font-bold text-primary">
                                  {purchase.purchase_id}
                                </span>
                              </td>

                              {/* Distributor_name */}
                              <td className="table-td">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-text-primary">
                                    {purchase.distributor_name}
                                  </span>
                                  <span className="font-mono text-caption text-text-muted">
                                    {purchase.distributor_code}
                                  </span>
                                </div>
                              </td>

                              {/* Date & Time */}
                              <td className="table-td text-text-secondary whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-medium text-text-primary">{dateFormatted}</span>
                                  <span className="text-caption text-text-muted">{timeFormatted}</span>
                                </div>
                              </td>

                              {/* Total retail quantity */}
                              <td className="table-td text-right font-medium text-emerald-800">
                                {Number(purchase.total_retail_quantity).toLocaleString()}
                              </td>

                              {/* warehouse_quantity */}
                              <td className="table-td text-right font-medium text-amber-800">
                                {Number(purchase.total_warehouse_quantity).toLocaleString()}
                              </td>

                              {/* Total combined quantity */}
                              <td className="table-td text-right font-bold text-text-primary">
                                {(
                                  Number(purchase.total_retail_quantity) +
                                  Number(purchase.total_warehouse_quantity)
                                ).toLocaleString()}
                              </td>

                              {/* Status */}
                              <td className="table-td text-center">
                                <span
                                  className={`badge-base ${
                                    purchase.status === 'completed'
                                      ? 'badge-success'
                                      : 'badge-warning'
                                  }`}
                                >
                                  {purchase.status === 'completed' ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Completed</span>
                                    </>
                                  ) : (
                                    purchase.status
                                  )}
                                </span>
                              </td>

                              {/* Action: Open */}
                              <td className="table-td text-right">
                                <Link
                                  id={`open-purchase-btn-${purchase.purchase_id}`}
                                  href={`/admin/purchases/openpurchase?id=${purchase.id}`}
                                  className="btn-base btn-outline btn-sm layout-flex-start gap-1.5 inline-flex"
                                >
                                  <FolderOpen className="w-4 h-4 text-primary" />
                                  <span>Open</span>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                {!isLoading && purchases.length > 0 && (
                  <div className="table-pagination layout-flex-between">
                    <span className="text-caption text-text-muted">
                      Showing <strong>{purchases.length}</strong> purchase records
                    </span>
                    <span className="text-caption text-text-muted">
                      All quantities automatically synced with Supabase inventory
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 2: BY PRODUCTS */}
            {viewMode === 'by_products' && (
              <div id="purchases-by-products-card" className="card-base overflow-hidden">
                <div className="table-container">
                  <table id="purchases-products-table" className="table-base">
                    <thead className="table-header">
                      <tr>
                        <th id="th-prod-id" className="table-th">
                          Product ID & Barcode
                        </th>
                        <th id="th-prod-name" className="table-th">
                          Product Name
                        </th>
                        <th id="th-prod-category" className="table-th">
                          Category
                        </th>
                        <th id="th-prod-mrp" className="table-th text-right">
                          MRP (₹)
                        </th>
                        <th id="th-prod-retail-qty" className="table-th text-right">
                          Retail Quantity
                        </th>
                        <th id="th-prod-warehouse-qty" className="table-th text-right">
                          Warehouse Quantity
                        </th>
                        <th id="th-prod-total-qty" className="table-th text-right">
                          Total Quantity
                        </th>
                        <th id="th-prod-bills-count" className="table-th text-center">
                          Purchases
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="table-td text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                              <span className="text-body text-text-secondary font-medium">
                                Grouping product purchase volumes...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : productSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="table-td text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Boxes className="w-10 h-10 text-text-muted stroke-[1.5]" />
                              <p className="text-card-title font-semibold text-text-primary">
                                No product purchase entries
                              </p>
                              <p className="text-small text-text-muted max-w-md">
                                No items were purchased within the selected filter range.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        productSummaries.map((prod) => (
                          <tr
                            key={prod.product_id}
                            id={`product-purchase-row-${prod.product_id}`}
                            className="table-row hover:bg-surface-hover transition-colors"
                          >
                            {/* product_id & barcode */}
                            <td className="table-td">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-primary">
                                  {prod.product_id}
                                </span>
                                {prod.barcode && (
                                  <span className="font-mono text-caption text-text-muted">
                                    {prod.barcode}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Product Name */}
                            <td className="table-td font-semibold text-text-primary">
                              {prod.product_name}
                            </td>

                            {/* Category */}
                            <td className="table-td">
                              <span className="badge-base badge-secondary text-caption">
                                {prod.category_name}
                              </span>
                            </td>

                            {/* MRP */}
                            <td className="table-td text-right font-medium text-text-secondary">
                              ₹{(Number(prod.mrp) || 0).toFixed(2)}
                            </td>

                            {/* Retail Quantity */}
                            <td className="table-td text-right font-medium text-emerald-800">
                              {prod.total_retail_quantity.toLocaleString()}
                            </td>

                            {/* Warehouse Quantity */}
                            <td className="table-td text-right font-medium text-amber-800">
                              {prod.total_warehouse_quantity.toLocaleString()}
                            </td>

                            {/* Total Quantity */}
                            <td className="table-td text-right font-bold text-text-primary">
                              {prod.total_quantity.toLocaleString()}
                            </td>

                            {/* Purchases Count */}
                            <td className="table-td text-center">
                              <span className="badge-base badge-primary text-xs">
                                {prod.purchase_count} {prod.purchase_count === 1 ? 'bill' : 'bills'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                {!isLoading && productSummaries.length > 0 && (
                  <div className="table-pagination layout-flex-between">
                    <span className="text-caption text-text-muted">
                      Aggregated <strong>{productSummaries.length}</strong> purchased products
                    </span>
                    <span className="text-caption text-text-muted">
                      Showing total retail and warehouse additions
                    </span>
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
