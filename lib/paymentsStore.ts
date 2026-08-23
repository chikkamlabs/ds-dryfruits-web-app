import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Bill,
  BillPayment,
  Expense,
  ExpensePaymentMode,
  PaymentMode,
  Customer,
  BillStatus,
} from './types';

export interface PaymentBillRecord {
  id: string;
  bill_id: string;
  customer_name: string;
  customer_mobile: string | null;
  customer_id?: string | null;
  total: number;
  cash: number;
  upi: number;
  credit: number;
  status: BillStatus;
  created_at: string;
}

export interface PaymentSummary {
  totalSale: number; // cash + upi + credit
  totalCash: number;
  totalUpi: number;
  totalCredit: number;
  totalBillsCount: number;
  totalExpenses: number;
}

export interface PaymentsFilterOptions {
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  status?: BillStatus | 'all';
}

export interface ExpensesFilterOptions {
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaymentsDataResponse {
  bills: PaymentBillRecord[];
  summary: PaymentSummary;
}

/**
 * Fetch all payments data with aggregate totals:
 * Total Sale (cash + upi + credit), Total Cash, Total UPI, Total Credit, Total Expenses
 * Table details: bill_id, customer name & mobile, total, cash, upi, credit
 */
export async function getPaymentsData(
  options: PaymentsFilterOptions = {}
): Promise<StoreResponse<PaymentsDataResponse>> {
  if (!isSupabaseConfigured) {
    return {
      data: {
        bills: [],
        summary: {
          totalSale: 0,
          totalCash: 0,
          totalUpi: 0,
          totalCredit: 0,
          totalBillsCount: 0,
          totalExpenses: 0,
        },
      },
      error: 'Supabase is not configured.',
      count: 0,
    };
  }

  try {
    // 1. Build Query for Bills and their Payments & Customer info
    let billsQuery = supabase
      .from('bills')
      .select(
        `
        id,
        bill_id,
        customer_id,
        subtotal,
        discount,
        total,
        status,
        created_at,
        customer:customers(id, name, mobile),
        payments:bill_payments(id, mode, amount, notes)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Date range filter
    if (options.startDate) {
      const startIso = new Date(`${options.startDate}T00:00:00`).toISOString();
      billsQuery = billsQuery.gte('created_at', startIso);
    }
    if (options.endDate) {
      const endIso = new Date(`${options.endDate}T23:59:59.999`).toISOString();
      billsQuery = billsQuery.lte('created_at', endIso);
    }

    // Status filter
    if (options.status && options.status !== 'all') {
      billsQuery = billsQuery.eq('status', options.status);
    }

    // Search query on bill_id
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      billsQuery = billsQuery.ilike('bill_id', `%${term}%`);
    }

    // 2. Fetch Expenses in the same date range for Total Expenses Metric
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, created_at');

    if (options.startDate) {
      const startIso = new Date(`${options.startDate}T00:00:00`).toISOString();
      expensesQuery = expensesQuery.gte('created_at', startIso);
    }
    if (options.endDate) {
      const endIso = new Date(`${options.endDate}T23:59:59.999`).toISOString();
      expensesQuery = expensesQuery.lte('created_at', endIso);
    }

    const [billsRes, expensesRes] = await Promise.all([
      billsQuery,
      expensesQuery,
    ]);

    if (billsRes.error) {
      console.error('Error fetching payments:', billsRes.error);
      return { data: null, error: billsRes.error.message, count: 0 };
    }

    const rawBills = (billsRes.data || []) as any[];

    let totalCash = 0;
    let totalUpi = 0;
    let totalCredit = 0;
    let totalSale = 0;

    const processedBills: PaymentBillRecord[] = rawBills.map((b) => {
      const payments = (b.payments || []) as BillPayment[];
      const customer = b.customer as Customer | null;

      let billCash = 0;
      let billUpi = 0;
      let billCredit = 0;

      payments.forEach((p) => {
        const amt = Number(p.amount) || 0;
        if (p.mode === 'cash') billCash += amt;
        else if (p.mode === 'upi') billUpi += amt;
        else if (p.mode === 'credit') billCredit += amt;
      });

      // If no explicit bill_payments entries recorded, check if total exists and allocate to cash/credit appropriately
      if (payments.length === 0 && Number(b.total) > 0) {
        billCash = Number(b.total);
      }

      const billTotal = Number(b.total) || (billCash + billUpi + billCredit);

      totalCash += billCash;
      totalUpi += billUpi;
      totalCredit += billCredit;
      totalSale += (billCash + billUpi + billCredit) || billTotal;

      return {
        id: b.id,
        bill_id: b.bill_id,
        customer_name: customer?.name || 'Walk-in Customer',
        customer_mobile: customer?.mobile || null,
        customer_id: b.customer_id || null,
        total: billTotal,
        cash: billCash,
        upi: billUpi,
        credit: billCredit,
        status: b.status,
        created_at: b.created_at,
      };
    });

    // Compute total expenses
    const rawExpenses = (expensesRes.data || []) as any[];
    const totalExpenses = rawExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const summary: PaymentSummary = {
      totalSale: Number(totalSale.toFixed(2)),
      totalCash: Number(totalCash.toFixed(2)),
      totalUpi: Number(totalUpi.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      totalBillsCount: processedBills.length,
      totalExpenses: Number(totalExpenses.toFixed(2)),
    };

    return {
      data: {
        bills: processedBills,
        summary,
      },
      error: null,
      count: billsRes.count || processedBills.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch payments data';
    return { data: null, error: msg, count: 0 };
  }
}

/**
 * Fetch Expenses with date filters
 */
export async function getExpenses(
  options: ExpensesFilterOptions = {}
): Promise<StoreResponse<{ expenses: Expense[]; totalAmount: number }>> {
  if (!isSupabaseConfigured) {
    return {
      data: { expenses: [], totalAmount: 0 },
      error: 'Supabase is not configured.',
      count: 0,
    };
  }

  try {
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.startDate) {
      const startIso = new Date(`${options.startDate}T00:00:00`).toISOString();
      query = query.gte('created_at', startIso);
    }
    if (options.endDate) {
      const endIso = new Date(`${options.endDate}T23:59:59.999`).toISOString();
      query = query.lte('created_at', endIso);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return { data: null, error: error.message, count: 0 };
    }

    let expenses = (data || []) as Expense[];

    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.toLowerCase().trim();
      expenses = expenses.filter(
        (e) =>
          (e.notes && e.notes.toLowerCase().includes(term)) ||
          e.mode_type.toLowerCase().includes(term) ||
          String(e.amount).includes(term)
      );
    }

    const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      data: {
        expenses,
        totalAmount: Number(totalAmount.toFixed(2)),
      },
      error: null,
      count: count || expenses.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch expenses';
    return { data: null, error: msg, count: 0 };
  }
}

export interface AddExpenseInput {
  amount: number;
  mode_type: ExpensePaymentMode | 'cash' | 'upi';
  notes?: string | null;
}

/**
 * Add a new expense (Just ask amount, Type, notes)
 */
export async function addExpense(
  input: AddExpenseInput
): Promise<StoreResponse<Expense>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const amt = Number(input.amount);
  if (isNaN(amt) || amt <= 0) {
    return { data: null, error: 'Please enter a valid expense amount greater than 0.' };
  }

  const modeType = input.mode_type === 'upi' ? 'upi' : 'cash';

  try {
    const payload = {
      amount: amt,
      mode_type: modeType as ExpensePaymentMode,
      notes: input.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Expense, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to add expense';
    return { data: null, error: msg };
  }
}

/**
 * Delete an expense by id
 */
export async function deleteExpense(id: string): Promise<StoreResponse<boolean>> {
  if (!isSupabaseConfigured) {
    return { data: false, error: 'Supabase is not configured.' };
  }

  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      return { data: false, error: error.message };
    }
    return { data: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete expense';
    return { data: false, error: msg };
  }
}
