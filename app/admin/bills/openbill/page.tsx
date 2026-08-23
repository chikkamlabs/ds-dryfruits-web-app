'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Save,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';
import AdminHeader from '@/app/admin/header/page';
import AdminSidebar from '@/app/admin/sidebar/page';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { getProducts } from '@/lib/productsStore';
import { getCustomers, createCustomer } from '@/lib/customersStore';
import { getBillById, updateBill, type BillWithDetails } from '@/lib/billsStore';
import type { Product, Customer, PaymentMode, BillStatus } from '@/lib/types';

interface BilledRowItem {
  id: string;
  product_id: string;
  name: string;
  mrp: number;
  quantity: number;
  selling_price: number;
  row_total: number;
}

function OpenBillInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billIdParam = searchParams.get('id') || '';

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Original Bill
  const [originalBill, setOriginalBill] = useState<BillWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data sources
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Scanner Modal
  const [scannerOpen, setScannerOpen] = useState(false);

  // Product Search State
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Billed items list
  const [items, setItems] = useState<BilledRowItem[]>([]);

  // Customer Section State
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Quick Add Customer Modal
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustMobile, setQuickCustMobile] = useState('');
  const [quickCustError, setQuickCustError] = useState('');

  // Payment Section State
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [upiAmount, setUpiAmount] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [billStatus, setBillStatus] = useState<BillStatus>('completed');

  // Input refs for keyboard navigation
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const discountInputRef = useRef<HTMLInputElement | null>(null);
  const cashAmountInputRef = useRef<HTMLInputElement | null>(null);
  const upiAmountInputRef = useRef<HTMLInputElement | null>(null);
  const creditAmountInputRef = useRef<HTMLInputElement | null>(null);
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  // Refs map for grid items
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Fetch initial data and bill
  useEffect(() => {
    async function loadData() {
      if (!billIdParam) {
        setLoading(false);
        setFeedback({ type: 'error', message: 'No Bill ID specified in URL.' });
        return;
      }

      setLoading(true);
      const [prodRes, custRes, billRes] = await Promise.all([
        getProducts(),
        getCustomers(),
        getBillById(billIdParam),
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (custRes.data) setCustomers(custRes.data);

      if (billRes.error || !billRes.data) {
        setFeedback({ type: 'error', message: billRes.error || 'Bill record not found.' });
      } else {
        const bill = billRes.data;
        setOriginalBill(bill);
        setBillStatus(bill.status || 'completed');
        setDiscount(Number(bill.discount) || 0);

        // Populate items
        const mappedItems: BilledRowItem[] = bill.items.map((it) => ({
          id: it.id || `row-${Math.random()}`,
          product_id: it.product_id,
          name: it.product?.name || `Product (${it.product_id})`,
          mrp: Number(it.mrp) || 0,
          quantity: Number(it.quantity) || 1,
          selling_price: Number(it.selling_price) || 0,
          row_total: Number(it.row_total) || 0,
        }));
        setItems(mappedItems);

        // Populate customer
        if (bill.customer) {
          setSelectedCustomer(bill.customer);
          setCustomerQuery(`${bill.customer.name} (${bill.customer.mobile || 'No mobile'})`);
        }

        // Populate payments
        let cAmt = 0;
        let uAmt = 0;
        let crAmt = 0;
        if (bill.payments && bill.payments.length > 0) {
          for (const p of bill.payments) {
            if (p.mode === 'cash') cAmt += Number(p.amount) || 0;
            if (p.mode === 'upi') uAmt += Number(p.amount) || 0;
            if (p.mode === 'credit') crAmt += Number(p.amount) || 0;
          }
          if (cAmt > 0) setCashAmount(String(cAmt));
          if (uAmt > 0) setUpiAmount(String(uAmt));
          if (crAmt > 0) setCreditAmount(String(crAmt));

          if (crAmt > 0) setPaymentMode('credit');
          else if (uAmt > 0) setPaymentMode('upi');
          else setPaymentMode('cash');
        } else if (bill.total > 0) {
          setCashAmount(String(bill.total));
          setPaymentMode('cash');
        }
      }

      setLoading(false);
    }

    loadData();
  }, [billIdParam]);

  // Filtered products derived from search query
  const filteredProducts = React.useMemo(() => {
    if (!productQuery.trim()) return [];
    const q = productQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.product_id.toLowerCase().includes(q)
    );
  }, [productQuery, products]);

  // Filtered customers derived from search query
  const filteredCustomers = React.useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.toLowerCase().includes(q))
    );
  }, [customerQuery, customers]);

  const handleProductQueryChange = (val: string) => {
    setProductQuery(val);
    setSelectedProductIndex(0);
    setShowProductDropdown(val.trim().length > 0);
  };

  const handleCustomerQueryChange = (val: string) => {
    setCustomerQuery(val);
    setSelectedCustomerIndex(0);
    setShowCustomerDropdown(val.trim().length > 0);
    if (selectedCustomer) {
      setSelectedCustomer(null);
    }
  };

  // Calculations
  const subtotal = items.reduce((acc, curr) => acc + curr.row_total, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  // Add product to bill
  const addProductToBill = (prod: Product) => {
    const existingIndex = items.findIndex((it) => it.product_id === prod.id);

    if (existingIndex > -1) {
      setItems((prev) => {
        const updated = [...prev];
        const row = updated[existingIndex];
        if (row) {
          const newQty = (Number(row.quantity) || 0) + 1;
          row.quantity = newQty;
          row.row_total = Number((newQty * row.selling_price).toFixed(2));
        }
        return updated;
      });

      setTimeout(() => {
        quantityInputRefs.current[existingIndex]?.focus();
        quantityInputRefs.current[existingIndex]?.select();
      }, 50);

      setProductQuery('');
      setShowProductDropdown(false);
      return;
    }

    const newItem: BilledRowItem = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: prod.id,
      name: prod.name,
      mrp: Number(prod.mrp) || 0,
      quantity: 1,
      selling_price: Number(prod.selling_price) || 0,
      row_total: Number(prod.selling_price) || 0,
    };

    setItems((prev) => [...prev, newItem]);
    setProductQuery('');
    setShowProductDropdown(false);

    setTimeout(() => {
      const newIndex = items.length;
      quantityInputRefs.current[newIndex]?.focus();
      quantityInputRefs.current[newIndex]?.select();
    }, 50);
  };

  const handleBarcodeScan = (scannedCode: string) => {
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === scannedCode.toLowerCase()) ||
        p.product_id.toLowerCase() === scannedCode.toLowerCase()
    );

    if (matched) {
      addProductToBill(matched);
      setScannerOpen(false);
    } else {
      setFeedback({
        type: 'error',
        message: `No product found matching barcode "${scannedCode}".`,
      });
    }
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProductDropdown || filteredProducts.length === 0) {
      if (e.key === 'Enter' && productQuery.trim()) {
        const exactMatch = products.find(
          (p) =>
            (p.barcode && p.barcode.toLowerCase() === productQuery.trim().toLowerCase()) ||
            p.product_id.toLowerCase() === productQuery.trim().toLowerCase()
        );
        if (exactMatch) {
          e.preventDefault();
          addProductToBill(exactMatch);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedProductIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedProductIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredProducts[selectedProductIndex];
      if (selected) {
        addProductToBill(selected);
      }
    } else if (e.key === 'Escape') {
      setShowProductDropdown(false);
    }
  };

  const updateItemRow = (index: number, field: 'quantity' | 'selling_price', value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = updated[index];
      if (!row) return prev;

      if (field === 'quantity') {
        const q = Math.max(0.001, Number(value) || 1);
        row.quantity = q;
        row.row_total = Number((q * row.selling_price).toFixed(2));
      } else if (field === 'selling_price') {
        const sp = Math.max(0, Number(value) || 0);
        row.selling_price = sp;
        row.row_total = Number((row.quantity * sp).toFixed(2));
      }

      return updated;
    });
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerDropdown || filteredCustomers.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCustomerIndex((prev) => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCustomerIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCustomers[selectedCustomerIndex];
      if (selected) {
        selectCustomer(selected);
      }
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerQuery(`${cust.name} (${cust.mobile || 'No mobile'})`);
    setShowCustomerDropdown(false);
    setTimeout(() => {
      discountInputRef.current?.focus();
      discountInputRef.current?.select();
    }, 50);
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      setQuickCustError('Customer Name is required');
      return;
    }

    const { data, error } = await createCustomer({
      name: quickCustName.trim(),
      mobile: quickCustMobile.trim() || null,
      points: 0,
      credit: 0,
      status: 'active',
    });

    if (error || !data) {
      setQuickCustError(error || 'Failed to add customer');
      return;
    }

    setCustomers((prev) => [data, ...prev]);
    selectCustomer(data);
    setQuickCustomerModalOpen(false);
    setQuickCustName('');
    setQuickCustMobile('');
    setQuickCustError('');
  };

  // Submit / Update Bill (Save only, Save & Print, or Draft)
  const handleUpdateBill = async (status: BillStatus, printAfterSave = false) => {
    if (!originalBill) return;

    if (items.length === 0) {
      setFeedback({ type: 'error', message: 'Please keep at least one product in the bill.' });
      return;
    }

    const cAmt = parseFloat(cashAmount) || 0;
    const uAmt = parseFloat(upiAmount) || 0;
    const crAmt = parseFloat(creditAmount) || 0;

    const paymentsList: { mode: PaymentMode; amount: number }[] = [];
    if (cAmt > 0) paymentsList.push({ mode: 'cash', amount: cAmt });
    if (uAmt > 0) paymentsList.push({ mode: 'upi', amount: uAmt });
    if (crAmt > 0) paymentsList.push({ mode: 'credit', amount: crAmt });

    if (paymentsList.length === 0 && total > 0 && status === 'completed') {
      paymentsList.push({ mode: paymentMode || 'cash', amount: total });
    }

    const hasCredit = paymentsList.some((p) => p.mode === 'credit' && p.amount > 0);
    if (hasCredit && !selectedCustomer && status === 'completed') {
      setFeedback({
        type: 'error',
        message: 'A customer must be selected for Credit payment.',
      });
      customerSearchInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setFeedback(null);

    const updatePayload = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      subtotal,
      discount: Number(discount) || 0,
      total,
      status,
      payments: status === 'completed' ? paymentsList : undefined,
      items: items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        mrp: it.mrp,
        selling_price: it.selling_price,
        row_total: it.row_total,
      })),
    };

    const res = await updateBill(originalBill.id, updatePayload);

    setSaving(false);

    if (res.error || !res.data) {
      setFeedback({ type: 'error', message: res.error || 'Failed to update bill.' });
    } else {
      setOriginalBill(res.data);
      setBillStatus(status);
      setFeedback({
        type: 'success',
        message: `Bill #${res.data.bill_id} updated successfully!`,
      });

      if (printAfterSave) {
        window.print();
      }
    }
  };

  return (
    <div id="admin-openbill-layout" className="flex flex-col min-h-screen bg-bg-app">
      {/* Top Navigation */}
      <AdminHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        onOpenSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <AdminSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        {/* Main Content Area */}
        <main id="admin-openbill-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-7xl mx-auto space-y-5">
            {/* Header & Breadcrumbs */}
            <div className="layout-flex-between flex-wrap gap-4">
              <div>
                <div className="breadcrumb-nav mb-1">
                  <Link href="/admin/dashboard" className="breadcrumb-item">
                    Home
                  </Link>
                  <span>/</span>
                  <Link href="/admin/bills/dashboard" className="breadcrumb-item">
                    Bills
                  </Link>
                  <span>/</span>
                  <span className="breadcrumb-item-active">
                    {originalBill ? originalBill.bill_id : 'Edit Bill'}
                  </span>
                </div>
                <div className="layout-flex-start gap-3 flex-wrap">
                  <h1 id="openbill-page-title" className="text-page-title font-bold text-text-primary">
                    {originalBill ? `Bill #${originalBill.bill_id}` : 'Open Bill'}
                  </h1>
                  {originalBill && (
                    <span
                      id="bill-status-badge"
                      className={`badge-base ${
                        billStatus === 'completed' ? 'badge-success' : 'badge-warning'
                      } text-xs font-semibold px-2.5 py-0.5`}
                    >
                      {billStatus === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                      ) : (
                        <Clock className="w-3 h-3 mr-1 inline" />
                      )}
                      {billStatus.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="layout-flex-start gap-3">
                <Link
                  id="back-to-bills-dashboard-btn"
                  href="/admin/bills/dashboard"
                  className="btn-base btn-outline layout-flex-start gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Bills</span>
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-base btn-secondary layout-flex-start gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {feedback && (
              <div
                id="openbill-feedback-banner"
                className={`p-3.5 rounded-lg border layout-flex-between animate-fade-in ${
                  feedback.type === 'success'
                    ? 'bg-success-bg border-success-border text-success-text'
                    : 'bg-danger-bg border-danger-border text-danger-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">{feedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="btn-base btn-ghost btn-icon-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-body text-muted">Loading bill details...</p>
              </div>
            ) : !originalBill ? (
              <div className="p-12 text-center card-base flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-10 h-10 text-danger" />
                <h2 className="text-card-title font-bold">Bill Not Found</h2>
                <p className="text-small text-muted">
                  The requested bill record could not be retrieved from the database.
                </p>
                <Link href="/admin/bills/dashboard" className="btn-base btn-primary mt-2">
                  Return to Bills
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN: Products & Table (8 Cols) */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  {/* 1. Scan / Search Product Bar */}
                  <div id="product-search-card" className="card-base card-overflow-visible p-4 relative z-30">
                    <label htmlFor="product-search-input" className="form-label mb-1.5 flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      <span>Scan Barcode or Search Product (Name, ID, Barcode)</span>
                    </label>

                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={productSearchInputRef}
                          id="product-search-input"
                          type="text"
                          placeholder="Scan barcode or type name (e.g. Almonds, 1001, 890123...)"
                          value={productQuery}
                          onChange={(e) => handleProductQueryChange(e.target.value)}
                          onKeyDown={handleProductSearchKeyDown}
                          onFocus={() => setShowProductDropdown(productQuery.trim().length > 0)}
                          className="input-base pl-9 pr-8"
                          autoComplete="off"
                        />
                        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        {productQuery && (
                          <button
                            type="button"
                            onClick={() => handleProductQueryChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        id="open-barcode-scanner-btn"
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        className="btn-base btn-secondary layout-flex-start gap-1.5 shrink-0 px-3"
                        title="Scan with Camera"
                      >
                        <Barcode className="w-4 h-4" />
                        <span className="hidden sm:inline">Scan</span>
                      </button>

                      {/* Product Search Dropdown */}
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <div
                          id="product-search-dropdown"
                          className="dropdown-panel absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto"
                        >
                          {filteredProducts.map((p, idx) => (
                            <div
                              key={p.id}
                              onClick={() => addProductToBill(p)}
                              className={`p-3 layout-flex-between cursor-pointer border-b border-subtle last:border-none transition-colors ${
                                idx === selectedProductIndex
                                  ? 'bg-primary-light text-primary font-semibold'
                                  : 'hover:bg-surface-hover bg-surface'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-body font-medium text-primary">{p.name}</span>
                                <span className="text-small text-muted flex items-center gap-2">
                                  <span>Code: {p.product_id}</span>
                                  {p.barcode && <span>• Barcode: {p.barcode}</span>}
                                  <span>• Stock: {p.retail_quantity} kg</span>
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-body font-bold text-primary">₹{p.selling_price}/kg</div>
                                <div className="text-caption text-muted line-through">MRP ₹{p.mrp}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Billing Line Items Table */}
                  <div id="billed-items-card" className="card-base overflow-hidden">
                    <div className="p-3.5 border-b border-subtle layout-flex-between">
                      <div className="layout-flex-start gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h2 className="text-card-title font-bold text-text-primary">Bill Items ({items.length})</h2>
                      </div>
                      <span className="text-small text-muted">
                        Subtotal: <strong className="text-primary font-bold">₹{subtotal.toFixed(2)}</strong>
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-muted">
                          <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-body font-medium text-text-secondary">No items in this bill</p>
                        <p className="text-small text-muted max-w-sm">
                          Use the product search bar above or scan barcodes to add items.
                        </p>
                      </div>
                    ) : (
                      <div className="table-container overflow-x-auto">
                        <table id="bill-items-table" className="table-base">
                          <thead>
                            <tr className="table-header">
                              <th className="table-th w-10 text-center">#</th>
                              <th className="table-th">Item Description</th>
                              <th className="table-th text-center w-24">MRP (₹)</th>
                              <th className="table-th text-center w-28">Quantity</th>
                              <th className="table-th text-center w-28">Price/Unit (₹)</th>
                              <th className="table-th text-right w-28">Total (₹)</th>
                              <th className="table-th w-12 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={item.id} className="table-row">
                                <td className="table-td text-center text-muted font-medium">{idx + 1}</td>
                                <td className="table-td font-semibold text-text-primary">
                                  <span>{item.name}</span>
                                </td>
                                <td className="table-td text-center text-muted text-small">
                                  ₹{item.mrp.toFixed(2)}
                                </td>
                                <td className="table-td text-center">
                                  <input
                                    ref={(el) => {
                                      quantityInputRefs.current[idx] = el;
                                    }}
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={item.quantity}
                                    onChange={(e) => updateItemRow(idx, 'quantity', parseFloat(e.target.value))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        priceInputRefs.current[idx]?.focus();
                                        priceInputRefs.current[idx]?.select();
                                      }
                                    }}
                                    className="input-base h-8 text-center font-bold w-20"
                                  />
                                </td>
                                <td className="table-td text-center">
                                  <input
                                    ref={(el) => {
                                      priceInputRefs.current[idx] = el;
                                    }}
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.selling_price}
                                    onChange={(e) => updateItemRow(idx, 'selling_price', parseFloat(e.target.value))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (idx + 1 < items.length) {
                                          quantityInputRefs.current[idx + 1]?.focus();
                                          quantityInputRefs.current[idx + 1]?.select();
                                        } else {
                                          customerSearchInputRef.current?.focus();
                                          customerSearchInputRef.current?.select();
                                        }
                                      }
                                    }}
                                    className="input-base h-8 text-center font-bold w-24"
                                  />
                                </td>
                                <td className="table-td text-right font-bold text-primary">
                                  ₹{item.row_total.toFixed(2)}
                                </td>
                                <td className="table-td text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeItemRow(idx)}
                                    className="btn-base btn-ghost btn-icon-sm text-danger hover:bg-danger-bg"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Customer & Payment Summary (4 Cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* 1. Customer Section */}
                  <div id="customer-section-card" className="card-base card-overflow-visible p-4 relative z-20">
                    <div className="layout-flex-between mb-2">
                      <label htmlFor="customer-search-input" className="form-label flex items-center gap-1.5 mb-0">
                        <User className="w-4 h-4 text-primary" />
                        <span>Customer Details</span>
                      </label>
                      <button
                        id="quick-add-customer-btn"
                        type="button"
                        onClick={() => setQuickCustomerModalOpen(true)}
                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        ref={customerSearchInputRef}
                        id="customer-search-input"
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={customerQuery}
                        onChange={(e) => handleCustomerQueryChange(e.target.value)}
                        onKeyDown={handleCustomerSearchKeyDown}
                        onFocus={() => setShowCustomerDropdown(customerQuery.trim().length > 0 && !selectedCustomer)}
                        className="input-base text-sm"
                        autoComplete="off"
                      />

                      {/* Customer Dropdown */}
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div
                          id="customer-search-dropdown"
                          className="dropdown-panel absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto"
                        >
                          {filteredCustomers.map((c, idx) => (
                            <div
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className={`p-2.5 layout-flex-between cursor-pointer border-b border-subtle last:border-none text-xs transition-colors ${
                                idx === selectedCustomerIndex
                                  ? 'bg-primary-light text-primary font-semibold'
                                  : 'hover:bg-surface-hover bg-surface'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-primary">{c.name}</div>
                                <div className="text-muted">{c.mobile || 'No Mobile'}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-caption text-muted">Pts: {c.points || 0}</div>
                                {(c.credit || 0) > 0 && (
                                  <div className="text-caption text-warning font-bold">Credit: ₹{c.credit}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Customer Card Badge */}
                    {selectedCustomer && (
                      <div className="mt-3 p-2.5 bg-surface-subtle border border-border rounded-lg text-xs flex flex-col gap-1">
                        <div className="layout-flex-between">
                          <span className="font-bold text-primary flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{selectedCustomer.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerQuery('');
                            }}
                            className="text-muted hover:text-danger"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-muted">{selectedCustomer.mobile || 'No mobile number'}</div>
                        <div className="layout-flex-between pt-1 border-t border-subtle">
                          <span>
                            Loyalty Points: <strong>{selectedCustomer.points || 0}</strong>
                          </span>
                          <span className={(selectedCustomer.credit || 0) > 0 ? 'text-warning font-bold' : ''}>
                            Credit: ₹{Number(selectedCustomer.credit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Payment & Total Calculation Card */}
                  <div id="payment-calculation-card" className="card-base p-4 flex flex-col gap-3">
                    <h3 className="text-card-title font-bold flex items-center gap-1.5 pb-2 border-b border-subtle">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span>Payment Summary</span>
                    </h3>

                    {/* Subtotal */}
                    <div className="layout-flex-between text-sm">
                      <span className="text-secondary">Subtotal</span>
                      <span className="font-semibold text-text-primary">₹{subtotal.toFixed(2)}</span>
                    </div>

                    {/* Discount Input */}
                    <div className="layout-flex-between text-sm items-center">
                      <label htmlFor="bill-discount-input" className="text-secondary cursor-pointer">
                        Discount (₹)
                      </label>
                      <input
                        ref={discountInputRef}
                        id="bill-discount-input"
                        type="number"
                        min="0"
                        step="any"
                        value={discount === 0 ? '' : discount}
                        placeholder="0.00"
                        onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            cashAmountInputRef.current?.focus();
                            cashAmountInputRef.current?.select();
                          }
                        }}
                        className="input-base h-8 w-28 text-right font-bold"
                      />
                    </div>

                    {/* Total Amount */}
                    <div className="layout-flex-between p-3 bg-primary-light rounded-lg border border-primary-light">
                      <span className="text-section-title font-bold text-primary">Final Total</span>
                      <span className="text-section-title font-bold text-primary">₹{total.toFixed(2)}</span>
                    </div>

                    {/* Payment Amounts (Cash, UPI, Credit) */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-subtle">
                      <div className="flex items-center justify-between">
                        <label className="form-label text-xs font-bold mb-0 flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-primary" />
                          <span>Payment Amounts (₹)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setCashAmount(total > 0 ? String(total) : '');
                            setUpiAmount('');
                            setCreditAmount('');
                          }}
                          className="text-xs text-primary hover:underline cursor-pointer"
                        >
                          Set Full Cash
                        </button>
                      </div>

                      {/* Cash Input */}
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="bill-cash-amount-input" className="text-xs font-semibold text-secondary flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Cash</span>
                        </label>
                        <input
                          ref={cashAmountInputRef}
                          id="bill-cash-amount-input"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              upiAmountInputRef.current?.focus();
                              upiAmountInputRef.current?.select();
                            }
                          }}
                          className="input-base h-8 w-32 text-right font-bold"
                        />
                      </div>

                      {/* UPI Input */}
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="bill-upi-amount-input" className="text-xs font-semibold text-secondary flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>UPI</span>
                        </label>
                        <input
                          ref={upiAmountInputRef}
                          id="bill-upi-amount-input"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={upiAmount}
                          onChange={(e) => setUpiAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              creditAmountInputRef.current?.focus();
                              creditAmountInputRef.current?.select();
                            }
                          }}
                          className="input-base h-8 w-32 text-right font-bold"
                        />
                      </div>

                      {/* Credit Input */}
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="bill-credit-amount-input" className="text-xs font-semibold text-warning flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Credit</span>
                        </label>
                        <input
                          ref={creditAmountInputRef}
                          id="bill-credit-amount-input"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveBtnRef.current?.focus();
                            }
                          }}
                          className="input-base h-8 w-32 text-right font-bold border-warning"
                        />
                      </div>
                    </div>

                    {/* Quick Mode Presets */}
                    <div className="flex flex-col gap-1.5">
                      <label className="form-label text-xs">Quick Mode Presets</label>
                      <div id="payment-mode-selector" className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          id="pay-mode-cash-btn"
                          onClick={() => {
                            setPaymentMode('cash');
                            setCashAmount(total > 0 ? String(total) : '');
                            setUpiAmount('');
                            setCreditAmount('');
                            cashAmountInputRef.current?.focus();
                          }}
                          className={`btn-base py-2 flex flex-col items-center justify-center gap-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            paymentMode === 'cash'
                              ? 'bg-primary text-inverted border-primary shadow-sm'
                              : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Cash</span>
                        </button>

                        <button
                          type="button"
                          id="pay-mode-upi-btn"
                          onClick={() => {
                            setPaymentMode('upi');
                            setUpiAmount(total > 0 ? String(total) : '');
                            setCashAmount('');
                            setCreditAmount('');
                            upiAmountInputRef.current?.focus();
                          }}
                          className={`btn-base py-2 flex flex-col items-center justify-center gap-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            paymentMode === 'upi'
                              ? 'bg-primary text-inverted border-primary shadow-sm'
                              : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>UPI</span>
                        </button>

                        <button
                          type="button"
                          id="pay-mode-credit-btn"
                          onClick={() => {
                            setPaymentMode('credit');
                            setCreditAmount(total > 0 ? String(total) : '');
                            setCashAmount('');
                            setUpiAmount('');
                            creditAmountInputRef.current?.focus();
                          }}
                          className={`btn-base py-2 flex flex-col items-center justify-center gap-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            paymentMode === 'credit'
                              ? 'bg-warning text-inverted border-warning shadow-sm'
                              : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Credit</span>
                        </button>
                      </div>

                      {(paymentMode === 'credit' || parseFloat(creditAmount) > 0) && (
                        <p className="text-caption text-warning mt-1">
                          * Credit sale will automatically update customer ledger & credit balance.
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: Save & Print, Save Only, Draft */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-subtle">
                      <button
                        ref={saveBtnRef}
                        id="save-and-print-bill-btn"
                        type="button"
                        disabled={saving}
                        onClick={() => handleUpdateBill('completed', true)}
                        className="btn-base btn-primary py-2.5 font-bold layout-flex-center gap-2 cursor-pointer shadow-sm hover:shadow"
                      >
                        <Printer className="w-4 h-4" />
                        <span>{saving ? 'Updating...' : 'Save & Print'}</span>
                      </button>

                      <button
                        id="save-only-bill-btn"
                        type="button"
                        disabled={saving}
                        onClick={() => handleUpdateBill('completed', false)}
                        className="btn-base btn-secondary py-2.5 font-bold layout-flex-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Updating...' : 'Save Only'}</span>
                      </button>

                      <button
                        id="save-draft-bill-btn"
                        type="button"
                        disabled={saving}
                        onClick={() => handleUpdateBill('draft', false)}
                        className="btn-base btn-outline py-2 text-xs font-semibold layout-flex-center gap-1.5 cursor-pointer text-muted hover:text-primary"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Save as Draft</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScan}
        />
      )}

      {/* Quick Add Customer Modal */}
      {quickCustomerModalOpen && (
        <div id="quick-customer-modal" className="modal-backdrop">
          <div className="modal-container max-w-md w-full animate-scale-in">
            <div className="modal-header">
              <h3 className="text-section-title font-bold">Add New Customer</h3>
              <button
                type="button"
                onClick={() => setQuickCustomerModalOpen(false)}
                className="btn-base btn-ghost btn-icon-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer}>
              <div className="modal-body space-y-4">
                {quickCustError && (
                  <div className="p-2.5 bg-danger-bg text-danger-text text-xs rounded-md">
                    {quickCustError}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="quick-cust-name-input" className="form-label">
                    Customer Name *
                  </label>
                  <input
                    id="quick-cust-name-input"
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={quickCustName}
                    onChange={(e) => setQuickCustName(e.target.value)}
                    className="input-base"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quick-cust-mobile-input" className="form-label">
                    Mobile Number (Optional)
                  </label>
                  <input
                    id="quick-cust-mobile-input"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={quickCustMobile}
                    onChange={(e) => setQuickCustMobile(e.target.value)}
                    className="input-base"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setQuickCustomerModalOpen(false)}
                  className="btn-base btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-base btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Printable Invoice Section for Window.print() */}
      <div id="printable-bill-receipt" className="hidden print:block p-8 bg-white text-black">
        <div className="text-center pb-4 border-b border-black">
          <h1 className="text-2xl font-bold">DS DRY FRUITS</h1>
          <p className="text-sm">Premium Dry Fruits, Nuts, Berries & Spices</p>
          <p className="text-xs mt-1">
            Bill #: {originalBill ? originalBill.bill_id : ''} | Date:{' '}
            {originalBill ? new Date(originalBill.created_at).toLocaleString('en-IN') : new Date().toLocaleString()}
          </p>
        </div>

        {selectedCustomer && (
          <div className="py-2 border-b border-black text-xs">
            <p>
              <strong>Customer:</strong> {selectedCustomer.name}
            </p>
            {selectedCustomer.mobile && (
              <p>
                <strong>Mobile:</strong> {selectedCustomer.mobile}
              </p>
            )}
          </div>
        )}

        <table className="w-full text-xs my-4 border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Rate</th>
              <th className="text-right py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-1">{it.name}</td>
                <td className="text-center py-1">{it.quantity}</td>
                <td className="text-right py-1">₹{it.selling_price.toFixed(2)}</td>
                <td className="text-right py-1">₹{it.row_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-xs text-right space-y-1 pt-2 border-t border-black">
          <p>
            Subtotal: <strong>₹{subtotal.toFixed(2)}</strong>
          </p>
          {discount > 0 && <p>Discount: -₹{discount.toFixed(2)}</p>}
          <p className="text-sm font-bold">
            Total Payable: ₹{total.toFixed(2)}
          </p>
        </div>

        <div className="text-center text-xs mt-8 pt-4 border-t border-dashed border-gray-400">
          <p>Thank you for shopping with DS Dry Fruits!</p>
          <p>Visit Again</p>
        </div>
      </div>
    </div>
  );
}

export default function OpenBillPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-app">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <OpenBillInner />
    </Suspense>
  );
}
