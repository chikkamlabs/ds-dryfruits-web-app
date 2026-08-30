// ============================================================================
// DS DRY FRUITS BILLING & INVENTORY MANAGEMENT SYSTEM
// Data Table Types & Database Schema Definitions
// ============================================================================

export type UserRole = 'admin' | 'staff' | 'associate';
export type UserStatus = 'active' | 'inactive';
export type CustomerStatus = 'active' | 'inactive';
export type CategoryStatus = 'active' | 'inactive';
export type ProductStatus = 'active' | 'inactive';
export type PurchaseStatus = 'draft' | 'completed' | 'cancelled';
export type BillStatus = 'draft' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMode = 'cash' | 'upi' | 'credit';
export type TransactionCalculation = 'sum' | 'subtract';
export type ExpensePaymentMode = 'cash' | 'upi';

// Table 1: profiles
export interface Profile {
  id: string; // UUID references auth.users
  name: string | null;
  email: string;
  mobile: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// Table 2: customers
export interface Customer {
  id: string;
  name: string;
  mobile: string | null;
  points: number;
  credit: number;
  location: string | null;
  address: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Table 3: categories
export interface Category {
  id: string;
  category_id: string;
  name: string;
  status: CategoryStatus;
  created_at: string;
  updated_at: string;
}

// Table 4: distributors
export interface Distributor {
  id: string;
  distributor_code: string;
  name: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Table 5: products
export interface Product {
  id: string;
  product_id: string;
  barcode: string | null;
  name: string;
  category_id: string | null;
  mrp: number;
  discount: number;
  selling_price: number;
  retail_quantity: number;
  warehouse_quantity: number;
  low_selling_price: number | null;
  low_warehouse_quantity: number | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

// Table 6: purchases
export interface Purchase {
  id: string;
  purchase_id: string;
  distributor_id: string | null;
  quantity: number;
  status: PurchaseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Table 7: purchase_items
export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  retail_quantity: number;
  warehouse_quantity: number;
  created_at: string;
  updated_at: string;
}

// Table 8: bills
export interface Bill {
  id: string;
  bill_id: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: BillStatus;
  created_at: string;
  updated_at: string;
}

// Table 9: bill_items
export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  quantity: number;
  mrp: number;
  discount: number;
  selling_price: number;
  row_total: number;
  created_at: string;
  updated_at: string;
}

// Table 10: bill_payments
export interface BillPayment {
  id: string;
  bill_id: string;
  mode: PaymentMode;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Table 11: customer_transactions
export interface CustomerTransaction {
  id: string;
  customer_id: string;
  bill_id: string | null;
  calculation: TransactionCalculation;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Table 12: expenses
export interface Expense {
  id: string;
  amount: number;
  mode_type: ExpensePaymentMode;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Supabase Database Type Map
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      customers: {
        Row: Customer;
        Insert: Partial<Customer> & { name: string };
        Update: Partial<Customer>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & { name: string };
        Update: Partial<Category>;
        Relationships: [];
      };
      distributors: {
        Row: Distributor;
        Insert: Partial<Distributor> & { name: string };
        Update: Partial<Distributor>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { name: string };
        Update: Partial<Product>;
        Relationships: [];
      };
      purchases: {
        Row: Purchase;
        Insert: Partial<Purchase>;
        Update: Partial<Purchase>;
        Relationships: [];
      };
      purchase_items: {
        Row: PurchaseItem;
        Insert: Partial<PurchaseItem> & { purchase_id: string; product_id: string; product_name: string };
        Update: Partial<PurchaseItem>;
        Relationships: [];
      };
      bills: {
        Row: Bill;
        Insert: Partial<Bill>;
        Update: Partial<Bill>;
        Relationships: [];
      };
      bill_items: {
        Row: BillItem;
        Insert: Partial<BillItem> & { bill_id: string; product_id: string };
        Update: Partial<BillItem>;
        Relationships: [];
      };
      bill_payments: {
        Row: BillPayment;
        Insert: Partial<BillPayment> & { bill_id: string; mode: PaymentMode; amount: number };
        Update: Partial<BillPayment>;
        Relationships: [];
      };
      customer_transactions: {
        Row: CustomerTransaction;
        Insert: Partial<CustomerTransaction> & { customer_id: string; calculation: TransactionCalculation; amount: number };
        Update: Partial<CustomerTransaction>;
        Relationships: [];
      };
      expenses: {
        Row: Expense;
        Insert: Partial<Expense> & { amount: number; mode_type: ExpensePaymentMode };
        Update: Partial<Expense>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      customer_status: CustomerStatus;
      category_status: CategoryStatus;
      product_status: ProductStatus;
      purchase_status: PurchaseStatus;
      bill_status: BillStatus;
      payment_mode: PaymentMode;
      transaction_calculation: TransactionCalculation;
      expense_payment_mode: ExpensePaymentMode;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
