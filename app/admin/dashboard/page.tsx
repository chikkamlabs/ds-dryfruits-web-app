'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  IndianRupee,
  ShoppingBag,
  PackagePlus,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  Boxes,
} from 'lucide-react';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { getBills, type BillWithDetails } from '@/lib/billsStore';
import { getPurchases, type PurchaseWithDetails } from '@/lib/purchasesStore';
import { getProducts } from '@/lib/productsStore';
import type { Product } from '@/lib/types';

export default function AdminDashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const billButtonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();

  // State for data
  const [bills, setBills] = useState<BillWithDetails[]>([]);
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [billsRes, purchasesRes, productsRes] = await Promise.all([
        getBills(),
        getPurchases(),
        getProducts(),
      ]);

      if (billsRes.data) {
        setBills(billsRes.data);
      }
      if (purchasesRes.data) {
        setPurchases(purchasesRes.data);
      }
      if (productsRes.data) {
        setProducts(productsRes.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [billsRes, purchasesRes, productsRes] = await Promise.all([
          getBills(),
          getPurchases(),
          getProducts(),
        ]);

        if (!isMounted) return;
        if (billsRes.data) {
          setBills(billsRes.data);
        }
        if (purchasesRes.data) {
          setPurchases(purchasesRes.data);
        }
        if (productsRes.data) {
          setProducts(productsRes.data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcut listener: If on admin dashboard and Enter is pressed, focus and open Bill
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses Enter while not inside an input/textarea/select
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          if (billButtonRef.current) {
            billButtonRef.current.focus();
          }
          router.push('/admin/createbill');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  // Aggregate Metrics
  const totalBillsCount = bills.length;

  const totalSaleAmount = useMemo(() => {
    return bills.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  }, [bills]);

  const totalItemsSold = useMemo(() => {
    return bills.reduce((acc, curr) => {
      if (curr.total_quantity !== undefined && curr.total_quantity !== null) {
        return acc + Number(curr.total_quantity);
      }
      return (
        acc +
        (curr.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0)
      );
    }, 0);
  }, [bills]);

  const totalPurchasesCount = purchases.length;

  // Low stock items: Show the 5 products with lowest stock levels in the inventory
  const lowStockItems = useMemo(() => {
    if (!products || products.length === 0) return [];

    // Sort all products by lowest total stock (retail + warehouse) ascending
    const sorted = [...products].sort((a, b) => {
      const stockA = (Number(a.retail_quantity) || 0) + (Number(a.warehouse_quantity) || 0);
      const stockB = (Number(b.retail_quantity) || 0) + (Number(b.warehouse_quantity) || 0);
      return stockA - stockB;
    });

    // Take top 5 lowest stock products
    return sorted.slice(0, 5);
  }, [products]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div id="admin-layout" className="layout-page-container h-screen overflow-hidden relative bg-bg-app">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body: Sidebar + Main Content */}
      <div id="admin-body" className="flex flex-1 overflow-hidden relative">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Admin Dashboard Main Content Area */}
        <main
          id="admin-dashboard-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative"
        >
          <div className="layout-responsive-container max-w-7xl mx-auto space-y-6">
            {/* Top Bar with Refresh action */}
            <div className="layout-flex-between flex-wrap gap-4 pb-2 border-b border-border-subtle">
              <div>
                <h1 className="text-page-title text-text-primary">Dashboard Overview</h1>
                <p className="text-small text-text-secondary">
                  Real-time sales, inventory, and purchase metrics
                </p>
              </div>

              <button
                id="refresh-dashboard-btn"
                type="button"
                onClick={loadDashboardData}
                disabled={isLoading}
                className="btn-base btn-secondary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 text-primary ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Metrics 4-Grid Cards */}
            <div
              id="admin-metrics-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* 1. Total Bills */}
              <div
                id="metric-total-bills"
                className="card-base p-5 rounded-xl border border-border shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="layout-flex-between items-start mb-3">
                  <span className="text-label text-text-secondary font-medium">Total Bills</span>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary layout-flex-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalBillsCount.toLocaleString()}
                  </div>
                  <span className="text-xs text-text-muted mt-1 inline-block">
                    Invoiced transactions
                  </span>
                </div>
              </div>

              {/* 2. Total Sale */}
              <div
                id="metric-total-sale"
                className="card-base p-5 rounded-xl border border-border shadow-xs hover:border-success/40 transition-colors flex flex-col justify-between"
              >
                <div className="layout-flex-between items-start mb-3">
                  <span className="text-label text-text-secondary font-medium">Total Sale</span>
                  <div className="w-10 h-10 rounded-lg bg-success/10 text-success layout-flex-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-stat-number font-bold text-success">
                    {isLoading ? '...' : formatCurrency(totalSaleAmount)}
                  </div>
                  <span className="text-xs text-text-muted mt-1 inline-block">
                    Gross revenue generated
                  </span>
                </div>
              </div>

              {/* 3. Total Items Sold */}
              <div
                id="metric-total-items-sold"
                className="card-base p-5 rounded-xl border border-border shadow-xs hover:border-accent/40 transition-colors flex flex-col justify-between"
              >
                <div className="layout-flex-between items-start mb-3">
                  <span className="text-label text-text-secondary font-medium">Total Items Sold</span>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent layout-flex-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalItemsSold.toLocaleString()}
                  </div>
                  <span className="text-xs text-text-muted mt-1 inline-block">
                    Units dispatched
                  </span>
                </div>
              </div>

              {/* 4. Total Purchases */}
              <div
                id="metric-total-purchases"
                className="card-base p-5 rounded-xl border border-border shadow-xs hover:border-secondary/40 transition-colors flex flex-col justify-between"
              >
                <div className="layout-flex-between items-start mb-3">
                  <span className="text-label text-text-secondary font-medium">Total Purchases</span>
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary layout-flex-center">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalPurchasesCount.toLocaleString()}
                  </div>
                  <span className="text-xs text-text-muted mt-1 inline-block">
                    Inward supply batches
                  </span>
                </div>
              </div>
            </div>

            {/* Low Stock Items Section (Top 5 items, Tap to open /admin/products/dashboard) */}
            <div
              id="admin-low-stock-section"
              className="card-base rounded-xl border border-border shadow-xs overflow-hidden"
            >
              <div className="p-5 border-b border-border-subtle layout-flex-between flex-wrap gap-3 bg-surface">
                <div className="layout-flex-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 text-danger layout-flex-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-card-title text-text-primary flex items-center gap-2">
                      Low Stock Items
                      {lowStockItems.length > 0 && (
                        <span className="badge-base badge-danger text-xs px-2 py-0.5 rounded-full">
                          {lowStockItems.length} critical
                        </span>
                      )}
                    </h2>
                    <p className="text-small text-text-muted">
                      Showing up to 5 items requiring inventory replenishment
                    </p>
                  </div>
                </div>

                <Link
                  id="view-all-products-link"
                  href="/admin/products/dashboard"
                  className="btn-base btn-ghost text-xs text-primary hover:text-primary-focus font-semibold layout-flex-start gap-1 p-2 rounded-lg"
                >
                  <span>Open Products Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-text-muted text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading stock levels...</span>
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <Boxes className="w-10 h-10 mx-auto text-success/60 mb-2" />
                  <p className="font-medium text-text-primary">Stock Levels Healthy</p>
                  <p className="text-small text-text-muted">No products currently below low stock thresholds.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {lowStockItems.map((item) => {
                    const totalQty = (Number(item.retail_quantity) || 0) + (Number(item.warehouse_quantity) || 0);
                    const isOutOfStock = totalQty <= 0;

                    return (
                      <div
                        key={item.id}
                        id={`low-stock-item-${item.id}`}
                        onClick={() => router.push('/admin/products/dashboard')}
                        className="p-4 sm:px-6 hover:bg-surface-subtle cursor-pointer transition-colors layout-flex-between gap-4"
                        title="Tap to open Products Dashboard"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="layout-flex-start gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-text-primary truncate">
                              {item.name}
                            </span>
                            <span className="badge-base badge-neutral text-xs px-2 py-0.5 rounded">
                              {item.product_id || item.id.slice(0, 8)}
                            </span>
                            {item.barcode && (
                              <span className="text-xs text-text-muted font-mono">
                                [{item.barcode}]
                              </span>
                            )}
                          </div>
                          <div className="text-small text-text-muted flex items-center gap-4 flex-wrap">
                            <span>Retail: <strong className="text-text-primary">{item.retail_quantity ?? 0}</strong></span>
                            <span>Warehouse: <strong className="text-text-primary">{item.warehouse_quantity ?? 0}</strong></span>
                            <span>Price: <strong className="text-text-primary">₹{item.selling_price ?? item.mrp}</strong></span>
                          </div>
                        </div>

                        <div className="layout-flex-start gap-3 shrink-0 items-center">
                          <span
                            className={`badge-base text-xs font-semibold px-2.5 py-1 rounded-full ${
                              isOutOfStock
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock (0)' : `Total: ${totalQty} units`}
                          </span>
                          <ChevronRight className="w-5 h-5 text-text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating Bill Button on bottom right */}
        <div id="admin-bottom-right-bill-container" className="fixed bottom-6 right-6 z-40">
          <button
            ref={billButtonRef}
            id="admin-quick-bill-btn"
            type="button"
            onClick={() => router.push('/admin/createbill')}
            className="btn-base btn-primary h-14 px-6 rounded-full shadow-lg hover:shadow-xl flex items-center gap-3 text-base font-semibold border-2 border-primary-light transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-focus cursor-pointer"
            title="Create New Bill (Press Enter)"
            aria-label="Create New Bill"
          >
            <Receipt className="w-6 h-6" />
            <span>Bill</span>
            <span className="text-xs bg-surface/20 px-2 py-0.5 rounded font-mono ml-1 hidden sm:inline-block">↵ Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
