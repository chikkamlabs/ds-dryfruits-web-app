'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  Boxes,
  Plus,
  Trash2,
  Search,
  Camera,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  PlusCircle,
  Tag,
  Layers,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { getProducts } from '@/lib/productsStore';
import { getCategories } from '@/lib/categoriesStore';
import {
  getDistributors,
  createDistributor,
  createPurchase,
  type PurchaseLineItemInput,
} from '@/lib/purchasesStore';
import type { Product, Category, Distributor } from '@/lib/types';

export default function AdminAddPurchasePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Loaded database records
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form states
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [distributorSearch, setDistributorSearch] = useState('');
  const [isAddingNewDistributor, setIsAddingNewDistributor] = useState(false);
  const [newDistributorName, setNewDistributorName] = useState('');
  const [newDistributorLocation, setNewDistributorLocation] = useState('');
  const [isCreatingDistributor, setIsCreatingDistributor] = useState(false);

  // Product Selection & Quantity entry states
  const [productSearch, setProductSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [stagedProduct, setStagedProduct] = useState<Product | null>(null);
  const [stagedRetailQty, setStagedRetailQty] = useState<string>('0');
  const [stagedWarehouseQty, setStagedWarehouseQty] = useState<string>('0');

  // Purchase items list
  const [purchaseItems, setPurchaseItems] = useState<PurchaseLineItemInput[]>([]);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Submission & UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      setIsLoadingData(true);
      const [distRes, prodRes, catRes] = await Promise.all([
        getDistributors(),
        getProducts(),
        getCategories(),
      ]);

      if (!isMounted) return;

      if (distRes.data) setDistributors(distRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (catRes.data) setCategories(catRes.data);

      setIsLoadingData(false);
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Category map for lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => {
      map.set(cat.id, cat.name);
      if (cat.category_id) map.set(cat.category_id, cat.name);
    });
    return map;
  }, [categories]);

  // Filtered distributors based on search
  const filteredDistributors = useMemo(() => {
    if (!distributorSearch.trim()) return distributors;
    const q = distributorSearch.toLowerCase().trim();
    return distributors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.distributor_code.toLowerCase().includes(q) ||
        (d.location && d.location.toLowerCase().includes(q))
    );
  }, [distributors, distributorSearch]);

  // Filtered products for selection
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 12);
    const q = productSearch.toLowerCase().trim();
    return products
      .filter((p) => {
        const catName = p.category_id ? categoryMap.get(p.category_id) || '' : '';
        return (
          p.name.toLowerCase().includes(q) ||
          p.product_id.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          catName.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [products, productSearch, categoryMap]);

  // Handle Quick Create Distributor
  const handleCreateDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistributorName.trim()) {
      setErrorMessage('Distributor name is required');
      return;
    }

    setIsCreatingDistributor(true);
    setErrorMessage(null);

    const res = await createDistributor({
      name: newDistributorName.trim(),
      location: newDistributorLocation.trim() || undefined,
    });

    setIsCreatingDistributor(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setDistributors((prev) => [res.data!, ...prev]);
      setSelectedDistributor(res.data);
      setIsAddingNewDistributor(false);
      setNewDistributorName('');
      setNewDistributorLocation('');
      setDistributorSearch('');
    }
  };

  // Handle Barcode Scan match
  const handleBarcodeScanned = (scannedBarcode: string) => {
    setIsScannerOpen(false);
    const cleaned = scannedBarcode.trim();
    const matched = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === cleaned.toLowerCase()
    );

    if (matched) {
      selectProductForStaging(matched);
      setProductSearch('');
    } else {
      setProductSearch(cleaned);
      setErrorMessage(`No existing product found with barcode "${cleaned}". You can search by name or create it in Products.`);
    }
  };

  // Select a product to enter quantities
  const selectProductForStaging = (product: Product) => {
    setStagedProduct(product);
    setStagedRetailQty('0');
    setStagedWarehouseQty('0');
    setErrorMessage(null);
  };

  // Add staged product to purchaseItems list
  const handleAddItemToPurchase = () => {
    if (!stagedProduct) {
      setErrorMessage('Please select a product first.');
      return;
    }

    const rQty = parseFloat(stagedRetailQty) || 0;
    const wQty = parseFloat(stagedWarehouseQty) || 0;

    if (rQty <= 0 && wQty <= 0) {
      setErrorMessage(`Please enter retail or warehouse quantity for "${stagedProduct.name}".`);
      return;
    }

    if (rQty < 0 || wQty < 0) {
      setErrorMessage('Quantities cannot be negative.');
      return;
    }

    const catName = stagedProduct.category_id
      ? categoryMap.get(stagedProduct.category_id) || 'Unassigned'
      : 'Unassigned';

    // Check if product is already in list; if so, update quantities
    const existingIndex = purchaseItems.findIndex(
      (item) => item.product_id === stagedProduct.id
    );

    if (existingIndex > -1) {
      setPurchaseItems((prev) => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          retail_quantity: updated[existingIndex].retail_quantity + rQty,
          warehouse_quantity: updated[existingIndex].warehouse_quantity + wQty,
        };
        return updated;
      });
    } else {
      const newItem: PurchaseLineItemInput = {
        product_id: stagedProduct.id,
        product_name: stagedProduct.name,
        retail_quantity: rQty,
        warehouse_quantity: wQty,
        mrp: Number(stagedProduct.mrp) || 0,
        category_name: catName,
        barcode: stagedProduct.barcode || null,
      };

      setPurchaseItems((prev) => [newItem, ...prev]);
    }

    // Reset staged inputs
    setStagedProduct(null);
    setStagedRetailQty('0');
    setStagedWarehouseQty('0');
    setProductSearch('');
    setErrorMessage(null);
  };

  // Remove item from purchase list
  const handleRemoveItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Total summary calculations
  const totalRetailQty = useMemo(
    () => purchaseItems.reduce((sum, item) => sum + (Number(item.retail_quantity) || 0), 0),
    [purchaseItems]
  );

  const totalWarehouseQty = useMemo(
    () => purchaseItems.reduce((sum, item) => sum + (Number(item.warehouse_quantity) || 0), 0),
    [purchaseItems]
  );

  const totalCombinedQty = totalRetailQty + totalWarehouseQty;

  // Final Submit Purchase
  const handleSubmitPurchase = async () => {
    if (!selectedDistributor) {
      setErrorMessage('Please select a distributor.');
      return;
    }

    if (purchaseItems.length === 0) {
      setErrorMessage('Please add at least one product item to the purchase.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await createPurchase({
      distributor_id: selectedDistributor.id,
      notes: purchaseNotes.trim() || undefined,
      items: purchaseItems,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setSuccessMessage(
        `Purchase "${res.data.purchase_id}" created successfully! Product stock has been updated.`
      );
      setTimeout(() => {
        router.push(`/admin/purchases/openpurchase?id=${res.data!.id}`);
      }, 1200);
    }
  };

  return (
    <div id="admin-add-purchase-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader onToggleSidebar={() => setIsSidebarOpen(true)} onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <main id="admin-add-purchase-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-5xl mx-auto space-y-6">
            {/* Breadcrumb & Top Action Header */}
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
                  <span className="breadcrumb-item-active">Add Purchase</span>
                </div>
                <h1 id="add-purchase-page-title" className="text-page-title font-bold text-text-primary">
                  New Purchase Entry
                </h1>
                <p className="text-subtitle mt-0.5">
                  Select distributor, scan or search products, and enter retail & warehouse quantities
                </p>
              </div>

              <Link
                id="back-to-purchases-btn"
                href="/admin/purchases/dashboard"
                className="btn-base btn-secondary px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Purchases</span>
              </Link>
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div
                id="add-purchase-error-banner"
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
                id="add-purchase-success-banner"
                className="p-4 rounded-lg bg-success-bg border border-success-border text-success-text layout-flex-between"
              >
                <div className="layout-flex-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span className="text-small font-semibold">{successMessage}</span>
                </div>
              </div>
            )}

            {/* STEP 1: DISTRIBUTOR SELECTION */}
            <div id="step-distributor-card" className="card-base p-5 space-y-4">
              <div className="layout-flex-between border-b border-subtle pb-3">
                <div className="layout-flex-start gap-2">
                  <div className="p-2 rounded-lg bg-primary-light text-primary">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-section-title font-bold text-text-primary">
                      1. Select Distributor
                    </h2>
                    <p className="text-caption text-text-muted">
                      Search distributor name or pick from directory
                    </p>
                  </div>
                </div>

                {selectedDistributor && (
                  <button
                    id="change-distributor-btn"
                    type="button"
                    onClick={() => setSelectedDistributor(null)}
                    className="btn-base btn-ghost text-xs text-primary font-semibold"
                  >
                    Change Distributor
                  </button>
                )}
              </div>

              {selectedDistributor ? (
                /* Selected Distributor Active Card */
                <div
                  id="selected-distributor-display"
                  className="p-4 rounded-lg border-2 border-primary bg-primary-light/40 layout-flex-between flex-wrap gap-4"
                >
                  <div className="layout-flex-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="layout-flex-start gap-2">
                        <h3 className="text-card-title font-bold text-primary">
                          {selectedDistributor.name}
                        </h3>
                        <span className="badge-base badge-primary font-mono text-xs">
                          {selectedDistributor.distributor_code}
                        </span>
                      </div>
                      <p className="text-caption text-text-secondary mt-0.5">
                        {selectedDistributor.location
                          ? `Location: ${selectedDistributor.location}`
                          : 'Location not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="layout-flex-start gap-2">
                    <span className="badge-base badge-success py-1 px-2.5 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Distributor Selected
                    </span>
                  </div>
                </div>
              ) : (
                /* Distributor Search & Selection Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-8 form-group">
                      <label htmlFor="distributor-search-input" className="form-label">
                        Search Distributor by Name or Code
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          id="distributor-search-input"
                          type="text"
                          value={distributorSearch}
                          onChange={(e) => setDistributorSearch(e.target.value)}
                          placeholder="Type distributor name (e.g. Royal Dry Fruits, distri-101)..."
                          className="input-base pl-9 w-full"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <button
                        id="toggle-add-distributor-btn"
                        type="button"
                        onClick={() => setIsAddingNewDistributor(!isAddingNewDistributor)}
                        className="btn-base btn-secondary px-4 py-2 rounded-lg w-full layout-flex-center gap-1.5 shadow-xs font-medium"
                      >
                        <PlusCircle className="w-4 h-4 text-primary" />
                        <span>{isAddingNewDistributor ? 'Cancel' : 'Quick Add Distributor'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Quick Add Distributor Form */}
                  {isAddingNewDistributor && (
                    <form
                      onSubmit={handleCreateDistributor}
                      className="p-4 rounded-lg bg-surface-subtle border border-border space-y-3 animate-fade-in"
                    >
                      <span className="text-label font-bold text-primary">Add New Distributor</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="form-group">
                          <label className="form-label">Distributor Name *</label>
                          <input
                            type="text"
                            value={newDistributorName}
                            onChange={(e) => setNewDistributorName(e.target.value)}
                            placeholder="e.g. Royal Cashew Distributors"
                            className="input-base"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Location (Optional)</label>
                          <input
                            type="text"
                            value={newDistributorLocation}
                            onChange={(e) => setNewDistributorLocation(e.target.value)}
                            placeholder="e.g. Navi Mumbai APMC"
                            className="input-base"
                          />
                        </div>
                      </div>
                      <div className="layout-flex-start justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewDistributor(false)}
                          className="btn-base btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingDistributor}
                          className="btn-base btn-primary btn-sm"
                        >
                          {isCreatingDistributor ? 'Saving...' : 'Save & Select Distributor'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Matching Distributors Grid / List */}
                  <div className="space-y-2">
                    <span className="text-caption font-semibold text-text-muted">
                      Matching Distributors ({filteredDistributors.length})
                    </span>

                    {filteredDistributors.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-small text-text-muted">
                        No distributors found matching &quot;{distributorSearch}&quot;. You can use &quot;Quick Add Distributor&quot; above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
                        {filteredDistributors.map((dist) => (
                          <div
                            key={dist.id}
                            id={`distributor-option-${dist.distributor_code}`}
                            onClick={() => setSelectedDistributor(dist)}
                            className="p-3 rounded-lg border border-border bg-surface hover:border-primary hover:bg-primary-light/20 cursor-pointer transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="layout-flex-between">
                                <span className="font-semibold text-text-primary text-small">
                                  {dist.name}
                                </span>
                                <span className="font-mono text-caption text-text-muted">
                                  {dist.distributor_code}
                                </span>
                              </div>
                              {dist.location && (
                                <p className="text-caption text-text-secondary mt-1 truncate">
                                  {dist.location}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn-base btn-outline btn-sm w-full mt-2 text-xs py-1"
                            >
                              Select
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: SEARCH PRODUCT & ENTER QUANTITIES */}
            <div id="step-products-card" className="card-base p-5 space-y-4">
              <div className="layout-flex-between border-b border-subtle pb-3">
                <div className="layout-flex-start gap-2">
                  <div className="p-2 rounded-lg bg-secondary-light text-secondary">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-section-title font-bold text-text-primary">
                      2. Add Purchase Products
                    </h2>
                    <p className="text-caption text-text-muted">
                      Search product by name, scan barcode, and specify retail & warehouse quantities
                    </p>
                  </div>
                </div>

                <button
                  id="scan-barcode-btn"
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="btn-base btn-outline px-4 py-2 rounded-lg layout-flex-start gap-2 shadow-xs font-medium"
                >
                  <Camera className="w-4 h-4 text-primary" />
                  <span>Scan Barcode</span>
                </button>
              </div>

              {/* Product Search and Quick Select */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8 form-group">
                  <label htmlFor="product-search-input" className="form-label">
                    Search Product (Name, ID, Barcode, Category)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="product-search-input"
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Type product name (e.g. California Almonds, prod-101)..."
                      className="input-base pl-9 w-full"
                    />
                  </div>
                </div>

                <div className="md:col-span-4">
                  <span className="text-caption text-text-muted block mb-1">
                    Catalog: {products.length} products available
                  </span>
                  <p className="text-caption text-text-secondary">
                    Select a product below to enter quantities
                  </p>
                </div>
              </div>

              {/* Product quick-selection buttons/cards */}
              {!stagedProduct && (
                <div className="space-y-2">
                  <span className="text-caption font-semibold text-text-muted">
                    Available Products:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                    {filteredProducts.map((p) => {
                      const catName = p.category_id
                        ? categoryMap.get(p.category_id) || 'Unassigned'
                        : 'Unassigned';

                      return (
                        <div
                          key={p.id}
                          id={`product-item-${p.product_id}`}
                          onClick={() => selectProductForStaging(p)}
                          className="p-3 rounded-lg border border-border bg-surface hover:border-secondary hover:bg-surface-hover cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="layout-flex-between">
                              <span className="font-semibold text-text-primary text-small truncate">
                                {p.name}
                              </span>
                              <span className="badge-base badge-secondary text-[10px]">
                                {catName}
                              </span>
                            </div>
                            <div className="layout-flex-between text-caption text-text-muted mt-1">
                              <span className="font-mono">{p.product_id}</span>
                              <span className="font-semibold text-text-primary">
                                MRP: ₹{(Number(p.mrp) || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="layout-flex-start gap-2 text-caption text-text-secondary mt-1">
                              <span>Retail: <strong>{p.retail_quantity}</strong></span>
                              <span>•</span>
                              <span>Whse: <strong>{p.warehouse_quantity}</strong></span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn-base btn-secondary btn-sm w-full mt-2 text-xs py-1"
                          >
                            + Enter Quantity
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staged Product Quantity Allocation Form */}
              {stagedProduct && (
                <div
                  id="staged-product-card"
                  className="p-4 rounded-lg bg-surface-subtle border-2 border-secondary space-y-4 animate-scale-in"
                >
                  <div className="layout-flex-between flex-wrap gap-2 border-b border-subtle pb-3">
                    <div className="layout-flex-start gap-2">
                      <div className="p-1.5 rounded-md bg-secondary text-white font-bold text-xs">
                        {stagedProduct.product_id}
                      </div>
                      <div>
                        <h3 className="text-card-title font-bold text-text-primary">
                          {stagedProduct.name}
                        </h3>
                        <div className="layout-flex-start gap-3 text-caption text-text-secondary mt-0.5">
                          <span>
                            Category:{' '}
                            <strong className="text-text-primary">
                              {stagedProduct.category_id
                                ? categoryMap.get(stagedProduct.category_id) || 'Unassigned'
                                : 'Unassigned'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            MRP: <strong className="text-text-primary">₹{(Number(stagedProduct.mrp) || 0).toFixed(2)}</strong>
                          </span>
                          {stagedProduct.barcode && (
                            <>
                              <span>•</span>
                              <span>Barcode: <strong className="font-mono">{stagedProduct.barcode}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStagedProduct(null)}
                      className="btn-base btn-ghost text-xs text-danger font-semibold"
                    >
                      Cancel Selection
                    </button>
                  </div>

                  {/* Quantities Entry Row: Retail and Warehouse */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {/* Retail Quantity */}
                    <div className="form-group">
                      <label htmlFor="staged-retail-qty-input" className="form-label layout-flex-start gap-1">
                        <Boxes className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Retail Quantity to Add</span>
                      </label>
                      <input
                        id="staged-retail-qty-input"
                        type="number"
                        min="0"
                        step="any"
                        value={stagedRetailQty}
                        onChange={(e) => setStagedRetailQty(e.target.value)}
                        className="input-base font-semibold text-emerald-800"
                        placeholder="0"
                      />
                      <span className="text-caption text-text-muted">
                        Current retail stock: {stagedProduct.retail_quantity}
                      </span>
                    </div>

                    {/* Warehouse Quantity */}
                    <div className="form-group">
                      <label htmlFor="staged-warehouse-qty-input" className="form-label layout-flex-start gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-700" />
                        <span>Warehouse Quantity to Add</span>
                      </label>
                      <input
                        id="staged-warehouse-qty-input"
                        type="number"
                        min="0"
                        step="any"
                        value={stagedWarehouseQty}
                        onChange={(e) => setStagedWarehouseQty(e.target.value)}
                        className="input-base font-semibold text-amber-800"
                        placeholder="0"
                      />
                      <span className="text-caption text-text-muted">
                        Current warehouse stock: {stagedProduct.warehouse_quantity}
                      </span>
                    </div>

                    {/* Total for this line */}
                    <div className="form-group">
                      <span className="form-label">Total Item Addition</span>
                      <div className="h-[2.375rem] flex items-center px-3 rounded-md bg-surface border border-border font-bold text-text-primary">
                        {(
                          (parseFloat(stagedRetailQty) || 0) +
                          (parseFloat(stagedWarehouseQty) || 0)
                        ).toLocaleString()}
                      </div>
                      <span className="text-caption text-text-muted">Combined units / kg</span>
                    </div>

                    {/* Add to list CTA */}
                    <div>
                      <button
                        id="confirm-add-item-btn"
                        type="button"
                        onClick={handleAddItemToPurchase}
                        className="btn-base btn-primary w-full h-[2.375rem] layout-flex-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Purchase</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: PURCHASE LINE ITEMS TABLE & TOTAL SUMMARY */}
            <div id="step-summary-card" className="card-base overflow-hidden">
              <div className="card-header layout-flex-between">
                <div className="layout-flex-start gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <h3 className="text-card-title font-bold">
                    3. Purchase Items List ({purchaseItems.length})
                  </h3>
                </div>

                {purchaseItems.length > 0 && (
                  <button
                    id="clear-all-items-btn"
                    type="button"
                    onClick={() => setPurchaseItems([])}
                    className="btn-base btn-ghost text-xs text-danger font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="table-container">
                <table id="added-purchase-items-table" className="table-base">
                  <thead className="table-header">
                    <tr>
                      <th className="table-th w-12">#</th>
                      <th className="table-th">Product Name</th>
                      <th className="table-th">Category</th>
                      <th className="table-th text-right">MRP (₹)</th>
                      <th className="table-th text-right">Retail Qty (+)</th>
                      <th className="table-th text-right">Warehouse Qty (+)</th>
                      <th className="table-th text-right">Total Line Qty</th>
                      <th className="table-th text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="table-td text-center py-10 text-text-muted">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Boxes className="w-8 h-8 text-text-muted stroke-[1.5]" />
                            <p className="text-small font-medium">No items added to this purchase bill yet.</p>
                            <p className="text-caption">Select products above and specify quantities to add.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      purchaseItems.map((item, index) => (
                        <tr
                          key={`${item.product_id}-${index}`}
                          id={`purchase-item-row-${index}`}
                          className="table-row"
                        >
                          <td className="table-td font-mono text-caption text-text-muted">
                            {index + 1}
                          </td>
                          <td className="table-td font-semibold text-text-primary">
                            <div>
                              <span>{item.product_name}</span>
                              {item.barcode && (
                                <span className="font-mono text-caption text-text-muted block">
                                  {item.barcode}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="table-td">
                            <span className="badge-base badge-secondary text-caption">
                              {item.category_name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="table-td text-right font-medium text-text-secondary">
                            ₹{(Number(item.mrp) || 0).toFixed(2)}
                          </td>
                          <td className="table-td text-right font-bold text-emerald-800">
                            {Number(item.retail_quantity).toLocaleString()}
                          </td>
                          <td className="table-td text-right font-bold text-amber-800">
                            {Number(item.warehouse_quantity).toLocaleString()}
                          </td>
                          <td className="table-td text-right font-bold text-text-primary">
                            {(
                              Number(item.retail_quantity) + Number(item.warehouse_quantity)
                            ).toLocaleString()}
                          </td>
                          <td className="table-td text-right">
                            <button
                              id={`remove-item-btn-${index}`}
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="btn-base btn-ghost btn-icon-sm text-danger hover:bg-danger-bg inline-flex"
                              title="Remove item"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Purchase Notes and Grand Totals */}
              <div className="p-5 bg-surface-subtle border-t border-subtle space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Notes / Invoice Ref */}
                  <div className="md:col-span-7 form-group">
                    <label htmlFor="purchase-notes-input" className="form-label">
                      Purchase Notes / Vendor Invoice Reference (Optional)
                    </label>
                    <textarea
                      id="purchase-notes-input"
                      value={purchaseNotes}
                      onChange={(e) => setPurchaseNotes(e.target.value)}
                      placeholder="e.g. Invoice #INV-2026-889, Received via City Express Logistics..."
                      className="textarea-base min-h-[4.5rem]"
                    />
                  </div>

                  {/* Summary Totals Box */}
                  <div className="md:col-span-5 bg-surface p-4 rounded-lg border border-border space-y-2">
                    <div className="layout-flex-between text-small">
                      <span className="text-text-secondary">Total Line Items:</span>
                      <strong className="text-text-primary">{purchaseItems.length} products</strong>
                    </div>

                    <div className="layout-flex-between text-small">
                      <span className="text-text-secondary">Total Retail Stock Added:</span>
                      <strong className="text-emerald-800">+{totalRetailQty.toLocaleString()}</strong>
                    </div>

                    <div className="layout-flex-between text-small">
                      <span className="text-text-secondary">Total Warehouse Stock Added:</span>
                      <strong className="text-amber-800">+{totalWarehouseQty.toLocaleString()}</strong>
                    </div>

                    <div className="layout-flex-between pt-2 border-t border-subtle">
                      <span className="font-bold text-text-primary text-body">
                        Grand Total Quantity:
                      </span>
                      <span
                        id="grand-total-purchase-qty"
                        className="text-stat-number text-xl font-bold text-primary"
                      >
                        +{totalCombinedQty.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Submit Actions */}
                <div className="layout-flex-between flex-wrap gap-4 pt-3 border-t border-subtle">
                  <Link
                    href="/admin/purchases/dashboard"
                    className="btn-base btn-secondary"
                  >
                    Cancel
                  </Link>

                  <button
                    id="save-purchase-btn"
                    type="button"
                    onClick={handleSubmitPurchase}
                    disabled={isSubmitting || purchaseItems.length === 0 || !selectedDistributor}
                    className="btn-base btn-primary btn-lg layout-flex-start gap-2 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Updating Inventory...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirm & Save Purchase</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
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
