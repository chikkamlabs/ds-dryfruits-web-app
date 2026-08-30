'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { getProducts } from '@/lib/productsStore';
import { getCustomers, createCustomer } from '@/lib/customersStore';
import { createBill } from '@/lib/createorderStore';
import type { Product, Customer, PaymentMode, BillStatus } from '@/lib/types';

interface BilledRowItem {
  id: string; // unique row id
  product_id: string;
  name: string;
  discount: number;
  mrp: number;
  quantity: number;
  selling_price: number;
  row_total: number;
}

export default function CreateBillPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data sources
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
  const [cashAmount, setCashAmount] = useState<string>('');
  const [upiAmount, setUpiAmount] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');

  // Input refs for keyboard navigation
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const discountInputRef = useRef<HTMLInputElement | null>(null);
  const cashAmountInputRef = useRef<HTMLInputElement | null>(null);
  const upiAmountInputRef = useRef<HTMLInputElement | null>(null);
  const creditAmountInputRef = useRef<HTMLInputElement | null>(null);
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);
  const saveOnlyBtnRef = useRef<HTMLButtonElement | null>(null);

  // State refs for auto-drafting when unmounting / coming out
  const itemsRef = useRef<BilledRowItem[]>([]);
  const customerRef = useRef<Customer | null>(null);
  const discountRef = useRef<number>(0);
  const isSavedRef = useRef<boolean>(false);

  // Sync refs with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    customerRef.current = selectedCustomer;
  }, [selectedCustomer]);

  useEffect(() => {
    discountRef.current = discount;
  }, [discount]);

  // Refs map for grid items: quantityRefs[rowIndex] and priceRefs[rowIndex]
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-draft on unmount / navigation away if unsaved items exist
  const autoDraftBill = useCallback(async () => {
    if (isSavedRef.current || itemsRef.current.length === 0) return;

    const currentItems = itemsRef.current;
    const currentCustomer = customerRef.current;
    const currentDiscount = discountRef.current;
    const currentSubtotal = currentItems.reduce((acc, curr) => acc + curr.row_total, 0);
    const currentTotal = Math.max(0, currentSubtotal - (Number(currentDiscount) || 0));

    try {
      await createBill({
        customer_id: currentCustomer ? currentCustomer.id : null,
        subtotal: currentSubtotal,
        discount: Number(currentDiscount) || 0,
        total: currentTotal,
        status: 'draft',
        items: currentItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          mrp: it.mrp,
          discount: Number(it.discount) || 0,
          selling_price: it.selling_price,
          row_total: it.row_total,
        })),
      });
    } catch {
      // Non-blocking auto-draft
    }
  }, []);

  useEffect(() => {
    return () => {
      // Auto-draft if user leaves page without saving
      autoDraftBill();
    };
  }, [autoDraftBill]);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([getProducts(), getCustomers()]);
      if (prodRes.data) {
        setProducts(prodRes.data);
      }
      if (custRes.data) {
        setCustomers(custRes.data);
      }
      setLoading(false);
      // Focus product search on initial load
      setTimeout(() => {
        productSearchInputRef.current?.focus();
      }, 100);
    }
    loadData();
  }, []);

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

  // Update dropdown display whenever search input changes
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

  // Add product to bill (or increment quantity if already present to avoid duplication)
  const addProductToBill = (prod: Product) => {
    const existingIndex = items.findIndex((it) => it.product_id === prod.id);

    if (existingIndex > -1) {
      // Product already in bill: increment quantity and recalculate row total
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

      // Focus quantity input of the existing item
      setTimeout(() => {
        quantityInputRefs.current[existingIndex]?.focus();
        quantityInputRefs.current[existingIndex]?.select();
      }, 50);

      setProductQuery('');
      setShowProductDropdown(false);
      return;
    }

    // New item to be added
    const prodMrp = Number(prod.mrp) || 0;
    const prodDiscount = Number(prod.discount) || 0;
    const prodSellingPrice = Number(prod.selling_price) || 0;

    let initialDiscount = prodDiscount;
    let initialSellingPrice = prodSellingPrice;

    if (initialDiscount > 0 && prodMrp > 0) {
      initialSellingPrice = Number((prodMrp * (1 - initialDiscount / 100)).toFixed(2));
    } else if (initialSellingPrice > 0 && prodMrp > 0 && initialSellingPrice < prodMrp && initialDiscount === 0) {
      initialDiscount = Number((((prodMrp - initialSellingPrice) / prodMrp) * 100).toFixed(2));
    } else if (initialSellingPrice === 0 && prodMrp > 0) {
      initialSellingPrice = prodMrp;
    }

    const newItem: BilledRowItem = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: prod.id,
      name: prod.name,
      discount: initialDiscount,
      mrp: prodMrp,
      quantity: 1,
      selling_price: initialSellingPrice,
      row_total: Number((initialSellingPrice * 1).toFixed(2)),
    };

    setItems((prev) => {
      const nextItems = [...prev, newItem];
      const newIndex = nextItems.length - 1;
      // Focus quantity of the newly added row
      setTimeout(() => {
        quantityInputRefs.current[newIndex]?.focus();
        quantityInputRefs.current[newIndex]?.select();
      }, 50);
      return nextItems;
    });

    setProductQuery('');
    setShowProductDropdown(false);
  };

  // Handle Barcode Scanned
  const handleBarcodeScanned = (scannedCode: string) => {
    setScannerOpen(false);
    const trimmed = scannedCode.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed) ||
        p.product_id.toLowerCase() === trimmed ||
        p.name.toLowerCase() === trimmed
    );

    if (found) {
      addProductToBill(found);
    } else {
      setProductQuery(scannedCode);
      setFeedback({
        type: 'error',
        message: `Product with barcode "${scannedCode}" not found. You can search by name.`,
      });
    }
  };

  // Handle Product Search Key Navigation
  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setShowProductDropdown(true);
        setSelectedProductIndex((prev) => {
          const nextIdx = (prev + 1) % filteredProducts.length;
          setTimeout(() => {
            document.getElementById(`product-opt-${filteredProducts[nextIdx]?.id}`)?.scrollIntoView({
              block: 'nearest',
            });
          }, 10);
          return nextIdx;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setShowProductDropdown(true);
        setSelectedProductIndex((prev) => {
          const nextIdx = (prev - 1 + filteredProducts.length) % filteredProducts.length;
          setTimeout(() => {
            document.getElementById(`product-opt-${filteredProducts[nextIdx]?.id}`)?.scrollIntoView({
              block: 'nearest',
            });
          }, 10);
          return nextIdx;
        });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0 && showProductDropdown) {
        const prod = filteredProducts[selectedProductIndex] || filteredProducts[0];
        if (prod) {
          addProductToBill(prod);
        }
      } else if (items.length > 0) {
        // If query is empty and Enter is pressed, navigate to first row quantity
        quantityInputRefs.current[0]?.focus();
        quantityInputRefs.current[0]?.select();
      }
    } else if (e.key === 'Escape') {
      setShowProductDropdown(false);
    }
  };

  // Handle Quantity Change
  const updateQuantity = (rowIndex: number, newQty: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = updated[rowIndex];
      if (row) {
        const safeQty = Math.max(0.001, newQty);
        row.quantity = safeQty;
        row.row_total = Number((safeQty * row.selling_price).toFixed(2));
      }
      return updated;
    });
  };

  // Handle Discount % Change
  const updateDiscount = (rowIndex: number, newDiscount: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = updated[rowIndex];
      if (row) {
        const safeDiscount = Math.max(0, Math.min(100, newDiscount));
        row.discount = safeDiscount;
        const calculatedSellingPrice = Number((row.mrp * (1 - safeDiscount / 100)).toFixed(2));
        row.selling_price = calculatedSellingPrice;
        row.row_total = Number((row.quantity * calculatedSellingPrice).toFixed(2));
      }
      return updated;
    });
  };

  // Handle Selling Price Change
  const updateSellingPrice = (rowIndex: number, newPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = updated[rowIndex];
      if (row) {
        const safePrice = Math.max(0, newPrice);
        row.selling_price = safePrice;
        if (row.mrp > 0 && safePrice <= row.mrp) {
          row.discount = Number((((row.mrp - safePrice) / row.mrp) * 100).toFixed(2));
        }
        row.row_total = Number((row.quantity * safePrice).toFixed(2));
      }
      return updated;
    });
  };

  // Remove Row Item
  const removeItem = (rowIndex: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== rowIndex));
    productSearchInputRef.current?.focus();
  };

  // Table Keyboard Navigation for Quantity and Selling Price
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      priceInputRefs.current[rowIndex]?.focus();
      priceInputRefs.current[rowIndex]?.select();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < items.length - 1) {
        quantityInputRefs.current[rowIndex + 1]?.focus();
        quantityInputRefs.current[rowIndex + 1]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        quantityInputRefs.current[rowIndex - 1]?.focus();
        quantityInputRefs.current[rowIndex - 1]?.select();
      } else {
        productSearchInputRef.current?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      // Left on quantity goes back to product search
      e.preventDefault();
      productSearchInputRef.current?.focus();
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex === items.length - 1) {
        // Last product selling price Enter -> Go to Customer section
        customerSearchInputRef.current?.focus();
      } else {
        // Go to next row quantity
        quantityInputRefs.current[rowIndex + 1]?.focus();
        quantityInputRefs.current[rowIndex + 1]?.select();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      quantityInputRefs.current[rowIndex]?.focus();
      quantityInputRefs.current[rowIndex]?.select();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < items.length - 1) {
        priceInputRefs.current[rowIndex + 1]?.focus();
        priceInputRefs.current[rowIndex + 1]?.select();
      } else {
        customerSearchInputRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        priceInputRefs.current[rowIndex - 1]?.focus();
        priceInputRefs.current[rowIndex - 1]?.select();
      }
    }
  };

  // Customer Search Key Navigation
  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setSelectedCustomerIndex((prev) => (prev + 1) % filteredCustomers.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setSelectedCustomerIndex((prev) => (prev - 1 + filteredCustomers.length) % filteredCustomers.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers.length > 0 && showCustomerDropdown) {
        const cust = filteredCustomers[selectedCustomerIndex] || filteredCustomers[0];
        if (cust) {
          selectCustomer(cust);
        }
      } else if (customerQuery.trim() && filteredCustomers.length === 0) {
        // Open quick add customer if no match
        setQuickCustName(isNaN(Number(customerQuery)) ? customerQuery : '');
        setQuickCustMobile(!isNaN(Number(customerQuery)) ? customerQuery : '');
        setQuickCustomerModalOpen(true);
      } else {
        // Move focus to discount or payment
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      }
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerQuery(`${cust.name} (${cust.mobile || 'No mobile'})`);
    setShowCustomerDropdown(false);
    // Focus discount input next
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

    // Update customers list and select this customer
    setCustomers((prev) => [data, ...prev]);
    selectCustomer(data);
    setQuickCustomerModalOpen(false);
    setQuickCustName('');
    setQuickCustMobile('');
    setQuickCustError('');
  };

  // Submit Bill (Draft or Completed Save & Print)
  const handleSaveBill = async (status: BillStatus, printAfterSave = false) => {
    if (items.length === 0) {
      setFeedback({ type: 'error', message: 'Please add at least one product before saving.' });
      return;
    }

    // Determine payment entries
    const cAmt = parseFloat(cashAmount) || 0;
    const uAmt = parseFloat(upiAmount) || 0;
    const crAmt = parseFloat(creditAmount) || 0;
    const totalAllocated = cAmt + uAmt + crAmt;
    const remainingToPay = Math.round((total - totalAllocated) * 100) / 100;

    if (status === 'completed' && Math.abs(remainingToPay) >= 0.01) {
      setFeedback({
        type: 'error',
        message: `Payment not fully settled. Remaining amount must be ₹0.00 (Currently: ₹${remainingToPay.toFixed(2)}) to save.`,
      });
      return;
    }

    const paymentsList: { mode: PaymentMode; amount: number }[] = [];
    if (cAmt > 0) paymentsList.push({ mode: 'cash', amount: cAmt });
    if (uAmt > 0) paymentsList.push({ mode: 'upi', amount: uAmt });
    if (crAmt > 0) paymentsList.push({ mode: 'credit', amount: crAmt });

    // If total is 0, allow 0 cash payment
    if (paymentsList.length === 0 && total === 0 && status === 'completed') {
      paymentsList.push({ mode: 'cash', amount: 0 });
    }

    const hasCredit = paymentsList.some((p) => p.mode === 'credit' && p.amount > 0);
    if (hasCredit && !selectedCustomer && status === 'completed') {
      setFeedback({
        type: 'error',
        message: 'A customer must be selected to complete a Credit payment transaction.',
      });
      customerSearchInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setFeedback(null);

    const primaryMode: PaymentMode = (paymentsList[0]?.mode as PaymentMode) || 'cash';

    const billPayload = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      subtotal,
      discount: Number(discount) || 0,
      total,
      status,
      payments: status === 'completed' ? paymentsList : undefined,
      paymentMode: status === 'completed' ? primaryMode : undefined,
      paymentAmount: status === 'completed' ? (paymentsList.reduce((acc, p) => acc + p.amount, 0)) : 0,
      items: items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        mrp: it.mrp,
        discount: Number(it.discount) || 0,
        selling_price: it.selling_price,
        row_total: it.row_total,
      })),
    };

    const res = await createBill(billPayload);

    setSaving(false);

    if (res.error || !res.data) {
      setFeedback({ type: 'error', message: res.error || 'Failed to save bill.' });
    } else {
      isSavedRef.current = true;
      setFeedback({
        type: 'success',
        message: `Bill #${res.data.bill_id} ${status === 'completed' ? 'created successfully!' : 'saved as draft.'}`,
      });

      if (printAfterSave) {
        window.print();
      }

      // Reset form for next customer bill
      setTimeout(() => {
        setItems([]);
        setSelectedCustomer(null);
        setCustomerQuery('');
        setDiscount(0);
        setCashAmount('');
        setUpiAmount('');
        setCreditAmount('');
        isSavedRef.current = false;
        productSearchInputRef.current?.focus();
      }, 1200);
    }
  };

  // Exit handler that triggers auto draft if items exist
  const handleBackToDashboard = async () => {
    if (items.length > 0 && !isSavedRef.current) {
      await autoDraftBill();
    }
    router.push('/admin/dashboard');
  };

  return (
    <div id="create-bill-layout" className="layout-page-container h-screen overflow-hidden">
      {/* Header */}
      <AdminHeader onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />

      {/* Main Body */}
      <div id="create-bill-body" className="flex flex-1 overflow-hidden">
        <AdminSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        <main id="create-bill-main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="layout-responsive-container max-w-7xl mx-auto flex flex-col gap-5">
            {/* Top Bar: Title & Navigation */}
            <div className="layout-flex-between">
              <div className="layout-flex-start gap-3">
                <button
                  id="back-to-dashboard-btn"
                  type="button"
                  onClick={handleBackToDashboard}
                  className="btn-base btn-secondary btn-icon-sm"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 id="create-bill-page-title" className="text-page-title">
                    Create Bill
                  </h1>
                  <p className="text-subtitle">
                    Fast POS Billing with barcode scanning and arrow key navigation
                  </p>
                </div>
              </div>

              {/* Status Alert */}
              {feedback && (
                <div
                  id="billing-feedback-banner"
                  className={`badge-base px-3 py-1.5 text-xs font-semibold flex items-center gap-2 ${
                    feedback.type === 'success' ? 'badge-success' : 'badge-danger'
                  } animate-fade-in`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}
            </div>

            {/* Grid Layout: Left (Product Search & Line Items) vs Right (Customer & Payment Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: Products & Table (8 Cols) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* 1. Scan / Search Product Bar with overflow-visible & z-30 */}
                <div id="product-search-card" className="card-base card-overflow-visible p-4 relative z-30">
                  <label htmlFor="product-search-input" className="form-label mb-1.5 flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    <span>Scan Barcode or Search Product (Name, ID, Barcode)</span>
                  </label>

                  <div className="flex items-center gap-2 relative">
                    <div className="relative flex-1">
                      <input
                        ref={productSearchInputRef}
                        id="product-search-input"
                        type="text"
                        value={productQuery}
                        onChange={(e) => handleProductQueryChange(e.target.value)}
                        onFocus={() => {
                          if (productQuery.trim().length > 0) setShowProductDropdown(true);
                        }}
                        onKeyDown={handleProductSearchKeyDown}
                        placeholder="Scan barcode or type product name (e.g. Almond, Cashew)..."
                        className="input-base pr-10 font-medium"
                        autoComplete="off"
                      />
                      {productQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductQuery('');
                            setShowProductDropdown(false);
                            productSearchInputRef.current?.focus();
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Scan Barcode Modal Button */}
                    <button
                      id="open-barcode-scanner-btn"
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="btn-base btn-primary px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs"
                      title="Open Live Camera Scanner"
                    >
                      <Barcode className="w-4 h-4" />
                      <span className="hidden sm:inline text-sm">Scan</span>
                    </button>

                    {/* Product Search Dropdown - Elevated with solid light background and z-50 */}
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div
                        id="product-search-dropdown"
                        className="dropdown-panel absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto shadow-lg rounded-lg border border-border bg-surface"
                      >
                        {filteredProducts.map((p, idx) => (
                          <div
                            key={p.id}
                            id={`product-opt-${p.id}`}
                            onClick={() => addProductToBill(p)}
                            onMouseEnter={() => setSelectedProductIndex(idx)}
                            className={`p-3 layout-flex-between cursor-pointer border-b border-subtle last:border-none transition-all ${
                              idx === selectedProductIndex
                                ? 'bg-primary-light text-primary font-semibold ring-2 ring-inset ring-primary'
                                : 'hover:bg-surface-hover bg-surface'
                            }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                {idx === selectedProductIndex && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                                )}
                                <span className="text-body font-medium text-primary">{p.name}</span>
                              </div>
                              <span className="text-small text-muted flex items-center gap-2">
                                <span>Code: {p.product_id}</span>
                                {p.barcode && <span>• Barcode: {p.barcode}</span>}
                                <span>• Stock: {p.retail_quantity} in retail</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-body font-bold text-primary">₹{p.selling_price}</div>
                              <div className="text-caption line-through text-muted">MRP: ₹{p.mrp}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Selected Products Table */}
                <div id="billed-items-card" className="card-base">
                  <div className="card-header">
                    <h3 className="text-card-title flex items-center gap-2">
                      <span>Billed Items</span>
                      <span className="badge-base badge-secondary">{items.length}</span>
                    </h3>
                    <span className="text-caption text-muted">
                      Use Arrow Keys (<kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>) to navigate fields
                    </span>
                  </div>

                  <div className="table-container border-none shadow-none rounded-none">
                    <table id="billing-items-table" className="table-base">
                      <thead className="table-header">
                        <tr>
                          <th className="table-th w-12 text-center">S.No</th>
                          <th className="table-th">Product Name</th>
                          <th className="table-th w-24 text-center">Discount (%)</th>
                          <th className="table-th w-24 text-right">MRP (₹)</th>
                          <th className="table-th w-32 text-center">Quantity</th>
                          <th className="table-th w-32 text-right">Selling Price (₹)</th>
                          <th className="table-th w-28 text-right">Row Total (₹)</th>
                          <th className="table-th w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-muted text-body">
                              No products added to bill yet. Scan a barcode or search a product above.
                            </td>
                          </tr>
                        ) : (
                          items.map((row, index) => (
                            <tr key={row.id} id={`bill-row-${index}`} className="table-row">
                              <td className="table-td text-center font-semibold text-muted">
                                {index + 1}
                              </td>
                              <td className="table-td font-medium">
                                <span className="text-body">{row.name}</span>
                              </td>
                              <td className="table-td text-center">
                                <input
                                  id={`bill-row-discount-${index}`}
                                  type="number"
                                  step="any"
                                  min="0"
                                  max="100"
                                  value={row.discount}
                                  onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="input-base h-8 text-center font-bold px-1 w-20"
                                />
                              </td>
                              <td className="table-td text-right text-muted">
                                ₹{row.mrp.toFixed(2)}
                              </td>
                              <td className="table-td text-center">
                                <input
                                  ref={(el) => {
                                    quantityInputRefs.current[index] = el;
                                  }}
                                  id={`bill-row-qty-${index}`}
                                  type="number"
                                  step="any"
                                  min="0.001"
                                  value={row.quantity}
                                  onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                  onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                                  className="input-base h-8 text-center font-bold px-1"
                                />
                              </td>
                              <td className="table-td text-right">
                                <input
                                  ref={(el) => {
                                    priceInputRefs.current[index] = el;
                                  }}
                                  id={`bill-row-price-${index}`}
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.selling_price}
                                  onChange={(e) => updateSellingPrice(index, parseFloat(e.target.value) || 0)}
                                  onKeyDown={(e) => handlePriceKeyDown(e, index)}
                                  className="input-base h-8 text-right font-bold px-2"
                                />
                              </td>
                              <td className="table-td text-right font-bold text-primary">
                                ₹{row.row_total.toFixed(2)}
                              </td>
                              <td className="table-td text-center">
                                <button
                                  type="button"
                                  id={`delete-row-btn-${index}`}
                                  onClick={() => removeItem(index)}
                                  className="btn-base btn-ghost btn-icon-sm text-danger hover:bg-danger-bg cursor-pointer"
                                  title="Remove Item"
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
                </div>
              </div>

              {/* RIGHT COLUMN: Customer & Payment Summary (4 Cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* 1. Customer Section (Top Right) with overflow-visible & z-20 */}
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
                      className="btn-base btn-secondary btn-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Quick Add</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      ref={customerSearchInputRef}
                      id="customer-search-input"
                      type="text"
                      value={customerQuery}
                      onChange={(e) => handleCustomerQueryChange(e.target.value)}
                      onFocus={() => {
                        if (customerQuery.trim().length > 0) setShowCustomerDropdown(true);
                      }}
                      onKeyDown={handleCustomerSearchKeyDown}
                      placeholder="Search Name or Mobile (Enter to select)"
                      className="input-base text-sm font-medium"
                      autoComplete="off"
                    />

                    {/* Customer Dropdown - Elevated with solid light background and z-50 */}
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div
                        id="customer-search-dropdown"
                        className="dropdown-panel absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto"
                      >
                        {filteredCustomers.map((c, idx) => (
                          <div
                            key={c.id}
                            id={`customer-opt-${c.id}`}
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
                              <div className="badge-base badge-info text-caption">
                                Points: {c.points}
                              </div>
                              <div className="badge-base badge-warning text-caption mt-0.5">
                                Credit: ₹{c.credit}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Customer Card Preview */}
                  {selectedCustomer && (
                    <div id="selected-customer-box" className="mt-3 p-3 bg-surface-subtle border border-border rounded-md animate-fade-in">
                      <div className="layout-flex-between">
                        <span className="text-card-title text-sm font-bold text-primary">
                          {selectedCustomer.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerQuery('');
                            customerSearchInputRef.current?.focus();
                          }}
                          className="text-xs text-danger hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="text-small text-muted mt-1">
                        Mobile: {selectedCustomer.mobile || 'None'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-subtle">
                        <div className="bg-surface p-2 rounded border border-subtle text-center">
                          <span className="text-caption block text-muted">Loyalty Points</span>
                          <span className="text-sm font-bold text-info">{selectedCustomer.points}</span>
                        </div>
                        <div className="bg-surface p-2 rounded border border-subtle text-center">
                          <span className="text-caption block text-muted">Current Credit</span>
                          <span className="text-sm font-bold text-warning">₹{selectedCustomer.credit}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Payment & Bill Calculation Summary */}
                <div id="payment-summary-card" className="card-base p-5 flex flex-col gap-4">
                  <h3 className="text-card-title pb-2 border-b border-subtle">
                    Payment & Totals
                  </h3>

                  {/* Calculations */}
                  <div className="flex flex-col gap-2.5 text-sm">
                    <div className="layout-flex-between">
                      <span className="text-secondary">Subtotal</span>
                      <span className="font-semibold text-primary">₹{subtotal.toFixed(2)}</span>
                    </div>

                    <div className="layout-flex-between items-center">
                      <label htmlFor="bill-discount-input" className="text-secondary cursor-pointer">
                        Discount (₹)
                      </label>
                      <input
                        ref={discountInputRef}
                        id="bill-discount-input"
                        type="number"
                        min="0"
                        step="any"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            cashAmountInputRef.current?.focus();
                            cashAmountInputRef.current?.select();
                          }
                        }}
                        className="input-base h-8 w-28 text-right font-bold"
                      />
                    </div>

                    <div className="layout-flex-between pt-2 border-t border-border text-base">
                      <span className="font-bold text-primary">Total Amount</span>
                      <span className="text-stat-number text-xl font-bold text-primary">
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Breakdown: Cash, UPI, Credit */}
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
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            discountInputRef.current?.focus();
                            discountInputRef.current?.select();
                          } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
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
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            cashAmountInputRef.current?.focus();
                            cashAmountInputRef.current?.select();
                          } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
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
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            upiAmountInputRef.current?.focus();
                            upiAmountInputRef.current?.select();
                          } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            saveBtnRef.current?.focus();
                          }
                        }}
                        className="input-base h-8 w-32 text-right font-bold border-warning"
                      />
                    </div>

                    {/* Total Split & Remaining Indicator */}
                    {(() => {
                      const enteredCash = parseFloat(cashAmount) || 0;
                      const enteredUpi = parseFloat(upiAmount) || 0;
                      const enteredCredit = parseFloat(creditAmount) || 0;
                      const totalEntered = enteredCash + enteredUpi + enteredCredit;
                      const remainingAmount = Math.round((total - totalEntered) * 100) / 100;
                      const isRemainingZero = items.length > 0 && Math.abs(remainingAmount) < 0.01;

                      return (
                        <div className="flex flex-col gap-1 pt-1.5 border-t border-subtle">
                          <div className="text-xs flex justify-between">
                            <span className="text-secondary">Allocated: ₹{totalEntered.toFixed(2)}</span>
                            {items.length === 0 ? (
                              <span className="text-muted">No items in bill</span>
                            ) : isRemainingZero ? (
                              <span className="text-success font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Remaining: ₹0.00 (Settled)
                              </span>
                            ) : remainingAmount > 0 ? (
                              <span className="text-warning font-bold">
                                Remaining: ₹{remainingAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-danger font-bold">
                                Overpaid: ₹{Math.abs(remainingAmount).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {parseFloat(creditAmount) > 0 && (
                            <p className="text-caption text-warning">
                              * Credit sale will automatically update customer ledger & credit balance.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions: Save & Print / Save Only / Draft */}
                  {(() => {
                    const enteredCash = parseFloat(cashAmount) || 0;
                    const enteredUpi = parseFloat(upiAmount) || 0;
                    const enteredCredit = parseFloat(creditAmount) || 0;
                    const totalEntered = enteredCash + enteredUpi + enteredCredit;
                    const remainingAmount = Math.round((total - totalEntered) * 100) / 100;
                    const isRemainingZero = items.length > 0 && Math.abs(remainingAmount) < 0.01;

                    return (
                      <div className="flex flex-col gap-2.5 pt-2">
                        <button
                          ref={saveBtnRef}
                          id="save-and-print-bill-btn"
                          type="button"
                          disabled={saving || items.length === 0 || !isRemainingZero}
                          onClick={() => handleSaveBill('completed', true)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              creditAmountInputRef.current?.focus();
                              creditAmountInputRef.current?.select();
                            } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                              e.preventDefault();
                              saveOnlyBtnRef.current?.focus();
                            }
                          }}
                          className={`btn-base btn-primary h-11 w-full text-base font-bold shadow-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-focus ${
                            saving || items.length === 0 || !isRemainingZero
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          <Printer className="w-5 h-5" />
                          <span>{saving ? 'Processing...' : 'Save & Print'}</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            ref={saveOnlyBtnRef}
                            id="save-completed-bill-btn"
                            type="button"
                            disabled={saving || items.length === 0 || !isRemainingZero}
                            onClick={() => handleSaveBill('completed', false)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                saveBtnRef.current?.focus();
                              }
                            }}
                            className={`btn-base btn-secondary py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs ${
                              saving || items.length === 0 || !isRemainingZero
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Only</span>
                          </button>

                          <button
                            id="save-draft-bill-btn"
                            type="button"
                            disabled={saving || items.length === 0}
                            onClick={() => handleSaveBill('draft', false)}
                            className="btn-base btn-outline py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Save Draft</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Quick Add Customer Modal */}
      {quickCustomerModalOpen && (
        <div id="quick-customer-modal-backdrop" className="modal-backdrop">
          <div id="quick-customer-modal" className="modal-container max-w-md animate-scale-in">
            <div className="modal-header">
              <h3 className="text-card-title font-bold">Quick Add Customer</h3>
              <button
                type="button"
                onClick={() => setQuickCustomerModalOpen(false)}
                className="btn-base btn-ghost btn-icon-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer}>
              <div className="modal-body flex flex-col gap-4">
                {quickCustError && (
                  <div className="badge-base badge-danger p-2 text-xs font-medium">
                    {quickCustError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="quick-cust-name" className="form-label">
                    Customer Name *
                  </label>
                  <input
                    id="quick-cust-name"
                    type="text"
                    required
                    value={quickCustName}
                    onChange={(e) => setQuickCustName(e.target.value)}
                    placeholder="Enter customer name"
                    className="input-base"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quick-cust-mobile" className="form-label">
                    Mobile Number
                  </label>
                  <input
                    id="quick-cust-mobile"
                    type="tel"
                    value={quickCustMobile}
                    onChange={(e) => setQuickCustMobile(e.target.value)}
                    placeholder="Enter 10-digit mobile"
                    className="input-base"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setQuickCustomerModalOpen(false)}
                  className="btn-base btn-secondary"
                >
                  Cancel
                </button>
                <button
                  id="submit-quick-customer-btn"
                  type="submit"
                  className="btn-base btn-primary"
                >
                  Add & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
