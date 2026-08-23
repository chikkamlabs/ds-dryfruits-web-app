'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Camera,
  Save,
  Trash2,
  Printer,
  Boxes,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Tag,
  Key,
  Calendar,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import BarcodeVisual from '@/components/BarcodeVisual';
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from '@/lib/productsStore';
import { getCategories } from '@/lib/categoriesStore';
import type { Product, Category, ProductStatus } from '@/lib/types';

function OpenProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get('id') || '';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printCopies, setPrintCopies] = useState<number>(1);

  // Editable Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [mrp, setMrp] = useState<string>('0');
  const [sellingPrice, setSellingPrice] = useState<string>('0');
  const [retailQuantity, setRetailQuantity] = useState<string>('0');
  const [warehouseQuantity, setWarehouseQuantity] = useState<string>('0');
  const [lowSellingPrice, setLowSellingPrice] = useState<string>('0');
  const [lowWarehouseQuantity, setLowWarehouseQuantity] = useState<string>('0');
  const [status, setStatus] = useState<ProductStatus>('active');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch product and categories
  const loadProductData = async () => {
    if (!productIdParam) {
      setErrorMessage('No product ID was provided in the URL.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const [prodRes, catRes] = await Promise.all([
      getProductById(productIdParam),
      getCategories(),
    ]);

    if (catRes.data) {
      setCategories(catRes.data);
    }

    if (prodRes.error || !prodRes.data) {
      setErrorMessage(prodRes.error || 'Product not found.');
    } else {
      const p = prodRes.data;
      setProduct(p);
      setName(p.name || '');
      setBarcode(p.barcode || '');
      setCategoryId(p.category_id || '');
      setMrp(String(p.mrp ?? 0));
      setSellingPrice(String(p.selling_price ?? 0));
      setRetailQuantity(String(p.retail_quantity ?? 0));
      setWarehouseQuantity(String(p.warehouse_quantity ?? 0));
      setLowSellingPrice(String(p.low_selling_price ?? 0));
      setLowWarehouseQuantity(String(p.low_warehouse_quantity ?? 0));
      setStatus(p.status || 'active');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProductInitial = async () => {
      if (!productIdParam) {
        setErrorMessage('No product ID was provided in the URL.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const [prodRes, catRes] = await Promise.all([
        getProductById(productIdParam),
        getCategories(),
      ]);

      if (!isMounted) return;

      if (catRes.data) {
        setCategories(catRes.data);
      }

      if (prodRes.error || !prodRes.data) {
        setErrorMessage(prodRes.error || 'Product not found.');
      } else {
        const p = prodRes.data;
        setProduct(p);
        setName(p.name || '');
        setBarcode(p.barcode || '');
        setCategoryId(p.category_id || '');
        setMrp(String(p.mrp ?? 0));
        setSellingPrice(String(p.selling_price ?? 0));
        setRetailQuantity(String(p.retail_quantity ?? 0));
        setWarehouseQuantity(String(p.warehouse_quantity ?? 0));
        setLowSellingPrice(String(p.low_selling_price ?? 0));
        setLowWarehouseQuantity(String(p.low_warehouse_quantity ?? 0));
        setStatus(p.status || 'active');
      }

      setIsLoading(false);
    };

    fetchProductInitial();

    return () => {
      isMounted = false;
    };
  }, [productIdParam]);

  const handleBarcodeScanned = (scannedCode: string) => {
    setBarcode(scannedCode.trim());
  };

  // Update Product
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    const mrpNum = parseFloat(mrp);
    const sellingPriceNum = parseFloat(sellingPrice);

    if (isNaN(mrpNum) || mrpNum < 0) {
      setErrorMessage('Please enter a valid MRP value.');
      return;
    }

    if (isNaN(sellingPriceNum) || sellingPriceNum < 0) {
      setErrorMessage('Please enter a valid Selling Price.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateProduct(product.id, {
        name: name.trim(),
        barcode: barcode.trim() || null,
        category_id: categoryId || null,
        mrp: mrpNum,
        selling_price: sellingPriceNum,
        retail_quantity: parseFloat(retailQuantity) || 0,
        warehouse_quantity: parseFloat(warehouseQuantity) || 0,
        low_selling_price: parseFloat(lowSellingPrice) || 0,
        low_warehouse_quantity: parseFloat(lowWarehouseQuantity) || 0,
        status: status,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        setProduct(res.data);
        setSuccessMessage('Product details updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update product.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Product
  const handleDelete = async () => {
    if (!product) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteProduct(product.id);
      if (res.error) {
        setErrorMessage(res.error);
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      } else {
        router.push('/admin/products/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product.';
      setErrorMessage(msg);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div id="open-product-page-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Admin Top Navigation */}
      <AdminHeader
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main
          id="open-product-main"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-5xl mx-auto space-y-6">
            {/* Header with Navigation & Action Controls */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <Link
                  id="back-to-products-list-btn"
                  href="/admin/products/dashboard"
                  className="layout-flex-start gap-1 text-small font-semibold text-primary hover:underline mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Products</span>
                </Link>
                <div className="layout-flex-start gap-3 flex-wrap">
                  <h1 id="open-product-title" className="text-page-title font-bold">
                    {product ? product.name : 'Product Details'}
                  </h1>
                  {product && (
                    <span className="badge-base badge-primary font-mono text-small">
                      {product.product_id}
                    </span>
                  )}
                  {product && (
                    <span
                      className={`badge-base ${
                        product.status === 'active' ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      {product.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Print Barcode & Delete */}
              {product && (
                <div className="layout-flex-start gap-3 flex-wrap">
                  <button
                    id="open-print-barcode-modal-btn"
                    type="button"
                    onClick={() => {
                      setPrintCopies(1);
                      setIsPrintModalOpen(true);
                    }}
                    className="btn-base btn-secondary layout-flex-start gap-2"
                  >
                    <Printer className="w-4 h-4 text-primary" />
                    <span>Print Barcode</span>
                  </button>

                  <button
                    id="delete-product-btn"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-base btn-danger layout-flex-start gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div
                id="open-product-error-banner"
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

            {successMessage && (
              <div
                id="open-product-success-banner"
                className="p-4 rounded-lg bg-success-bg border border-success-border text-success-text layout-flex-between"
              >
                <div className="layout-flex-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span className="text-small font-medium">{successMessage}</span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="card-base p-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-body font-medium text-text-secondary">
                  Loading product details...
                </span>
              </div>
            ) : !product ? (
              <div className="card-base p-12 text-center space-y-4">
                <Boxes className="w-12 h-12 text-text-muted mx-auto" />
                <h3 className="text-section-title font-semibold">Product Not Found</h3>
                <p className="text-small text-text-muted max-w-md mx-auto">
                  The product you requested could not be located in the Supabase database.
                </p>
                <Link href="/admin/products/dashboard" className="btn-base btn-primary inline-flex">
                  Return to Products Dashboard
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Main Edit Form */}
                <div className="lg:col-span-2 space-y-6">
                  <form
                    id="edit-product-form"
                    onSubmit={handleSave}
                    className="card-base p-6 space-y-6"
                  >
                    <div className="border-b border-subtle pb-4 layout-flex-between">
                      <div>
                        <h2 className="text-section-title font-semibold layout-flex-start gap-2">
                          <Boxes className="w-5 h-5 text-primary" />
                          <span>Edit Product Information</span>
                        </h2>
                        <p className="text-caption text-text-muted mt-1">
                          Update catalog details, pricing, inventory stock, and barcodes.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Product Name */}
                      <div className="md:col-span-2 form-group">
                        <label htmlFor="edit-product-name" className="form-label">
                          Product Name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="edit-product-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input-base w-full font-medium"
                        />
                      </div>

                      {/* Category Selection */}
                      <div className="form-group">
                        <label htmlFor="edit-product-category" className="form-label layout-flex-start gap-1">
                          <Tag className="w-4 h-4 text-text-muted" />
                          <span>Category</span>
                        </label>
                        <select
                          id="edit-product-category"
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="select-base w-full"
                        >
                          <option value="">-- No Category --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} ({cat.category_id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div className="form-group">
                        <label htmlFor="edit-product-status" className="form-label">
                          Product Status
                        </label>
                        <select
                          id="edit-product-status"
                          value={status}
                          onChange={(e) => setStatus(e.target.value as ProductStatus)}
                          className="select-base w-full"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      {/* Barcode & Camera Scanner Button */}
                      <div className="md:col-span-2 form-group">
                        <label htmlFor="edit-product-barcode" className="form-label layout-flex-between">
                          <span>Barcode (Scan with Camera or Edit Manually)</span>
                          <span className="text-caption text-text-muted">Unique Identifier</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="edit-product-barcode"
                            type="text"
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            placeholder="Enter barcode or scan..."
                            className="input-base font-mono flex-1"
                          />
                          <button
                            id="edit-scan-barcode-btn"
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="btn-base btn-secondary layout-flex-start gap-2 shrink-0"
                            title="Scan Barcode with Camera"
                          >
                            <Camera className="w-5 h-5 text-primary" />
                            <span>Scan</span>
                          </button>
                        </div>
                      </div>

                      {/* Pricing Section Divider */}
                      <div className="md:col-span-2 pt-2 border-t border-subtle">
                        <h3 className="text-card-title font-semibold text-text-primary">
                          Pricing & Retail Value
                        </h3>
                      </div>

                      {/* MRP */}
                      <div className="form-group">
                        <label htmlFor="edit-product-mrp" className="form-label">
                          MRP (₹) <span className="text-danger">*</span>
                        </label>
                        <input
                          id="edit-product-mrp"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={mrp}
                          onChange={(e) => setMrp(e.target.value)}
                          className="input-base w-full"
                        />
                      </div>

                      {/* Selling Price */}
                      <div className="form-group">
                        <label htmlFor="edit-product-selling-price" className="form-label">
                          Selling Price (₹) <span className="text-danger">*</span>
                        </label>
                        <input
                          id="edit-product-selling-price"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value)}
                          className="input-base w-full font-bold text-primary"
                        />
                      </div>

                      {/* Stock Quantities Section Divider */}
                      <div className="md:col-span-2 pt-2 border-t border-subtle">
                        <h3 className="text-card-title font-semibold text-text-primary">
                          Inventory Quantities
                        </h3>
                      </div>

                      {/* Retail Quantity */}
                      <div className="form-group">
                        <label htmlFor="edit-product-retail-qty" className="form-label">
                          Retail Quantity (Units / Kg)
                        </label>
                        <input
                          id="edit-product-retail-qty"
                          type="number"
                          step="0.001"
                          min="0"
                          value={retailQuantity}
                          onChange={(e) => setRetailQuantity(e.target.value)}
                          className="input-base w-full"
                        />
                      </div>

                      {/* Warehouse Quantity */}
                      <div className="form-group">
                        <label htmlFor="edit-product-warehouse-qty" className="form-label">
                          Warehouse Quantity (Units / Kg)
                        </label>
                        <input
                          id="edit-product-warehouse-qty"
                          type="number"
                          step="0.001"
                          min="0"
                          value={warehouseQuantity}
                          onChange={(e) => setWarehouseQuantity(e.target.value)}
                          className="input-base w-full"
                        />
                      </div>

                      {/* Low Stock Alerts */}
                      <div className="form-group">
                        <label htmlFor="edit-product-low-retail" className="form-label">
                          Retail Low Stock Threshold
                        </label>
                        <input
                          id="edit-product-low-retail"
                          type="number"
                          step="0.01"
                          min="0"
                          value={lowSellingPrice}
                          onChange={(e) => setLowSellingPrice(e.target.value)}
                          className="input-base w-full"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="edit-product-low-warehouse" className="form-label">
                          Warehouse Low Stock Threshold
                        </label>
                        <input
                          id="edit-product-low-warehouse"
                          type="number"
                          step="0.001"
                          min="0"
                          value={lowWarehouseQuantity}
                          onChange={(e) => setLowWarehouseQuantity(e.target.value)}
                          className="input-base w-full"
                        />
                      </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="pt-4 border-t border-subtle layout-flex-between">
                      <Link
                        id="cancel-edit-btn"
                        href="/admin/products/dashboard"
                        className="btn-base btn-secondary"
                      >
                        Cancel
                      </Link>

                      <button
                        id="save-changes-submit-btn"
                        type="submit"
                        disabled={isSaving}
                        className="btn-base btn-primary layout-flex-start gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right 1 Col: Barcode Preview & System Metadata */}
                <div className="space-y-6">
                  {/* Barcode Display Card */}
                  <div id="product-barcode-card" className="card-base p-6 text-center space-y-4">
                    <h3 className="text-section-title font-semibold text-text-primary">
                      Product Barcode
                    </h3>
                    <p className="text-caption text-text-muted">
                      Barcode sticker representation for POS retail scanners
                    </p>

                    <div className="p-4 bg-white rounded-lg border border-subtle shadow-xs flex flex-col items-center justify-center min-h-[120px]">
                      <BarcodeVisual
                        value={barcode || product.barcode || product.product_id}
                        height={60}
                      />
                    </div>

                    <button
                      id="print-barcode-card-btn"
                      type="button"
                      onClick={() => {
                        setPrintCopies(1);
                        setIsPrintModalOpen(true);
                      }}
                      className="btn-base btn-secondary w-full layout-flex-center gap-2"
                    >
                      <Printer className="w-4 h-4 text-primary" />
                      <span>Print Barcode Label</span>
                    </button>
                  </div>

                  {/* System Metadata Card */}
                  <div id="product-metadata-card" className="card-base p-6 space-y-4">
                    <h3 className="text-section-title font-semibold text-text-primary">
                      System Reference
                    </h3>

                    <div className="space-y-3 text-small">
                      <div className="layout-flex-between border-b border-subtle pb-2">
                        <span className="text-text-muted layout-flex-start gap-1.5">
                          <Key className="w-3.5 h-3.5" />
                          <span>Product Code</span>
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {product.product_id}
                        </span>
                      </div>

                      <div className="layout-flex-between border-b border-subtle pb-2">
                        <span className="text-text-muted">UUID</span>
                        <span className="font-mono text-caption text-text-muted truncate max-w-[140px]" title={product.id}>
                          {product.id}
                        </span>
                      </div>

                      <div className="layout-flex-between border-b border-subtle pb-2">
                        <span className="text-text-muted layout-flex-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Created At</span>
                        </span>
                        <span className="text-text-secondary">
                          {new Date(product.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="layout-flex-between">
                        <span className="text-text-muted layout-flex-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Last Updated</span>
                        </span>
                        <span className="text-text-secondary">
                          {new Date(product.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Print Barcode Dialog: asks how many copies want and Done (without action) */}
      {isPrintModalOpen && product && (
        <div id="print-barcode-dialog" className="modal-backdrop z-50">
          <div id="print-barcode-dialog-panel" className="modal-container max-w-md w-full">
            <div className="modal-header layout-flex-between">
              <div className="layout-flex-start gap-2">
                <Printer className="w-5 h-5 text-primary" />
                <h3 className="text-card-title font-bold">Print Barcode Labels</h3>
              </div>
              <button
                id="close-print-dialog-btn"
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="btn-base btn-ghost btn-icon-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body p-6 space-y-6">
              {/* Product Barcode Preview */}
              <div className="p-4 bg-white rounded-lg border border-subtle shadow-xs flex flex-col items-center justify-center text-center">
                <span className="text-small font-bold text-text-primary mb-2">
                  {product.name}
                </span>
                <span className="text-caption font-semibold text-primary mb-2">
                  MRP: ₹{(Number(product.mrp) || 0).toFixed(2)} | SP: ₹{(Number(product.selling_price) || 0).toFixed(2)}
                </span>
                <BarcodeVisual
                  value={barcode || product.barcode || product.product_id}
                  height={55}
                />
              </div>

              {/* Ask How Many Copies Want */}
              <div className="form-group">
                <label htmlFor="print-copies-input" className="form-label">
                  How many barcode labels do you want to print?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPrintCopies((prev) => Math.max(1, prev - 1))}
                    className="btn-base btn-secondary btn-icon-sm"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="print-copies-input"
                    type="number"
                    min="1"
                    max="1000"
                    value={printCopies}
                    onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input-base text-center font-bold w-24 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setPrintCopies((prev) => prev + 1)}
                    className="btn-base btn-secondary btn-icon-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-small text-text-muted">copies</span>
                </div>
              </div>
            </div>

            {/* Modal Footer with Done Button (Don't do any action) */}
            <div className="modal-footer layout-flex-between">
              <button
                id="cancel-print-copies-btn"
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button
                id="done-print-barcode-btn"
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="btn-base btn-primary layout-flex-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && product && (
        <div id="delete-product-modal" className="modal-backdrop z-50">
          <div id="delete-product-dialog" className="modal-container max-w-md w-full">
            <div className="modal-header layout-flex-between">
              <div className="layout-flex-start gap-2 text-danger">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-card-title font-bold text-danger">Delete Product</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-base btn-ghost btn-icon-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body p-6 space-y-3">
              <p className="text-body font-semibold">
                Are you sure you want to permanently delete this product?
              </p>
              <p className="text-small text-text-muted">
                Product: <strong className="text-text-primary">{product.name}</strong> ({product.product_id})
              </p>
              <p className="text-caption text-danger">
                Warning: If this product is referenced in existing billing invoices or purchase orders, database foreign key constraints may restrict deletion.
              </p>
            </div>

            <div className="modal-footer layout-flex-between">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-product-btn"
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="btn-base btn-danger"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OpenProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-app flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <OpenProductContent />
    </Suspense>
  );
}
