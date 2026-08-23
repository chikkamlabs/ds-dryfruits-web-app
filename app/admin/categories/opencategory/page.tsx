'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Tags,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Key,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/categoriesStore';
import type { Category, CategoryStatus } from '@/lib/types';

function OpenCategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParamId = searchParams.get('id');

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable form fields from Category table
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<CategoryStatus>('active');

  // Messages & Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCategory() {
      if (!categoryParamId) {
        if (!isMounted) return;
        setIsLoading(false);
        setErrorMessage('No category ID specified in request.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await getCategoryById(categoryParamId);

      if (!isMounted) return;

      if (error) {
        setErrorMessage(error);
      } else if (data) {
        setCategory(data);
        setName(data.name || '');
        setCategoryId(data.category_id || '');
        setStatus(data.status || 'active');
      } else {
        setErrorMessage('Category not found.');
      }
      setIsLoading(false);
    }

    loadCategory();

    return () => {
      isMounted = false;
    };
  }, [categoryParamId]);

  const validateForm = () => {
    setNameError(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setNameError('Category name is required.');
      return false;
    }
    return true;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await updateCategory(category.id, {
      name: name.trim(),
      category_id: categoryId.trim(),
      status,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
    } else if (data) {
      setCategory(data);
      setSuccessMessage(`Category "${data.name}" updated successfully!`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
  };

  const handleDelete = async () => {
    if (!category) return;

    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await deleteCategory(category.id);
    setIsDeleting(false);

    if (error) {
      setErrorMessage(`Cannot delete category: ${error}`);
      setShowDeleteConfirm(false);
    } else {
      router.push('/admin/categories/dashboard');
    }
  };

  return (
    <div id="admin-open-category-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Admin Header */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Body: Sidebar + Edit Content */}
      <div id="admin-open-category-body" className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Edit Category Main Content */}
        <main
          id="admin-open-category-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-3xl flex flex-col gap-6">
            {/* Breadcrumbs Navigation */}
            <div id="open-category-breadcrumbs" className="breadcrumb-nav">
              <Link href="/admin/dashboard" className="breadcrumb-item">
                Admin
              </Link>
              <span>/</span>
              <Link href="/admin/categories/dashboard" className="breadcrumb-item">
                Categories
              </Link>
              <span>/</span>
              <span className="breadcrumb-item-active">
                {category ? category.name : 'Edit Category'}
              </span>
            </div>

            {/* Header Section */}
            <div id="open-category-header-section" className="layout-flex-between flex-wrap gap-4">
              <div>
                <h1 id="open-category-page-title" className="text-page-title flex items-center gap-2">
                  <Tags className="w-6 h-6 text-primary" />
                  {category ? `Edit Category: ${category.name}` : 'Edit Category'}
                </h1>
                <p id="open-category-page-subtitle" className="text-subtitle mt-1">
                  Modify category properties, identifier, and active availability
                </p>
              </div>

              <div className="layout-flex-start gap-3">
                <Link
                  id="back-to-categories-btn"
                  href="/admin/categories/dashboard"
                  className="btn-base btn-secondary btn-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to List</span>
                </Link>
                {category && (
                  <button
                    id="open-delete-category-dialog-btn"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-base btn-danger btn-md"
                    title="Delete this category"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div
                id="open-category-success-banner"
                className="card-base p-4 border-l-4 border-success bg-success-bg flex items-center gap-3 animate-fade-in"
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <p className="text-body font-medium text-success text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                id="open-category-error-banner"
                className="card-base p-4 border-l-4 border-danger bg-danger-bg flex items-start gap-3 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-label font-semibold text-danger">Action Error</h4>
                  <p className="text-body text-danger text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading ? (
              <div className="card-base p-6 flex flex-col gap-4">
                <div className="h-6 w-48 animate-skeleton rounded" />
                <div className="h-10 w-full animate-skeleton rounded" />
                <div className="h-10 w-full animate-skeleton rounded" />
                <div className="h-10 w-full animate-skeleton rounded" />
              </div>
            ) : !category ? (
              <div className="card-base p-8 text-center">
                <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
                <h3 className="text-section-title font-semibold mb-2">Category Not Found</h3>
                <p className="text-subtitle text-sm mb-4">
                  The requested category could not be retrieved from the database.
                </p>
                <Link
                  href="/admin/categories/dashboard"
                  className="btn-base btn-primary btn-md inline-flex"
                >
                  Return to Categories Dashboard
                </Link>
              </div>
            ) : (
              <>
                {/* Category Edit Form */}
                <div id="edit-category-form-card" className="card-base">
                  <div className="card-header">
                    <h2 id="edit-category-title" className="text-card-title">
                      Category Information
                    </h2>
                    <span className="badge-base badge-secondary font-mono">
                      {category.category_id}
                    </span>
                  </div>

                  <form id="edit-category-form" onSubmit={handleUpdate} className="card-body flex flex-col gap-5">
                    {/* Field 1: Category Name */}
                    <div className="form-group">
                      <label htmlFor="edit-category-name-input" className="form-label">
                        Category Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="edit-category-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError(null);
                        }}
                        className={`input-base ${nameError ? 'input-error' : ''}`}
                        disabled={isSubmitting}
                      />
                      {nameError && (
                        <span id="edit-category-name-error" className="form-error">
                          {nameError}
                        </span>
                      )}
                      <span className="form-hint">
                        Name of the dry fruits or goods category displayed in POS bills and inventory lists.
                      </span>
                    </div>

                    {/* Field 2: Category ID */}
                    <div className="form-group">
                      <label htmlFor="edit-category-id-input" className="form-label">
                        Category ID (Business Code)
                      </label>
                      <input
                        id="edit-category-id-input"
                        type="text"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="input-base font-mono"
                        disabled={isSubmitting}
                      />
                      <span className="form-hint">
                        Unique human-readable identifier (e.g. cat-101, cat-102).
                      </span>
                    </div>

                    {/* Field 3: Status */}
                    <div className="form-group">
                      <label htmlFor="edit-category-status-select" className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        id="edit-category-status-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CategoryStatus)}
                        className="select-base"
                        disabled={isSubmitting}
                      >
                        <option value="active">Active - Available for products and billing</option>
                        <option value="inactive">Inactive - Hidden from new product entries</option>
                      </select>
                      <span className="form-hint">
                        Set to inactive if this category is discontinued or temporarily disabled.
                      </span>
                    </div>

                    {/* Read-Only Database Metadata */}
                    <div id="category-metadata-section" className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-surface-subtle border border-border-subtle mt-2">
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <Key className="w-4 h-4 text-muted flex-shrink-0" />
                        <span className="font-mono text-caption truncate" title={category.id}>
                          UUID: {category.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
                        <span>
                          Created:{' '}
                          {category.created_at
                            ? new Date(category.created_at).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                      {category.updated_at && (
                        <div className="flex items-center gap-2 text-xs text-secondary sm:col-span-2">
                          <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
                          <span>
                            Last Updated:{' '}
                            {new Date(category.updated_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Form Action Buttons */}
                    <div id="edit-category-actions" className="layout-flex-between pt-4 border-t border-subtle mt-2">
                      <Link
                        id="cancel-edit-category-btn"
                        href="/admin/categories/dashboard"
                        className="btn-base btn-ghost btn-md"
                      >
                        Cancel
                      </Link>

                      <button
                        id="save-changes-category-btn"
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-base btn-primary btn-md"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && category && (
        <div id="delete-confirm-modal" className="modal-backdrop animate-fade-in">
          <div className="modal-container animate-scale-in">
            <div className="modal-header">
              <h3 className="text-section-title font-semibold text-danger flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Confirm Category Deletion
              </h3>
            </div>
            <div className="modal-body">
              <p className="text-body mb-2">
                Are you sure you want to delete category <strong>&quot;{category.name}&quot;</strong> (
                {category.category_id})?
              </p>
              <p className="text-small text-danger bg-danger-bg p-3 rounded border border-danger-border">
                Warning: If products are currently assigned to this category, database foreign key
                constraints may restrict its deletion.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-base btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-category-btn"
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-base btn-danger btn-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOpenCategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="layout-page-container layout-flex-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-body font-medium">Loading category...</p>
          </div>
        </div>
      }
    >
      <OpenCategoryContent />
    </Suspense>
  );
}
