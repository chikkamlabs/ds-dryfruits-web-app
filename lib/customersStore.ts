import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Customer,
  CustomerStatus,
  CustomerTransaction,
  TransactionCalculation,
} from './types';

export interface CustomerWithStats extends Customer {
  total_bills: number;
}

export interface CreateCustomerInput {
  name: string;
  mobile?: string | null;
  points?: number;
  credit?: number;
  location?: string | null;
  address?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  mobile?: string | null;
  points?: number;
  credit?: number;
  location?: string | null;
  address?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
}

export interface AddTransactionInput {
  customer_id: string;
  calculation: TransactionCalculation;
  amount: number;
  notes?: string | null;
}

export interface TransactionFilterOptions {
  calculation?: 'all' | 'sum' | 'subtract';
  startDate?: string;
  endDate?: string;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
}

export interface TransactionWithBillInfo extends CustomerTransaction {
  bill_code?: string | null;
}

/**
 * Fetch all customers and calculate total bills per customer from the bills table
 */
export async function getCustomers(): Promise<StoreResponse<CustomerWithStats[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Fetch all customers
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (customersError) {
      return { data: null, error: customersError.message };
    }

    const customers = (customersData as Customer[]) || [];

    // 2. Fetch bill customer_ids to compute total bills count per customer
    const { data: billsData, error: billsError } = await supabase
      .from('bills')
      .select('customer_id');

    const billCountMap: Record<string, number> = {};
    if (!billsError && billsData) {
      billsData.forEach((b: { customer_id: string | null }) => {
        if (b.customer_id) {
          billCountMap[b.customer_id] = (billCountMap[b.customer_id] || 0) + 1;
        }
      });
    }

    const customersWithStats: CustomerWithStats[] = customers.map((c) => ({
      ...c,
      total_bills: billCountMap[c.id] || 0,
    }));

    return { data: customersWithStats, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customers';
    return { data: null, error: message };
  }
}

/**
 * Fetch a single customer by UUID
 */
export async function getCustomerById(id: string): Promise<StoreResponse<Customer>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Customer, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer';
    return { data: null, error: message };
  }
}

/**
 * Create a new customer with all schema fields
 */
export async function createCustomer(input: CreateCustomerInput): Promise<StoreResponse<Customer>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.name || input.name.trim() === '') {
    return { data: null, error: 'Customer name is required.' };
  }

  try {
    const payload: {
      name: string;
      mobile: string | null;
      points: number;
      credit: number;
      location: string | null;
      address: string | null;
      status: CustomerStatus;
      notes: string | null;
    } = {
      name: input.name.trim(),
      mobile: input.mobile && input.mobile.trim() !== '' ? input.mobile.trim() : null,
      points: input.points !== undefined ? Number(input.points) : 0.0,
      credit: input.credit !== undefined ? Number(input.credit) : 0.0,
      location: input.location && input.location.trim() !== '' ? input.location.trim() : null,
      address: input.address && input.address.trim() !== '' ? input.address.trim() : null,
      status: input.status || 'active',
      notes: input.notes && input.notes.trim() !== '' ? input.notes.trim() : null,
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Customer, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create customer';
    return { data: null, error: message };
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<StoreResponse<Customer>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.mobile !== undefined) {
      payload.mobile = input.mobile && input.mobile.trim() !== '' ? input.mobile.trim() : null;
    }
    if (input.points !== undefined) payload.points = Number(input.points);
    if (input.credit !== undefined) payload.credit = Number(input.credit);
    if (input.location !== undefined) {
      payload.location = input.location && input.location.trim() !== '' ? input.location.trim() : null;
    }
    if (input.address !== undefined) {
      payload.address = input.address && input.address.trim() !== '' ? input.address.trim() : null;
    }
    if (input.status !== undefined) payload.status = input.status;
    if (input.notes !== undefined) {
      payload.notes = input.notes && input.notes.trim() !== '' ? input.notes.trim() : null;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Customer, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update customer';
    return { data: null, error: message };
  }
}

/**
 * Delete a customer by UUID
 */
export async function deleteCustomer(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete customer';
    return { error: message };
  }
}

/**
 * Add a customer transaction (credit sum/subtract)
 * Triggers in Postgres update customers.credit automatically, but we also fallback check
 */
export async function addCustomerTransaction(
  input: AddTransactionInput
): Promise<StoreResponse<CustomerTransaction>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.customer_id) {
    return { data: null, error: 'Customer ID is required.' };
  }

  if (!input.amount || Number(input.amount) <= 0) {
    return { data: null, error: 'Transaction amount must be greater than zero.' };
  }

  try {
    const payload = {
      customer_id: input.customer_id,
      calculation: input.calculation,
      amount: Number(input.amount),
      notes: input.notes && input.notes.trim() !== '' ? input.notes.trim() : null,
    };

    const { data, error } = await supabase
      .from('customer_transactions')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as CustomerTransaction, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add customer transaction';
    return { data: null, error: message };
  }
}

/**
 * Get customer transactions with filter options (calculation and date range)
 */
export async function getCustomerTransactions(
  customerId: string,
  filters?: TransactionFilterOptions
): Promise<StoreResponse<TransactionWithBillInfo[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    let query = supabase
      .from('customer_transactions')
      .select(`
        *,
        bills:bill_id (
          id,
          bill_id
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (filters?.calculation && filters.calculation !== 'all') {
      query = query.eq('calculation', filters.calculation);
    }

    if (filters?.startDate) {
      // Start of day in ISO format
      const startIso = new Date(`${filters.startDate}T00:00:00`).toISOString();
      query = query.gte('created_at', startIso);
    }

    if (filters?.endDate) {
      // End of day in ISO format
      const endIso = new Date(`${filters.endDate}T23:59:59.999`).toISOString();
      query = query.lte('created_at', endIso);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const formatted: TransactionWithBillInfo[] = (data || []).map((row: any) => ({
      id: row.id,
      customer_id: row.customer_id,
      bill_id: row.bill_id,
      calculation: row.calculation,
      amount: row.amount,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      bill_code: row.bills?.bill_id || null,
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer transactions';
    return { data: null, error: message };
  }
}
