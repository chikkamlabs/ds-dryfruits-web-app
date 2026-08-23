'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Camera,
  Save,
  AlertCircle,
  CheckCircle2,
  Boxes,
  HelpCircle,
  Tag,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { createProduct } from '@/lib/productsStore';
import { getCategories } from '@/lib/categoriesStore';
import type { Category, ProductStatus } from '@/lib/types';

export default function AddProductPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form Fields corresponding to Supabase products table:
  // - name (TEXT, NOT NULL)
  // - barcode (TEXT, UNIQUE, nullable)
  // - category_id (UUID, references categories)
  // - mrp (NUMERIC, NOT NULL, DEFAULT 0.00)
  // - selling_price (NUMERIC, NOT NULL, DEFAULT 0.00)
  // - retail_quantity (NUMERIC, NOT NULL, DEFAULT 0.000)
  // - warehouse_quantity (NUMERIC, NOT NULL, DEFAULT 0.000)
  // - low_selling_price (NUMERIC, DEFAULT 0.00) (Retail Low Alert threshold)
  // - low_warehouse_quantity (NUMERIC, DEFAULT 0.000) (Warehouse Low Alert threshold)
  // - status (public.product_status, DEFAULT 'active')
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [mrp, setMrp] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [retailQuantity, setRetailQuantity] = useState<string>('0');
  const [warehouseQuantity, setWarehouseQuantity] = useState<string>('0');
  const [lowSellingPrice, setLowSellingPrice] = useState<string>('5');
  const [lowWarehouseQuantity, setLowWarehouseQuantity] = useState<string>('10');
  const [status, setStatus] = useState<ProductStatus>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      const res = await getCategories();
      if (res.data) {
        setCategories(res.data);
      }
    }
    loadCategories();
  }, []);

  const handleBarcodeScanned = (scannedCode: string) => {
    setBarcode(scannedCode.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter the product name.');
      return;
    }

    const mrpNum = parseFloat(mrp);
    const sellingPriceNum = parseFloat(sellingPrice);

    if (isNaN(mrpNum) || mrpNum < 0) {
      setErrorMessage('Please enter a valid MRP value (0 or greater).');
      return;
    }

    if (isNaN(sellingPriceNum) || sellingPriceNum < 0) {
      setErrorMessage('Please enter a valid Selling Price (0 or greater).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createProduct({
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
      } else {
        setSuccessMessage(`Product "${name}" was created successfully! (ID: ${res.data?.product_id})`);
        setTimeout(() => {
          router.push('/admin/products/dashboard');
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="add-product-page-layout" className="flex flex-col min-h-screen bg-bg-app">
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
          id="add-product-main"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="layout-responsive-container max-w-4xl mx-auto space-y-6">
            {/* Header & Back Link */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <Link
                  id="back-to-products-btn"
                  href="/admin/products/dashboard"
                  className="layout-flex-start gap-1 text-small font-semibold text-primary hover:underline mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Products</span>
                </Link>
                <h1 id="add-product-title" className="text-page-title font-bold">
                  Add New Product
                </h1>
                <p className="text-subtitle mt-1">
                  Create a new product item in the inventory catalog
                </p>
              </div>
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div
                id="add-product-error-banner"
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
                id="add-product-success-banner"
                className="p-4 rounded-lg bg-success-bg border border-success-border text-success-text layout-flex-between"
              >
                <div className="layout-flex-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span className="text-small font-medium">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Product Creation Form */}
            <form
              id="add-product-form"
              onSubmit={handleSubmit}
              className="card-base p-6 space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-section-title font-semibold layout-flex-start gap-2">
                  <Boxes className="w-5 h-5 text-primary" />
                  <span>Product Information</span>
                </h2>
                <p className="text-caption text-text-muted mt-1">
                  Fill in the details below. Business product ID (e.g. prod-101) is automatically generated.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="md:col-span-2 form-group">
                  <label htmlFor="product-name-input" className="form-label">
                    Product Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="product-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Premium California Almonds (500g)"
                    className="input-base w-full"
                  />
                  <span className="form-hint">
                    Enter the full descriptive name of the dry fruit / inventory item.
                  </span>
                </div>

                {/* Category Selection */}
                <div className="form-group">
                  <label htmlFor="product-category-select" className="form-label layout-flex-start gap-1">
                    <Tag className="w-4 h-4 text-text-muted" />
                    <span>Category</span>
                  </label>
                  <select
                    id="product-category-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="select-base w-full"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.category_id})
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">
                    Optionally assign a category for organized inventory filtering.
                  </span>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label htmlFor="product-status-select" className="form-label">
                    Status
                  </label>
                  <select
                    id="product-status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProductStatus)}
                    className="select-base w-full"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <span className="form-hint">
                    Inactive products are hidden from active checkout operations.
                  </span>
                </div>

                {/* Barcode & Camera Scanner Button */}
                <div className="md:col-span-2 form-group">
                  <label htmlFor="product-barcode-input" className="form-label layout-flex-between">
                    <span>Barcode (Scan with Camera or Type Manually)</span>
                    <span className="text-caption text-text-muted font-normal">Optional / Unique</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="product-barcode-input"
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 8901030865421 or scan with camera"
                      className="input-base font-mono flex-1"
                    />
                    <button
                      id="scan-barcode-camera-btn"
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="btn-base btn-secondary px-4 py-2 rounded-lg layout-flex-start gap-2 shrink-0 shadow-xs font-medium"
                      title="Open Camera Barcode Scanner"
                    >
                      <Camera className="w-5 h-5 text-primary" />
                      <span>Scan Barcode</span>
                    </button>
                  </div>
                  <span className="form-hint">
                    Use your device camera to scan and automatically fill the barcode, or enter it manually.
                  </span>
                </div>

                {/* Pricing Section Divider */}
                <div className="md:col-span-2 pt-2 border-t border-subtle">
                  <h3 className="text-card-title font-semibold text-text-primary">
                    Pricing & Valuation
                  </h3>
                </div>

                {/* MRP */}
                <div className="form-group">
                  <label htmlFor="product-mrp-input" className="form-label">
                    Maximum Retail Price - MRP (₹) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="product-mrp-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    placeholder="0.00"
                    className="input-base w-full"
                  />
                  <span className="form-hint">Printed Maximum Retail Price</span>
                </div>

                {/* Selling Price */}
                <div className="form-group">
                  <label htmlFor="product-selling-price-input" className="form-label">
                    Selling Price (₹) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="product-selling-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="input-base w-full font-bold text-primary"
                  />
                  <span className="form-hint">Actual store selling price for customers</span>
                </div>

                {/* Stock Quantities Section Divider */}
                <div className="md:col-span-2 pt-2 border-t border-subtle">
                  <h3 className="text-card-title font-semibold text-text-primary">
                    Stock & Quantity Levels
                  </h3>
                </div>

                {/* Retail Quantity */}
                <div className="form-group">
                  <label htmlFor="product-retail-qty-input" className="form-label">
                    Retail Shelf Quantity (Units / Kg)
                  </label>
                  <input
                    id="product-retail-qty-input"
                    type="number"
                    step="0.001"
                    min="0"
                    value={retailQuantity}
                    onChange={(e) => setRetailQuantity(e.target.value)}
                    placeholder="0"
                    className="input-base w-full"
                  />
                  <span className="form-hint">Quantity available in physical retail store</span>
                </div>

                {/* Warehouse Quantity */}
                <div className="form-group">
                  <label htmlFor="product-warehouse-qty-input" className="form-label">
                    Warehouse Quantity (Units / Kg)
                  </label>
                  <input
                    id="product-warehouse-qty-input"
                    type="number"
                    step="0.001"
                    min="0"
                    value={warehouseQuantity}
                    onChange={(e) => setWarehouseQuantity(e.target.value)}
                    placeholder="0"
                    className="input-base w-full"
                  />
                  <span className="form-hint">Bulk storage stock in back warehouse</span>
                </div>

                {/* Low Stock Alert Thresholds */}
                <div className="form-group">
                  <label htmlFor="product-low-retail-input" className="form-label layout-flex-start gap-1">
                    <span>Retail Low Stock Alert Threshold</span>
                    <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                  </label>
                  <input
                    id="product-low-retail-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={lowSellingPrice}
                    onChange={(e) => setLowSellingPrice(e.target.value)}
                    placeholder="5"
                    className="input-base w-full"
                  />
                  <span className="form-hint">
                    Trigger alert when retail stock falls to or below this amount
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="product-low-warehouse-input" className="form-label layout-flex-start gap-1">
                    <span>Warehouse Low Stock Alert Threshold</span>
                    <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                  </label>
                  <input
                    id="product-low-warehouse-input"
                    type="number"
                    step="0.001"
                    min="0"
                    value={lowWarehouseQuantity}
                    onChange={(e) => setLowWarehouseQuantity(e.target.value)}
                    placeholder="10"
                    className="input-base w-full"
                  />
                  <span className="form-hint">
                    Trigger alert when warehouse stock falls to or below this amount
                  </span>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-subtle layout-flex-between">
                <Link
                  id="cancel-add-product-btn"
                  href="/admin/products/dashboard"
                  className="btn-base btn-secondary px-5 py-2.5 rounded-lg shadow-xs font-medium"
                >
                  Cancel
                </Link>

                <button
                  id="save-product-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-base btn-primary px-5 py-2.5 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving to Database...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
