// lib/generateBill.ts

import type { Customer } from '@/lib/types';

export interface GenerateBillItem {
  id: string;
  product_id: string;
  name: string;
  mrp: number;
  discount: number;
  quantity: number;
  selling_price: number;
  row_total: number;
}

export interface GenerateBillPayment {
  mode: string;
  amount: number;
}

export interface GeneratedBill {
  billId: string;
  date: string;
  customer: {
    name: string;
    mobile: string;
  } | null;
  items: GenerateBillItem[];
  subtotal: number;
  discount: number;
  total: number;
  payments: GenerateBillPayment[];
}

interface GenerateBillInput {
  billId: string;
  customer: Customer | null;
  items: GenerateBillItem[];
  subtotal: number;
  discount: number;
  total: number;
  payments: GenerateBillPayment[];
}

export function generateBill(input: GenerateBillInput): GeneratedBill {
  return {
    billId: input.billId,

    date: new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date()),

    customer: input.customer
      ? {
          name: input.customer.name,
          mobile: input.customer.mobile || '',
        }
      : null,

    items: input.items.map((item) => ({
      ...item,
      mrp: Number(item.mrp) || 0,
      discount: Number(item.discount) || 0,
      quantity: Number(item.quantity) || 0,
      selling_price: Number(item.selling_price) || 0,
      row_total: Number(item.row_total) || 0,
    })),

    subtotal: Number(input.subtotal) || 0,
    discount: Number(input.discount) || 0,
    total: Number(input.total) || 0,

    payments: input.payments.map((payment) => ({
      mode: payment.mode,
      amount: Number(payment.amount) || 0,
    })),
  };
}