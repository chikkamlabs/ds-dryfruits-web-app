'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Boxes,
  Layers,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Package,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { getPurchaseById, type PurchaseWithDetails } from '@/lib/purchasesStore';

function OpenPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseIdParam = searchParams.get('id');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ESC key navigation to return to purchases dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/admin/purchases/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const fetchPurchase = async () => {
      if (!purchaseIdParam) {
        setIsLoading(false);
        setErrorMessage('No Purchase ID was provided in the URL.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const res = await getPurchaseById(purchaseIdParam);

      if (!isMounted) return;

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        setPurchase(res.data);
      } else {
        setErrorMessage('Purchase record not found.');
      }

      setIsLoading(false);
    };

    fetchPurchase();

    return () => {
      isMounted = false;
    };
  }, [purchaseIdParam]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div id="admin-open-purchase-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader onToggleSidebar={() => setIsSidebarOpen(true)} onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main View Area */}
        <main id="admin-open-purchase-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-5xl mx-auto space-y-6">
            {/* Breadcrumbs & Top Navigation Action */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <div className="breadcrumb-nav mb-1">
                  <Link href="/admin/dashboard" className="breadcrumb-item">
                    Home
                  </Link>
                  <span>/</span>
                  <Link href="/admin/purchases/dashboard" className="breadcrumb-item">
                    Purchases
                  </Link>
                  <span>/</span>
                  <span className="breadcrumb-item-active">
                    {purchase?.purchase_id || 'Purchase Details'}
                  </span>
                </div>
                <div className="layout-flex-start gap-3 flex-wrap">
                  <h1 id="open-purchase-title" className="text-page-title font-bold text-text-primary">
                    Purchase {purchase ? purchase.purchase_id : ''}
                  </h1>
                  {purchase && (
                    <span
                      id="purchase-status-badge"
                      className={`badge-base ${
                        purchase.status === 'completed'
                          ? 'badge-success'
                          : 'badge-warning'
                      } text-xs py-1 px-2.5`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {purchase.status.toUpperCase()} (Read-only)
                    </span>
                  )}
                </div>
              </div>

              <div className="layout-flex-start gap-3">
                <button
                  id="print-purchase-btn"
                  type="button"
                  onClick={handlePrint}
                  className="btn-base btn-secondary layout-flex-start gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <Link
                  id="back-to-purchases-btn"
                  href="/admin/purchases/dashboard"
                  className="btn-base btn-primary layout-flex-start gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Purchases</span>
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                id="open-purchase-error-banner"
                className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger-text layout-flex-between"
              >
                <div className="layout-flex-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                  <span className="text-small font-medium">{errorMessage}</span>
                </div>
                <Link
                  href="/admin/purchases/dashboard"
                  className="text-danger font-bold text-small hover:underline"
                >
                  Return to Dashboard
                </Link>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="card-base p-12 layout-flex-center flex-col gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-body font-medium text-text-secondary">
                  Loading purchase details and line items...
                </p>
              </div>
            )}

            {/* Purchase Details Card */}
            {!isLoading && purchase && (
              <div className="space-y-6">
                {/* Distributor & Purchase Info Grid */}
                <div id="purchase-details-overview-card" className="card-base p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-subtle pb-6">
                    {/* Left: Distributor Information */}
                    <div className="space-y-3">
                      <div className="layout-flex-start gap-2 text-primary font-bold text-sm">
                        <Truck className="w-4 h-4" />
                        <span>DISTRIBUTOR INFORMATION</span>
                      </div>
                      <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1.5">
                        <div className="layout-flex-between">
                          <h3
                            id="view-distributor-name"
                            className="text-card-title font-bold text-text-primary"
                          >
                            {purchase.distributor_name}
                          </h3>
                          <span
                            id="view-distributor-code"
                            className="badge-base badge-primary font-mono text-xs"
                          >
                            {purchase.distributor_code}
                          </span>
                        </div>
                        {purchase.distributor_location && (
                          <p className="text-small text-text-secondary">
                            Location: {purchase.distributor_location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Purchase Metadata & Timestamps */}
                    <div className="space-y-3">
                      <div className="layout-flex-start gap-2 text-primary font-bold text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>PURCHASE METADATA</span>
                      </div>
                      <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-2 text-small">
                        <div className="layout-flex-between">
                          <span className="text-text-muted">Purchase Bill ID:</span>
                          <strong className="font-mono text-primary font-bold">
                            {purchase.purchase_id}
                          </strong>
                        </div>
                        <div className="layout-flex-between">
                          <span className="text-text-muted">Recorded On:</span>
                          <span className="font-medium text-text-primary">
                            {new Date(purchase.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="layout-flex-between">
                          <span className="text-text-muted">Time:</span>
                          <span className="font-medium text-text-primary">
                            {new Date(purchase.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Retail Quantity Added */}
                    <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                      <div className="layout-flex-start gap-2 text-emerald-800 text-xs font-semibold uppercase">
                        <Boxes className="w-4 h-4" />
                        <span>Total Retail Quantity</span>
                      </div>
                      <div
                        id="view-total-retail-qty"
                        className="text-stat-number text-2xl font-bold text-emerald-800 mt-2"
                      >
                        +{Number(purchase.total_retail_quantity).toLocaleString()}
                      </div>
                      <p className="text-caption text-emerald-700 mt-0.5">
                        Added to shop retail inventory
                      </p>
                    </div>

                    {/* Warehouse Quantity Added */}
                    <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                      <div className="layout-flex-start gap-2 text-amber-800 text-xs font-semibold uppercase">
                        <Layers className="w-4 h-4" />
                        <span>Total Warehouse Quantity</span>
                      </div>
                      <div
                        id="view-total-warehouse-qty"
                        className="text-stat-number text-2xl font-bold text-amber-800 mt-2"
                      >
                        +{Number(purchase.total_warehouse_quantity).toLocaleString()}
                      </div>
                      <p className="text-caption text-amber-700 mt-0.5">
                        Added to godown storage
                      </p>
                    </div>

                    {/* Grand Total Quantity */}
                    <div className="p-4 rounded-lg bg-primary-light/60 border border-primary-muted">
                      <div className="layout-flex-start gap-2 text-primary text-xs font-semibold uppercase">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Grand Total Quantity</span>
                      </div>
                      <div
                        id="view-grand-total-qty"
                        className="text-stat-number text-2xl font-bold text-primary mt-2"
                      >
                        +{(
                          Number(purchase.total_retail_quantity) +
                          Number(purchase.total_warehouse_quantity)
                        ).toLocaleString()}
                      </div>
                      <p className="text-caption text-text-secondary mt-0.5">
                        Combined product units
                      </p>
                    </div>
                  </div>

                  {/* Notes / Invoice Reference if present */}
                  {purchase.notes && (
                    <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1">
                      <div className="layout-flex-start gap-1.5 text-caption font-bold text-text-secondary uppercase">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Purchase Notes / Vendor Reference</span>
                      </div>
                      <p className="text-small text-text-primary whitespace-pre-wrap">
                        {purchase.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* PURCHASE ITEMS DETAILS IN ROWS (READ-ONLY) */}
                <div id="purchase-items-table-card" className="card-base overflow-hidden">
                  <div className="card-header layout-flex-between">
                    <div className="layout-flex-start gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      <h2 className="text-section-title font-bold">
                        Purchase Items ({purchase.items?.length || 0})
                      </h2>
                    </div>
                    <span className="badge-base badge-neutral text-xs">
                      Read-Only Record
                    </span>
                  </div>

                  <div className="table-container">
                    <table id="purchase-line-items-table" className="table-base">
                      <thead className="table-header">
                        <tr>
                          <th className="table-th w-12">#</th>
                          <th className="table-th">Product Name</th>
                          <th className="table-th">Category</th>
                          <th className="table-th text-right">MRP (₹)</th>
                          <th className="table-th text-right">Retail Qty Purchased</th>
                          <th className="table-th text-right">Warehouse Qty Purchased</th>
                          <th className="table-th text-right">Total Line Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!purchase.items || purchase.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="table-td text-center py-8 text-text-muted">
                              No item details found for this purchase bill.
                            </td>
                          </tr>
                        ) : (
                          purchase.items.map((item, index) => (
                            <tr
                              key={item.id || index}
                              id={`view-item-row-${index}`}
                              className="table-row hover:bg-surface-hover transition-colors"
                            >
                              {/* S.No */}
                              <td className="table-td font-mono text-caption text-text-muted">
                                {index + 1}
                              </td>

                              {/* Product Name & Barcode */}
                              <td className="table-td">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-text-primary">
                                    {item.product_name}
                                  </span>
                                  {item.barcode && (
                                    <span className="font-mono text-caption text-text-muted">
                                      Barcode: {item.barcode}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Category */}
                              <td className="table-td">
                                <span className="badge-base badge-secondary text-caption">
                                  {item.category_name || 'Unassigned'}
                                </span>
                              </td>

                              {/* MRP */}
                              <td className="table-td text-right font-medium text-text-secondary">
                                ₹{(Number(item.mrp) || 0).toFixed(2)}
                              </td>

                              {/* Retail Quantity Purchased */}
                              <td className="table-td text-right font-bold text-emerald-800">
                                +{Number(item.retail_quantity).toLocaleString()}
                              </td>

                              {/* Warehouse Quantity Purchased */}
                              <td className="table-td text-right font-bold text-amber-800">
                                +{Number(item.warehouse_quantity).toLocaleString()}
                              </td>

                              {/* Total Line Quantity */}
                              <td className="table-td text-right font-bold text-text-primary">
                                +{(
                                  Number(item.retail_quantity) +
                                  Number(item.warehouse_quantity)
                                ).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer Summary */}
                  <div className="table-pagination layout-flex-between">
                    <span className="text-caption text-text-muted">
                      Total items in bill: <strong>{purchase.items?.length || 0}</strong> products
                    </span>
                    <span className="text-caption text-text-muted">
                      Historical entry locked for auditing
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

export default function AdminOpenPurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-app">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <OpenPurchaseContent />
    </Suspense>
  );
}
