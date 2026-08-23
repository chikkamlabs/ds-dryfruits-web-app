'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Package,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { getProducts } from '@/lib/productsStore';
import { getCategories } from '@/lib/categoriesStore';
import type { Product, Category } from '@/lib/types';

export default function AdminProductsDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'retail_low' | 'warehouse_low' | 'any_low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'mrp' | 'retail_quantity' | 'warehouse_quantity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [productsRes, categoriesRes] = await Promise.all([
      getProducts(),
      getCategories(),
    ]);

    if (productsRes.error) {
      setErrorMessage(productsRes.error);
    } else if (productsRes.data) {
      setProducts(productsRes.data);
    }

    if (categoriesRes.data) {
      setCategories(categoriesRes.data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const [productsRes, categoriesRes] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);

      if (!isMounted) return;

      if (productsRes.error) {
        setErrorMessage(productsRes.error);
      } else if (productsRes.data) {
        setProducts(productsRes.data);
      }

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      setIsLoading(false);
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Category ID to Category Name Map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => {
      map.set(cat.id, cat);
      if (cat.category_id) {
        map.set(cat.category_id, cat);
      }
    });
    return map;
  }, [categories]);

  // Categories filtered for search inside category dropdown/selector
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.category_id.toLowerCase().includes(q)
    );
  }, [categories, categorySearchQuery]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Search Query: ID, name, or barcode
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        prod.product_id.toLowerCase().includes(q) ||
        prod.name.toLowerCase().includes(q) ||
        (prod.barcode && prod.barcode.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Category Filter
      if (selectedCategory !== 'all') {
        const prodCat = prod.category_id;
        if (!prodCat) return false;
        if (prodCat !== selectedCategory) {
          const mapped = categoryMap.get(prodCat);
          if (!mapped || (mapped.id !== selectedCategory && mapped.category_id !== selectedCategory)) {
            return false;
          }
        }
      }

      // 3. Stock Low Filter (retail / warehouse)
      const retailQty = Number(prod.retail_quantity) || 0;
      const warehouseQty = Number(prod.warehouse_quantity) || 0;
      const lowRetailThreshold = Number(prod.low_selling_price) || 0; // or low quantity threshold
      const lowWarehouseThreshold = Number(prod.low_warehouse_quantity) || 0;

      const isRetailLow = retailQty <= (lowRetailThreshold > 0 ? lowRetailThreshold : 5);
      const isWarehouseLow = warehouseQty <= (lowWarehouseThreshold > 0 ? lowWarehouseThreshold : 10);

      if (stockFilter === 'retail_low' && !isRetailLow) return false;
      if (stockFilter === 'warehouse_low' && !isWarehouseLow) return false;
      if (stockFilter === 'any_low' && !(isRetailLow || isWarehouseLow)) return false;

      // 4. Status Filter
      if (statusFilter !== 'all' && prod.status !== statusFilter) return false;

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      } else if (sortBy === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [products, searchQuery, selectedCategory, stockFilter, statusFilter, sortBy, sortOrder, categoryMap]);

  // Statistics
  const totalProductsCount = products.length;
  const totalCategoriesCount = categories.length;

  const lowStockCount = useMemo(() => {
    return products.filter((p) => {
      const rQty = Number(p.retail_quantity) || 0;
      const wQty = Number(p.warehouse_quantity) || 0;
      const rLow = Number(p.low_selling_price) || 5;
      const wLow = Number(p.low_warehouse_quantity) || 10;
      return rQty <= rLow || wQty <= wLow;
    }).length;
  }, [products]);

  return (
    <div id="admin-products-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Persistent Desktop Sidebar / Mobile Drawer */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main
          id="admin-products-main"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-7xl mx-auto space-y-6">
            {/* Header Section with Page Title and Add Product CTA */}
            <div id="products-header-section" className="layout-flex-between flex-wrap gap-4">
              <div>
                <h1 id="products-page-title" className="text-page-title font-bold">
                  Products Management
                </h1>
                <p id="products-page-subtitle" className="text-subtitle mt-1">
                  Manage dry fruit inventory, pricing, retail stock, and warehouse quantities
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                <button
                  id="refresh-products-btn"
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="btn-base btn-secondary px-3 py-2 rounded-lg layout-flex-center shadow-xs"
                  title="Refresh products list"
                  aria-label="Refresh products list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  id="add-product-btn"
                  href="/admin/products/addproduct"
                  className="btn-base btn-primary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Add Product</span>
                </Link>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div
                id="products-error-banner"
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

            {/* Summary Stat Cards: Total Products & Total Categories */}
            <div id="products-stats-grid" className="layout-grid-dashboard">
              {/* Stat 1: Total Products */}
              <div id="stat-total-products" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Total Products
                  </span>
                  <div className="p-2 rounded-lg bg-primary-light text-primary">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-total-products-value" className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalProductsCount}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    Catalog items in Supabase inventory
                  </p>
                </div>
              </div>

              {/* Stat 2: Total Categories */}
              <div id="stat-total-categories" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Total Categories
                  </span>
                  <div className="p-2 rounded-lg bg-secondary-light text-secondary">
                    <Tag className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-total-categories-value" className="text-stat-number font-bold text-text-primary">
                    {isLoading ? '...' : totalCategoriesCount}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    Active category classifications
                  </p>
                </div>
              </div>

              {/* Stat 3: Low Stock Alerts */}
              <div id="stat-low-stock-alert" className="card-base card-interactive p-4 sm:p-5">
                <div className="layout-flex-between">
                  <span className="text-label font-medium text-text-secondary">
                    Low Stock Alerts
                  </span>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span id="stat-low-stock-value" className="text-stat-number font-bold text-amber-700">
                    {isLoading ? '...' : lowStockCount}
                  </span>
                  <p className="text-caption text-text-muted mt-1">
                    Items needing restock attention
                  </p>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar Section */}
            <div id="products-filter-section" className="card-base p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Search Input: Product ID, Name, or Barcode */}
                <div className="md:col-span-4 form-group">
                  <label htmlFor="search-product-input" className="form-label">
                    Search Products
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
                    <input
                      id="search-product-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by ID (e.g. prod-101), Name, Barcode..."
                      className="input-base !pl-10 w-full"
                    />
                  </div>
                </div>

                {/* Filter by Category (Search & Select) */}
                <div className="md:col-span-3 form-group">
                  <label htmlFor="filter-category-select" className="form-label">
                    Filter by Category
                  </label>
                  <div className="space-y-1">
                    <select
                      id="filter-category-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="select-base w-full"
                    >
                      <option value="all">All Categories ({categories.length})</option>
                      {filteredCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.category_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter by Retail / Warehouse Low Stock */}
                <div className="md:col-span-3 form-group">
                  <label htmlFor="filter-stock-select" className="form-label">
                    Stock Alert Filter
                  </label>
                  <select
                    id="filter-stock-select"
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="select-base w-full"
                  >
                    <option value="all">All Stock Levels</option>
                    <option value="retail_low">Retail Low Stock</option>
                    <option value="warehouse_low">Warehouse Low Stock</option>
                    <option value="any_low">Any Low Stock (Retail / Warehouse)</option>
                  </select>
                </div>

                {/* Filter by Status */}
                <div className="md:col-span-2 form-group">
                  <label htmlFor="filter-status-select" className="form-label">
                    Status
                  </label>
                  <select
                    id="filter-status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="select-base w-full"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>

              {/* Category Search Helper Input if categories list is large */}
              {categories.length > 5 && (
                <div className="layout-flex-between pt-2 border-t border-subtle flex-wrap gap-2">
                  <div className="layout-flex-start gap-2 text-caption text-text-muted">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Search within categories list:</span>
                    <input
                      id="category-search-helper"
                      type="text"
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      placeholder="Type category name..."
                      className="input-base py-1 px-2 text-xs w-44"
                    />
                    {categorySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCategorySearchQuery('')}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="layout-flex-start gap-2 text-caption text-text-muted">
                    <span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products</span>
                    {(searchQuery || selectedCategory !== 'all' || stockFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        id="reset-all-filters-btn"
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setStockFilter('all');
                          setStatusFilter('all');
                          setCategorySearchQuery('');
                        }}
                        className="btn-base btn-ghost text-xs text-danger font-semibold py-1 px-2"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Products Table Display */}
            <div id="products-table-card" className="card-base overflow-hidden">
              <div className="table-container">
                <table id="products-inventory-table" className="table-base">
                  <thead className="table-header">
                    <tr>
                      <th
                        id="th-product-id"
                        className="table-th cursor-pointer select-none"
                        onClick={() => {
                          if (sortBy === 'created_at') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('created_at'); setSortOrder('desc'); }
                        }}
                      >
                        <div className="layout-flex-start gap-1">
                          <span>Product ID</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                      </th>
                      <th
                        id="th-product-name"
                        className="table-th cursor-pointer select-none"
                        onClick={() => {
                          if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('name'); setSortOrder('asc'); }
                        }}
                      >
                        <div className="layout-flex-start gap-1">
                          <span>Product Name</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                      </th>
                      <th id="th-product-category" className="table-th">
                        Category
                      </th>
                      <th
                        id="th-product-mrp"
                        className="table-th text-right cursor-pointer select-none"
                        onClick={() => {
                          if (sortBy === 'mrp') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('mrp'); setSortOrder('desc'); }
                        }}
                      >
                        <div className="layout-flex-between justify-end gap-1">
                          <span>MRP (₹)</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                      </th>
                      <th id="th-product-selling-price" className="table-th text-right">
                        Selling Price (₹)
                      </th>
                      <th
                        id="th-product-retail-qty"
                        className="table-th text-right cursor-pointer select-none"
                        onClick={() => {
                          if (sortBy === 'retail_quantity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('retail_quantity'); setSortOrder('asc'); }
                        }}
                      >
                        <div className="layout-flex-between justify-end gap-1">
                          <span>Retail Qty</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                      </th>
                      <th
                        id="th-product-warehouse-qty"
                        className="table-th text-right cursor-pointer select-none"
                        onClick={() => {
                          if (sortBy === 'warehouse_quantity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('warehouse_quantity'); setSortOrder('asc'); }
                        }}
                      >
                        <div className="layout-flex-between justify-end gap-1">
                          <span>Warehouse Qty</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                      </th>
                      <th id="th-product-status" className="table-th text-center">
                        Status
                      </th>
                      <th id="th-product-actions" className="table-th text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="table-td text-center py-12">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                            <span className="text-body text-text-secondary font-medium">
                              Loading products from Supabase...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="table-td text-center py-12">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Package className="w-10 h-10 text-text-muted stroke-[1.5]" />
                            <p className="text-card-title font-semibold text-text-primary">
                              No products found
                            </p>
                            <p className="text-small text-text-muted max-w-md">
                              {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all'
                                ? 'No inventory items match your search filters. Try adjusting your search query or reset filters.'
                                : 'No products have been added yet. Click "Add Product" to add your first item.'}
                            </p>
                            {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery('');
                                  setSelectedCategory('all');
                                  setStockFilter('all');
                                }}
                                className="btn-base btn-secondary btn-sm mt-3"
                              >
                                Clear Search Filters
                              </button>
                            ) : (
                              <Link
                                href="/admin/products/addproduct"
                                className="btn-base btn-primary btn-sm mt-3 layout-flex-start gap-2"
                              >
                                <PlusCircle className="w-4 h-4" />
                                <span>Add New Product</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const categoryName = prod.category_id
                          ? categoryMap.get(prod.category_id)?.name || 'Unknown'
                          : 'Unassigned';

                        const retailQty = Number(prod.retail_quantity) || 0;
                        const warehouseQty = Number(prod.warehouse_quantity) || 0;
                        const lowRetailThreshold = Number(prod.low_selling_price) || 5;
                        const lowWarehouseThreshold = Number(prod.low_warehouse_quantity) || 10;

                        const isRetailLow = retailQty <= lowRetailThreshold;
                        const isWarehouseLow = warehouseQty <= lowWarehouseThreshold;

                        return (
                          <tr
                            key={prod.id}
                            id={`product-row-${prod.product_id}`}
                            className="table-row hover:bg-surface-hover transition-colors"
                          >
                            {/* product_id & Barcode */}
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

                            {/* Name */}
                            <td className="table-td font-medium text-text-primary">
                              <Link
                                href={`/admin/products/openproduct?id=${prod.id}`}
                                className="hover:text-primary hover:underline"
                              >
                                {prod.name}
                              </Link>
                            </td>

                            {/* Category */}
                            <td className="table-td">
                              <span className="badge-base badge-secondary text-caption">
                                {categoryName}
                              </span>
                            </td>

                            {/* MRP */}
                            <td className="table-td text-right font-medium text-text-secondary">
                              ₹{(Number(prod.mrp) || 0).toFixed(2)}
                            </td>

                            {/* Selling Price */}
                            <td className="table-td text-right font-bold text-text-primary">
                              ₹{(Number(prod.selling_price) || 0).toFixed(2)}
                            </td>

                            {/* Retail Quantity */}
                            <td className="table-td text-right">
                              <div className="flex flex-col items-end">
                                <span
                                  className={`font-semibold ${
                                    isRetailLow ? 'text-amber-700' : 'text-text-primary'
                                  }`}
                                >
                                  {retailQty.toLocaleString()}
                                </span>
                                {isRetailLow && (
                                  <span className="badge-base badge-warning text-[10px] py-0 px-1 mt-0.5">
                                    Low Stock
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Warehouse Quantity */}
                            <td className="table-td text-right">
                              <div className="flex flex-col items-end">
                                <span
                                  className={`font-semibold ${
                                    isWarehouseLow ? 'text-amber-700' : 'text-text-primary'
                                  }`}
                                >
                                  {warehouseQty.toLocaleString()}
                                </span>
                                {isWarehouseLow && (
                                  <span className="badge-base badge-warning text-[10px] py-0 px-1 mt-0.5">
                                    Low Stock
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="table-td text-center">
                              <span
                                className={`badge-base ${
                                  prod.status === 'active' ? 'badge-success' : 'badge-neutral'
                                }`}
                              >
                                {prod.status}
                              </span>
                            </td>

                            {/* Open button */}
                            <td className="table-td text-right">
                              <Link
                                id={`open-product-btn-${prod.product_id}`}
                                href={`/admin/products/openproduct?id=${prod.id}`}
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

              {/* Table Footer / Summary */}
              {!isLoading && filteredProducts.length > 0 && (
                <div id="products-table-footer" className="table-pagination layout-flex-between">
                  <span className="text-caption text-text-muted">
                    Displaying <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> items
                  </span>
                  <div className="layout-flex-start gap-3">
                    <span className="text-caption text-text-muted">
                      Need updates? Open product to edit details or print barcodes.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
