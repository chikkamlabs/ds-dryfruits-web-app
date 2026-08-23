'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Tags,
  Plus,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { getCategories } from '@/lib/categoriesStore';
import type { Category } from '@/lib/types';

export default function AdminCategoriesDashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await getCategories();
    if (error) {
      setErrorMessage(error);
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await getCategories();
      if (!isMounted) return;
      if (error) {
        setErrorMessage(error);
      } else {
        setCategories(data || []);
      }
      setIsLoading(false);
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter categories by search query (category name & category_id) and status
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      const matchesSearch =
        query === '' ||
        (cat.name && cat.name.toLowerCase().includes(query)) ||
        (cat.category_id && cat.category_id.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'all' || cat.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.status === 'active').length;
  const inactiveCount = categories.filter((c) => c.status === 'inactive').length;

  return (
    <div id="admin-categories-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body: Sidebar + Main Content */}
      <div id="admin-categories-body" className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Categories Main Content */}
        <main
          id="admin-categories-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container flex flex-col gap-6">
            {/* Breadcrumb & Navigation */}
            <div id="categories-breadcrumbs" className="breadcrumb-nav">
              <Link href="/admin/dashboard" className="breadcrumb-item">
                Admin
              </Link>
              <span>/</span>
              <span className="breadcrumb-item-active">Categories</span>
            </div>

            {/* Page Header with Add Category CTA */}
            <div id="categories-header-section" className="layout-flex-between flex-wrap gap-4">
              <div>
                <h1 id="categories-page-title" className="text-page-title flex items-center gap-2">
                  <Tags className="w-6 h-6 text-primary" />
                  Category Management
                </h1>
                <p id="categories-page-subtitle" className="text-subtitle mt-1">
                  Manage product categories and inventory classifications
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                <button
                  id="categories-refresh-btn"
                  type="button"
                  onClick={loadCategories}
                  disabled={isLoading}
                  className="btn-base btn-secondary btn-md"
                  title="Refresh categories"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <Link
                  id="add-category-cta-btn"
                  href="/admin/categories/addcategory"
                  className="btn-base btn-primary btn-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </Link>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="categories-error-banner"
                className="card-base p-4 border-l-4 border-danger bg-danger-bg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-label font-semibold text-danger">Database Notice</h4>
                  <p className="text-body text-danger text-sm mt-0.5">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={loadCategories}
                  className="btn-base btn-secondary btn-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Metric Summary Cards */}
            <div id="categories-metrics-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Categories */}
              <div id="metric-total-categories" className="card-base p-5">
                <div className="layout-flex-between mb-2">
                  <span className="text-label">Total Categories</span>
                  <div className="p-2 rounded-md bg-surface-subtle text-primary">
                    <Tags className="w-5 h-5" />
                  </div>
                </div>
                <div id="total-categories-count" className="text-stat-number">
                  {isLoading ? '...' : totalCount}
                </div>
                <span className="text-caption text-secondary mt-1">All registered categories</span>
              </div>

              {/* Active Categories */}
              <div id="metric-active-categories" className="card-base p-5">
                <div className="layout-flex-between mb-2">
                  <span className="text-label">Active</span>
                  <div className="p-2 rounded-md bg-success-bg text-success">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div id="active-categories-count" className="text-stat-number text-success">
                  {isLoading ? '...' : activeCount}
                </div>
                <span className="text-caption text-secondary mt-1">Available for products</span>
              </div>

              {/* Inactive Categories */}
              <div id="metric-inactive-categories" className="card-base p-5">
                <div className="layout-flex-between mb-2">
                  <span className="text-label">Inactive</span>
                  <div className="p-2 rounded-md bg-surface-subtle text-muted">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <div id="inactive-categories-count" className="text-stat-number text-muted">
                  {isLoading ? '...' : inactiveCount}
                </div>
                <span className="text-caption text-secondary mt-1">Archived or disabled</span>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div id="categories-search-card" className="card-base p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search Bar (Name and Category ID) */}
                <div className="relative w-full sm:w-80 md:w-96">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    id="search-category-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search category name or ID (e.g. cat-101)..."
                    className="input-base pl-9 pr-3"
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

                {/* Status Filter */}
                <div className="layout-flex-start w-full sm:w-auto gap-2">
                  <span className="text-label hidden sm:inline">Status:</span>
                  <select
                    id="status-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="select-base w-full sm:w-36"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Categories Table View */}
            <div id="categories-table-wrapper" className="table-container">
              <table id="categories-table" className="table-base">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Category ID</th>
                    <th className="table-th">Category Name</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Created Date</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // Skeleton rows during loading
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="table-row">
                        <td className="table-td">
                          <div className="h-4 w-20 animate-skeleton rounded" />
                        </td>
                        <td className="table-td">
                          <div className="h-4 w-36 animate-skeleton rounded" />
                        </td>
                        <td className="table-td">
                          <div className="h-4 w-16 animate-skeleton rounded" />
                        </td>
                        <td className="table-td">
                          <div className="h-4 w-24 animate-skeleton rounded" />
                        </td>
                        <td className="table-td text-right">
                          <div className="h-7 w-16 animate-skeleton rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <div className="layout-flex-center flex-col gap-2">
                          <FolderOpen className="w-10 h-10 text-muted stroke-1" />
                          <p id="empty-categories-title" className="text-card-title text-secondary font-medium">
                            {searchQuery || statusFilter !== 'all'
                              ? 'No matching categories found'
                              : 'No categories recorded yet'}
                          </p>
                          <p className="text-subtitle text-xs max-w-sm">
                            {searchQuery || statusFilter !== 'all'
                              ? 'Try adjusting your search query or filters to locate the category.'
                              : 'Add your first dry fruit or product category to get started.'}
                          </p>
                          {searchQuery || statusFilter !== 'all' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                              }}
                              className="btn-base btn-secondary btn-sm mt-2"
                            >
                              Clear Filters
                            </button>
                          ) : (
                            <Link
                              href="/admin/categories/addcategory"
                              className="btn-base btn-primary btn-sm mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Category</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => (
                      <tr
                        key={category.id}
                        id={`category-row-${category.category_id || category.id}`}
                        className="table-row"
                      >
                        <td className="table-td font-mono font-medium text-primary">
                          <span className="badge-base badge-secondary font-mono">
                            {category.category_id || '—'}
                          </span>
                        </td>
                        <td className="table-td font-medium text-primary">
                          {category.name}
                        </td>
                        <td className="table-td">
                          <span
                            className={`badge-base ${
                              category.status === 'active'
                                ? 'badge-success'
                                : 'badge-neutral'
                            }`}
                          >
                            <span
                              className={`status-dot ${
                                category.status === 'active'
                                  ? 'status-dot-success'
                                  : 'status-dot-neutral'
                              }`}
                            />
                            <span className="capitalize">{category.status}</span>
                          </span>
                        </td>
                        <td className="table-td text-secondary text-xs">
                          {category.created_at
                            ? new Date(category.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="table-td text-right">
                          <Link
                            id={`open-category-btn-${category.category_id || category.id}`}
                            href={`/admin/categories/opencategory?id=${category.id}`}
                            className="btn-base btn-outline btn-sm inline-flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Table Footer with Record Count */}
              {!isLoading && filteredCategories.length > 0 && (
                <div id="categories-table-footer" className="table-pagination">
                  <span className="text-small text-secondary">
                    Showing <strong className="text-primary">{filteredCategories.length}</strong> of{' '}
                    <strong className="text-primary">{categories.length}</strong> categories
                  </span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
