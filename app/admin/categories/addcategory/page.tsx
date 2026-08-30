'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Tags,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { createCategory } from '@/lib/categoriesStore';
import type { CategoryStatus } from '@/lib/types';

export default function AdminAddCategoryPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Form State for all Category table fields (schemas.sql)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<CategoryStatus>('active');

  // Input refs for keyboard navigation
  const nameRef = useRef<HTMLInputElement | null>(null);
  const categoryIdRef = useRef<HTMLInputElement | null>(null);
  const statusRef = useRef<HTMLSelectElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto-focus category name on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ESC key navigation to return to categories dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/admin/categories/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const validateForm = () => {
    setNameError(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setNameError('Category name is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await createCategory({
      name: name.trim(),
      category_id: categoryId.trim() || undefined,
      status,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
    } else if (data) {
      setSuccessMessage(`Category "${data.name}" (${data.category_id}) created successfully!`);
      setTimeout(() => {
        router.push('/admin/categories/dashboard');
      }, 1000);
    }
  };

  return (
    <div id="admin-add-category-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body: Sidebar + Form Content */}
      <div id="admin-add-category-body" className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Add Category Main Content */}
        <main
          id="admin-add-category-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-3xl flex flex-col gap-6">
            {/* Breadcrumbs Navigation */}
            <div id="add-category-breadcrumbs" className="breadcrumb-nav">
              <Link href="/admin/dashboard" className="breadcrumb-item">
                Admin
              </Link>
              <span>/</span>
              <Link href="/admin/categories/dashboard" className="breadcrumb-item">
                Categories
              </Link>
              <span>/</span>
              <span className="breadcrumb-item-active">Add Category</span>
            </div>

            {/* Header Section */}
            <div id="add-category-header-section" className="layout-flex-between">
              <div>
                <h1 id="add-category-page-title" className="text-page-title flex items-center gap-2">
                  <Tags className="w-6 h-6 text-primary" />
                  Add New Category
                </h1>
                <p id="add-category-page-subtitle" className="text-subtitle mt-1">
                  Create a new product category in the system
                </p>
              </div>

              <Link
                id="back-to-categories-link"
                href="/admin/categories/dashboard"
                className="btn-base btn-secondary btn-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div
                id="add-category-success-banner"
                className="card-base p-4 border-l-4 border-success bg-success-bg flex items-center gap-3 animate-fade-in"
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <p className="text-body font-medium text-success text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                id="add-category-error-banner"
                className="card-base p-4 border-l-4 border-danger bg-danger-bg flex items-start gap-3 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-label font-semibold text-danger">Failed to Create Category</h4>
                  <p className="text-body text-danger text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Category Form Card */}
            <div id="add-category-form-card" className="card-base">
              <div className="card-header">
                <h2 id="category-details-title" className="text-card-title">
                  Category Details
                </h2>
                <span className="text-caption text-secondary">Table: categories (schemas.sql)</span>
              </div>

              <form id="add-category-form" onSubmit={handleSubmit} className="card-body flex flex-col gap-5">
                {/* Field 1: Category Name */}
                <div className="form-group">
                  <label htmlFor="category-name-input" className="form-label">
                    Category Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="category-name-input"
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        categoryIdRef.current?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        categoryIdRef.current?.focus();
                      }
                    }}
                    placeholder="e.g. Almonds, Cashews, Walnuts, Berries, Spices"
                    className={`input-base ${nameError ? 'input-error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {nameError && (
                    <span id="category-name-error" className="form-error">
                      {nameError}
                    </span>
                  )}
                  <span className="form-hint">
                    Descriptive display name of the category shown across billing and inventory.
                  </span>
                </div>

                {/* Field 2: Category ID (Business Identifier) */}
                <div className="form-group">
                  <label htmlFor="category-id-input" className="form-label">
                    Category ID (Optional)
                  </label>
                  <input
                    id="category-id-input"
                    ref={categoryIdRef}
                    type="text"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        nameRef.current?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        statusRef.current?.focus();
                      }
                    }}
                    placeholder="e.g. cat-101 (leave empty for auto-generation)"
                    className="input-base font-mono"
                    disabled={isSubmitting}
                  />
                  <span className="form-hint">
                    Unique human-readable identifier. Leave blank to automatically generate via database sequence (e.g. cat-101).
                  </span>
                </div>

                {/* Field 3: Status (ENUM: 'active' | 'inactive') */}
                <div className="form-group">
                  <label htmlFor="category-status-select" className="form-label">
                    Status <span className="text-danger">*</span>
                  </label>
                  <select
                    id="category-status-select"
                    ref={statusRef}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CategoryStatus)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        categoryIdRef.current?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        submitBtnRef.current?.focus();
                      }
                    }}
                    className="select-base"
                    disabled={isSubmitting}
                  >
                    <option value="active">Active - Available for products and billing</option>
                    <option value="inactive">Inactive - Hidden from new product entries</option>
                  </select>
                  <span className="form-hint">
                    Controls whether products under this category are active in inventory operations.
                  </span>
                </div>

                {/* Form Action Buttons */}
                <div id="add-category-actions" className="layout-flex-between pt-4 border-t border-subtle mt-2">
                  <Link
                    id="cancel-add-category-btn"
                    href="/admin/categories/dashboard"
                    className="btn-base btn-ghost btn-md"
                  >
                    Cancel
                  </Link>

                  <button
                    id="save-category-submit-btn"
                    ref={submitBtnRef}
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-base btn-primary btn-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving Category...' : 'Save Category'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
