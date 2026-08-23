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

export interface CreateBillItemInput {
  product_id: string;
  quantity: number;
  mrp: number;
  selling_price: number;
  row_total: number;
}

export interface CreateBillPaymentInput {
  mode: PaymentMode;
  amount: number;
  notes?: string | null;
}

export interface CreateBillInput {
  customer_id?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: BillStatus; // 'completed' or 'draft'
  items: CreateBillItemInput[];
  payments?: CreateBillPaymentInput[];
  paymentMode?: PaymentMode; // for backwards compatibility
  paymentAmount?: number;
  notes?: string | null;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
}

export interface BillWithDetails extends Bill {
  customer?: Customer | null;
  items: (BillItem & { product?: Product | null })[];
  payments: BillPayment[];
}

/**
 * Creates a bill, its line items, payment record, and updates customer credit/transactions if credit is selected.
 */
export async function createBill(input: CreateBillInput): Promise<StoreResponse<BillWithDetails>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.items || input.items.length === 0) {
    return { data: null, error: 'Bill must contain at least one item.' };
  }

  try {
    // 1. Insert into bills table
    const billPayload = {
      customer_id: input.customer_id || null,
      subtotal: Number(input.subtotal) || 0,
      discount: Number(input.discount) || 0,
      total: Number(input.total) || 0,
      status: input.status || 'completed',
    };

    const { data: billData, error: billError } = await supabase
      .from('bills')
      .insert(billPayload as never)
      .select()
      .single();

    if (billError) {
      return { data: null, error: billError.message };
    }

    const createdBill = billData as Bill;

    // 2. Insert bill items
    const itemsPayload = input.items.map((item) => ({
      bill_id: createdBill.id,
      product_id: item.product_id,
      quantity: Number(item.quantity) || 1,
      mrp: Number(item.mrp) || 0,
      selling_price: Number(item.selling_price) || 0,
      row_total: Number(item.row_total) || 0,
    }));

    const { data: billItemsData, error: itemsError } = await supabase
      .from('bill_items')
      .insert(itemsPayload as never)
      .select();

    if (itemsError) {
      return { data: null, error: `Bill created (${createdBill.bill_id}), but items failed: ${itemsError.message}` };
    }

    // 3. If completed or has payment, insert payment records (Cash, UPI, Credit) into bill_payments without duplicates
    let billPaymentsData: BillPayment[] = [];
    const normalizedPayments: CreateBillPaymentInput[] = [];

    if (input.payments && input.payments.length > 0) {
      // Deduplicate by payment mode and only keep positive amounts
      const modeMap = new Map<PaymentMode, CreateBillPaymentInput>();
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
    } else if (input.paymentMode && (input.paymentAmount !== undefined ? input.paymentAmount > 0 : input.total > 0)) {
      const payAmount = input.paymentAmount !== undefined ? Number(input.paymentAmount) : Number(input.total);
      if (payAmount > 0) {
        normalizedPayments.push({
          mode: input.paymentMode,
          amount: payAmount,
          notes: input.notes || null,
        });
      }
    }

    if (normalizedPayments.length > 0) {
      const paymentPayloads = normalizedPayments.map((p) => ({
        bill_id: createdBill.id,
        mode: p.mode,
        amount: Number(p.amount),
        notes: p.notes || null,
      }));

      const { data: payData, error: payError } = await supabase
        .from('bill_payments')
        .insert(paymentPayloads as never)
        .select();

      if (!payError && payData) {
        billPaymentsData = payData as BillPayment[];
      }
    }

    // 4. Handle Customer Points and Credit (when completed)
    if (input.status === 'completed' && input.customer_id) {
      try {
        // Fetch current customer to calculate points and credit additions
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, points, credit')
          .eq('id', input.customer_id)
          .single<{ id: string; name: string; points: number | null; credit: number | null }>();

        const currentPoints = Number(custData?.points) || 0;
        const currentCredit = Number(custData?.credit) || 0;

        // Calculate points to add: 1 * total_bill / 100
        const pointsToAdd = (1 * (Number(input.total) || 0)) / 100;
        const updatedPoints = Number((currentPoints + pointsToAdd).toFixed(2));

        // Find credit payment for this bill if any
        const creditPayment = normalizedPayments.find((p) => p.mode === 'credit' && p.amount > 0);
        const thisBillCredit = creditPayment ? Number(creditPayment.amount) : 0;
        const updatedCredit = Number((currentCredit + thisBillCredit).toFixed(2));

        // Check if database trigger trg_handle_credit_payment_ledger already created the ledger transaction
        const { data: existingTx } = await supabase
          .from('customer_transactions')
          .select('id')
          .eq('bill_id', createdBill.id)
          .limit(1);

        const hasTriggerTransaction = Boolean(existingTx && existingTx.length > 0);

        // If credit was used and trigger did not create it, insert exactly once
        if (thisBillCredit > 0 && !hasTriggerTransaction) {
          await supabase.from('customer_transactions').insert({
            customer_id: input.customer_id,
            bill_id: createdBill.id,
            calculation: 'sum',
            amount: thisBillCredit,
            notes: `Credit sale on bill #${createdBill.bill_id || createdBill.id}`,
          } as never);
        }

        // Update customer points (and credit if trigger wasn't active)
        const customerUpdatePayload: { points: number; updated_at: string; credit?: number } = {
          points: updatedPoints,
          updated_at: new Date().toISOString(),
        };

        if (thisBillCredit > 0 && !hasTriggerTransaction) {
          customerUpdatePayload.credit = updatedCredit;
        }

        await supabase
          .from('customers')
          .update(customerUpdatePayload as never)
          .eq('id', input.customer_id);
      } catch (custErr) {
        console.error('Failed to update customer loyalty points/credit:', custErr);
      }
    }

    // 5. Outbound retail stock deduction (products.quantity = products.quantity - quantity)
    // is automatically and atomically executed by database trigger trg_handle_bill_item_stock.

    const fullDetails: BillWithDetails = {
      ...createdBill,
      items: (billItemsData as BillItem[]) || [],
      payments: billPaymentsData,
    };

    return { data: fullDetails, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create bill';
    return { data: null, error: message };
  }
}

/**
 * Fetch bills with pagination or list
 */
export async function getBills(): Promise<StoreResponse<Bill[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as Bill[]) || [], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch bills';
    return { data: null, error: message };
  }
}
