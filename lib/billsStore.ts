import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Bill,
  BillItem,
  BillPayment,
  BillStatus,
  PaymentMode,
  Product,
  Customer,
} from './types';

export interface BillItemWithProduct extends BillItem {
  product?: Product | null;
}

export interface BillWithDetails extends Bill {
  customer?: Customer | null;
  items: BillItemWithProduct[];
  payments: BillPayment[];
  total_products_count?: number;
  total_quantity?: number;
}

export interface BillsFilterOptions {
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  status?: BillStatus | 'all';
}

export interface UpdateBillItemInput {
  id?: string;
  product_id: string;
  quantity: number;
  mrp: number;
  selling_price: number;
  row_total: number;
}

export interface UpdateBillPaymentInput {
  mode: PaymentMode;
  amount: number;
  notes?: string | null;
}

export interface UpdateBillInput {
  customer_id?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: BillStatus;
  items: UpdateBillItemInput[];
  payments?: UpdateBillPaymentInput[];
  notes?: string | null;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

/**
 * Fetch all bills matching filters (startDate, endDate, searchQuery on bill_id or customer, status).
 */
export async function getBills(
  options: BillsFilterOptions = {}
): Promise<StoreResponse<BillWithDetails[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error: 'Supabase is not configured.',
      count: 0,
    };
  }

  try {
    let query = supabase
      .from('bills')
      .select(
        `
        *,
        customer:customers(*),
        items:bill_items(
          *,
          product:products(*)
        ),
        payments:bill_payments(*)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Date range filter
    if (options.startDate) {
      const startIso = new Date(`${options.startDate}T00:00:00`).toISOString();
      query = query.gte('created_at', startIso);
    }
    if (options.endDate) {
      const endIso = new Date(`${options.endDate}T23:59:59.999`).toISOString();
      query = query.lte('created_at', endIso);
    }

    // Status filter
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // Bill ID Search
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.ilike('bill_id', `%${term}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching bills:', error);
      return { data: null, error: error.message, count: 0 };
    }

    const rawBills = (data || []) as any[];

    // Calculate aggregated metrics for each bill
    const processedBills: BillWithDetails[] = rawBills.map((b) => {
      const items = (b.items || []) as BillItemWithProduct[];
      const totalProducts = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

      return {
        ...b,
        items,
        payments: b.payments || [],
        customer: b.customer || null,
        total_products_count: totalProducts,
        total_quantity: Number(totalQuantity.toFixed(3)),
      };
    });

    return {
      data: processedBills,
      error: null,
      count: count || processedBills.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch bills';
    return { data: null, error: msg, count: 0 };
  }
}

/**
 * Fetch a single bill by UUID (id) or bill_id with customer, line items, and payments.
 */
export async function getBillById(
  idOrBillId: string
): Promise<StoreResponse<BillWithDetails>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    // Check if input is UUID or alphanumeric bill_id
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrBillId
      );

    let query = supabase
      .from('bills')
      .select(
        `
        *,
        customer:customers(*),
        items:bill_items(
          *,
          product:products(*)
        ),
        payments:bill_payments(*)
      `
      );

    if (isUuid) {
      query = query.eq('id', idOrBillId);
    } else {
      query = query.eq('bill_id', idOrBillId);
    }

    const { data, error } = await query.single();

    if (error) {
      return { data: null, error: error.message };
    }

    const rawBill = data as any;
    const items = (rawBill.items || []) as BillItemWithProduct[];
    const totalProducts = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const billWithDetails: BillWithDetails = {
      ...rawBill,
      items,
      payments: rawBill.payments || [],
      customer: rawBill.customer || null,
      total_products_count: totalProducts,
      total_quantity: Number(totalQuantity.toFixed(3)),
    };

    return { data: billWithDetails, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch bill details';
    return { data: null, error: msg };
  }
}

/**
 * Updates an existing bill in the database without creating duplicates.
 * Updates the bill row, replaces bill_items, replaces bill_payments, and synchronizes customer points/credit.
 */
export async function updateBill(
  billId: string,
  input: UpdateBillInput
): Promise<StoreResponse<BillWithDetails>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  if (!input.items || input.items.length === 0) {
    return { data: null, error: 'Bill must contain at least one item.' };
  }

  try {
    // 1. Fetch existing bill to verify its existence
    const { data: existingBill, error: fetchErr } = await supabase
      .from('bills')
      .select('id, bill_id, customer_id, total, status')
      .eq('id', billId)
      .single<{ id: string; bill_id: string; customer_id: string | null; total: number; status: BillStatus }>();

    if (fetchErr || !existingBill) {
      return { data: null, error: fetchErr?.message || 'Bill not found to update.' };
    }

    // 2. Update bills main row
    const billUpdatePayload = {
      customer_id: input.customer_id || null,
      subtotal: Number(input.subtotal) || 0,
      discount: Number(input.discount) || 0,
      total: Number(input.total) || 0,
      status: input.status,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedBillData, error: billUpdateErr } = await supabase
      .from('bills')
      .update(billUpdatePayload as never)
      .eq('id', billId)
      .select()
      .single();

    if (billUpdateErr) {
      return { data: null, error: `Failed to update bill: ${billUpdateErr.message}` };
    }

    const updatedBill = updatedBillData as Bill;

    // 3. Update bill_items: Delete old items and insert updated items
    await supabase.from('bill_items').delete().eq('bill_id', billId);

    const itemsPayload = input.items.map((item) => ({
      bill_id: billId,
      product_id: item.product_id,
      quantity: Number(item.quantity) || 1,
      mrp: Number(item.mrp) || 0,
      selling_price: Number(item.selling_price) || 0,
      row_total: Number(item.row_total) || 0,
    }));

    const { error: itemsInsertErr } = await supabase
      .from('bill_items')
      .insert(itemsPayload as never);

    if (itemsInsertErr) {
      return { data: null, error: `Updated bill header, but items failed: ${itemsInsertErr.message}` };
    }

    // 4. Update bill_payments: Delete existing payments and insert updated payments
    await supabase.from('bill_payments').delete().eq('bill_id', billId);

    const normalizedPayments: UpdateBillPaymentInput[] = [];
    if (input.payments && input.payments.length > 0) {
      const modeMap = new Map<PaymentMode, UpdateBillPaymentInput>();
      for (const p of input.payments) {
        const amt = Number(p.amount) || 0;
        if (amt > 0) {
          const existing = modeMap.get(p.mode);
          if (existing) {
            existing.amount += amt;
          } else {
            modeMap.set(p.mode, { mode: p.mode, amount: amt, notes: p.notes || null });
          }
        }
      }
      normalizedPayments.push(...modeMap.values());
    }

    if (normalizedPayments.length > 0) {
      const paymentPayloads = normalizedPayments.map((p) => ({
        bill_id: billId,
        mode: p.mode,
        amount: Number(p.amount),
        notes: p.notes || null,
      }));

      await supabase.from('bill_payments').insert(paymentPayloads as never);
    }

    // 5. Customer Ledger & Loyalty Points Synchronization (if completed & customer exists)
    if (input.status === 'completed' && input.customer_id) {
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, points, credit')
          .eq('id', input.customer_id)
          .single<{ id: string; name: string; points: number | null; credit: number | null }>();

        const creditPayment = normalizedPayments.find((p) => p.mode === 'credit' && p.amount > 0);
        const thisBillCredit = creditPayment ? Number(creditPayment.amount) : 0;

        // Check if customer_transactions has a record for this bill
        const { data: existingTx } = await supabase
          .from('customer_transactions')
          .select('id, amount')
          .eq('bill_id', billId)
          .limit(1)
          .returns<{ id: string; amount: number }[]>();

        if (thisBillCredit > 0) {
          if (existingTx && existingTx.length > 0 && existingTx[0]) {
            // Update existing transaction
            await supabase
              .from('customer_transactions')
              .update({
                customer_id: input.customer_id,
                amount: thisBillCredit,
                calculation: 'sum',
                notes: `Credit sale on bill #${updatedBill.bill_id || billId}`,
                updated_at: new Date().toISOString(),
              } as never)
              .eq('id', existingTx[0].id);
          } else {
            // Insert single transaction
            await supabase.from('customer_transactions').insert({
              customer_id: input.customer_id,
              bill_id: billId,
              calculation: 'sum',
              amount: thisBillCredit,
              notes: `Credit sale on bill #${updatedBill.bill_id || billId}`,
            } as never);
          }
        } else if (existingTx && existingTx.length > 0) {
          // If credit was removed, delete corresponding customer_transaction
          await supabase.from('customer_transactions').delete().eq('bill_id', billId);
        }

        // Recalculate customer points: add 1 point per 100 on total
        if (custData) {
          const currentPoints = Number(custData.points) || 0;
          const pointsToAdd = (1 * (Number(input.total) || 0)) / 100;
          const updatedPoints = Number((currentPoints + pointsToAdd).toFixed(2));

          await supabase
            .from('customers')
            .update({
              points: updatedPoints,
              updated_at: new Date().toISOString(),
            } as never)
            .eq('id', input.customer_id);
        }
      } catch (custErr) {
        console.error('Failed to sync customer details on bill update:', custErr);
      }
    }

    // Return the updated bill with full relations
    return await getBillById(billId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update bill';
    return { data: null, error: msg };
  }
}

/**
 * Delete a bill by ID
 */
export async function deleteBill(billId: string): Promise<StoreResponse<boolean>> {
  if (!isSupabaseConfigured) {
    return { data: false, error: 'Supabase is not configured.' };
  }

  try {
    // Delete customer transactions tied to this bill first if any
    await supabase.from('customer_transactions').delete().eq('bill_id', billId);

    const { error } = await supabase.from('bills').delete().eq('id', billId);

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete bill';
    return { data: false, error: msg };
  }
}
