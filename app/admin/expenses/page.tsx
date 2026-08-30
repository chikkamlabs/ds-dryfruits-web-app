'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Plus,
  Calendar,
  Search,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Banknote,
  Smartphone,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import AdminSidebar from '../sidebar/page';
import AdminHeader from '../header/page';
import {
  getExpenses,
  addExpense,
  deleteExpense,
  AddExpenseInput,
} from '../../../lib/paymentsStore';
import type { Expense, ExpensePaymentMode } from '../../../lib/types';

export default function AdminExpensesPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters (Date from to default today)
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Add Expense State (Just ask amount, Type, notes)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [typeInput, setTypeInput] = useState<ExpensePaymentMode>('cash');
  const [notesInput, setNotesInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Input refs for modal keyboard navigation
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const paymentCashBtnRef = useRef<HTMLButtonElement | null>(null);
  const paymentUpiBtnRef = useRef<HTMLButtonElement | null>(null);
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveExpenseBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto focus Amount input when Add Expense modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 50);
    }
  }, [isAddModalOpen]);

  // ESC key navigation to tap back arrow and return to payments
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
          return;
        }
        e.preventDefault();
        router.push('/admin/payments');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isAddModalOpen]);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpensesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExpenses({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        searchQuery: searchQuery.trim() || undefined,
      });

      if (res.error && !res.data) {
        setError(res.error);
      } else if (res.data) {
        setExpenses(res.data.expenses);
        setTotalAmount(res.data.totalAmount);
      }
    } catch (err) {
      setError('Failed to load expenses list');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchQuery]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getExpenses({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          searchQuery: searchQuery.trim() || undefined,
        });

        if (!isMounted) return;
        if (res.error && !res.data) {
          setError(res.error);
        } else if (res.data) {
          setExpenses(res.data.expenses);
          setTotalAmount(res.data.totalAmount);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load expenses list');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, searchQuery]);

  const handleResetFilters = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    setSearchQuery('');
  };

  const handleOpenAddModal = () => {
    setAmountInput('');
    setTypeInput('cash');
    setNotesInput('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (submitting) return;
    setIsAddModalOpen(false);
    setFormError(null);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AddExpenseInput = {
        amount: amt,
        mode_type: typeInput,
        notes: notesInput.trim() || null,
      };

      const res = await addExpense(payload);
      if (res.error) {
        setFormError(res.error);
      } else {
        setSuccessMsg('Expense added successfully!');
        setIsAddModalOpen(false);
        fetchExpensesData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setFormError('Failed to add expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    setDeletingId(id);
    try {
      const res = await deleteExpense(id);
      if (res.error) {
        alert(`Error deleting expense: ${res.error}`);
      } else {
        fetchExpensesData();
      }
    } catch (err) {
      alert('Failed to delete expense.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div id="admin-expenses-layout" className="flex flex-col h-screen overflow-hidden bg-bg-app">
      {/* Top Navigation Bar */}
      <AdminHeader
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <main id="admin-expenses-main" className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Breadcrumb & Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/payments"
                className="btn-base btn-ghost p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                title="Back to Payments"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="breadcrumb-nav mb-1">
                  <Link href="/admin/dashboard" className="breadcrumb-item">
                    Home
                  </Link>
                  <span>/</span>
                  <Link href="/admin/payments" className="breadcrumb-item">
                    Payments
                  </Link>
                  <span>/</span>
                  <span className="breadcrumb-item-active">Expenses</span>
                </div>
                <h1 className="text-page-title text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">
                  Expenses Table
                </h1>
                <p className="text-small text-[var(--color-text-muted)]">
                  Record and track daily operational cash/UPI expenditures
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-add-expense-modal"
                onClick={handleOpenAddModal}
                className="btn-base btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>

              <button
                id="btn-refresh-expenses"
                onClick={fetchExpensesData}
                disabled={loading}
                title="Refresh expenses"
                className="btn-base btn-outline p-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Expenses Total Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-base p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                Total Expenses (Selected Range)
              </span>
              <div className="mt-2 text-2xl font-bold text-rose-700">
                {formatCurrency(totalAmount)}
              </div>
              <div className="mt-1 text-xs text-rose-600">
                Count: {expenses.length} expense entries
              </div>
            </div>

            <div className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Cash Expenses
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {formatCurrency(
                  expenses
                    .filter((e) => e.mode_type === 'cash')
                    .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                )}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                Paid out via physical cash
              </div>
            </div>

            <div className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                UPI Expenses
              </span>
              <div className="mt-2 text-2xl font-bold text-blue-700">
                {formatCurrency(
                  expenses
                    .filter((e) => e.mode_type === 'upi')
                    .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                )}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                Paid out via online UPI
              </div>
            </div>
          </div>

          {/* Filter Bar: Date (From to default today) & Search */}
          <div
            id="expenses-filter-bar"
            className="card-base p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                Filter Expenses by Date
              </div>
              {(startDate !== todayStr || endDate !== todayStr || searchQuery) && (
                <button
                  id="btn-reset-expense-filters"
                  onClick={handleResetFilters}
                  className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                >
                  Reset to Today
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date From */}
              <div className="form-group mb-0">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                  Date From:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-10" />
                  <input
                    id="filter-expense-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-base input-with-icon-left text-sm py-2 w-full"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="form-group mb-0">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                  Date To:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-10" />
                  <input
                    id="filter-expense-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-base input-with-icon-left text-sm py-2 w-full"
                  />
                </div>
              </div>

              {/* Search Notes / Amount */}
              <div className="form-group mb-0">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
                  Search Notes / Amount:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-10" />
                  <input
                    id="filter-expense-search"
                    type="text"
                    placeholder="Search notes or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-base input-with-icon-left text-sm py-2 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Table: s.no, amount, type, date and time */}
          <div className="card-base rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-card-title font-semibold text-[var(--color-text-primary)]">
                  All Expenses
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Showing {expenses.length} records in selected period
                </p>
              </div>

              <div className="text-xs font-medium text-[var(--color-text-muted)]">
                Period: <span className="text-[var(--color-text-primary)] font-semibold">{startDate || 'Any'}</span> to <span className="text-[var(--color-text-primary)] font-semibold">{endDate || 'Any'}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table id="table-expenses" className="table-base w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <th className="py-3 px-4 font-semibold text-center w-16">S.No</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount (₹)</th>
                    <th className="py-3 px-4 font-semibold text-center">Type</th>
                    <th className="py-3 px-4 font-semibold">Notes / Purpose</th>
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                          <span>Loading expenses...</span>
                        </div>
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <TrendingUp className="w-8 h-8 opacity-30 text-rose-500" />
                          <span className="font-medium text-[var(--color-text-secondary)]">
                            No expenses found
                          </span>
                          <span className="text-xs">
                            Click &quot;Add Expense&quot; to record an expenditure.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense, idx) => (
                      <tr
                        key={expense.id}
                        id={`row-expense-${expense.id}`}
                        className="hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        {/* S.No */}
                        <td className="py-3 px-4 text-center font-mono text-xs text-[var(--color-text-muted)]">
                          {idx + 1}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right font-bold text-rose-700 whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {expense.mode_type === 'upi' ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <Smartphone className="w-3 h-3" />
                              UPI
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Banknote className="w-3 h-3" />
                              Cash
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-4 text-[var(--color-text-primary)]">
                          {expense.notes ? (
                            <span>{expense.notes}</span>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)] italic">
                              No notes provided
                            </span>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {formatDateTime(expense.created_at)}
                        </td>

                        {/* Action: Delete */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            id={`btn-delete-expense-${expense.id}`}
                            onClick={() => handleDelete(expense.id)}
                            disabled={deletingId === expense.id}
                            title="Delete Expense"
                            className="btn-base btn-ghost p-1.5 rounded text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer Total */}
                {expenses.length > 0 && (
                  <tfoot>
                    <tr className="bg-[var(--color-surface-subtle)] border-t-2 border-[var(--color-border-strong)] font-bold text-sm">
                      <td colSpan={1} className="py-3.5 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                        Total
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-700">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Expense Modal: Just ask amount, Type, notes */}
      {isAddModalOpen && (
        <div
          id="modal-add-expense"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-surface-subtle)]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-rose-100 text-rose-700">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Add New Expense
                </h3>
              </div>
              <button
                onClick={handleCloseAddModal}
                disabled={submitting}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Amount */}
              <div className="form-group">
                <label
                  htmlFor="input-expense-amount"
                  className="form-label text-sm font-semibold text-[var(--color-text-primary)]"
                >
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[var(--color-text-muted)] pointer-events-none z-10">
                    ₹
                  </span>
                  <input
                    id="input-expense-amount"
                    ref={amountInputRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (typeInput === 'cash') {
                          paymentCashBtnRef.current?.focus();
                        } else {
                          paymentUpiBtnRef.current?.focus();
                        }
                      }
                    }}
                    className="input-base input-with-icon-left py-2.5 text-base font-semibold w-full"
                  />
                </div>
              </div>

              {/* 2. Type (Cash / UPI) */}
              <div className="form-group">
                <label className="form-label text-sm font-semibold text-[var(--color-text-primary)]">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    id="btn-select-cash"
                    ref={paymentCashBtnRef}
                    onClick={() => setTypeInput('cash')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTypeInput('cash');
                        notesInputRef.current?.focus();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        setTypeInput('upi');
                        paymentUpiBtnRef.current?.focus();
                      }
                    }}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                      typeInput === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    id="btn-select-upi"
                    ref={paymentUpiBtnRef}
                    onClick={() => setTypeInput('upi')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTypeInput('upi');
                        notesInputRef.current?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        setTypeInput('cash');
                        paymentCashBtnRef.current?.focus();
                      }
                    }}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                      typeInput === 'upi'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>UPI</span>
                  </button>
                </div>
              </div>

              {/* 3. Notes */}
              <div className="form-group">
                <label
                  htmlFor="input-expense-notes"
                  className="form-label text-sm font-semibold text-[var(--color-text-primary)]"
                >
                  Notes / Purpose (Optional)
                </label>
                <textarea
                  id="input-expense-notes"
                  ref={notesInputRef}
                  rows={3}
                  placeholder="e.g., Tea/Snacks, Packing bags, Transport, Cleaning supplies..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveExpenseBtnRef.current?.focus();
                    }
                  }}
                  className="textarea-base text-sm w-full mt-1"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  id="btn-cancel-expense"
                  onClick={handleCloseAddModal}
                  disabled={submitting}
                  className="btn-base btn-outline px-4 py-2 text-sm rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="btn-submit-expense"
                  ref={saveExpenseBtnRef}
                  disabled={submitting}
                  className="btn-base btn-primary px-5 py-2 text-sm rounded-lg flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save Expense</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
