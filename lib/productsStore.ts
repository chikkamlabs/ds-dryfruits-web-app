import { supabase, isSupabaseConfigured } from './supabase';
import type { Product, ProductStatus } from './types';

export interface CreateProductInput {
  name: string;
  category_id?: string | null;
  barcode?: string | null;
  mrp: number;
  selling_price: number;
  retail_quantity: number;
  warehouse_quantity: number;
  low_selling_price?: number | null;
  low_warehouse_quantity?: number | null;
  status?: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  category_id?: string | null;
  barcode?: string | null;
  mrp?: number;
  selling_price?: number;
  retail_quantity?: number;
  warehouse_quantity?: number;
  low_selling_price?: number | null;
  low_warehouse_quantity?: number | null;
  status?: ProductStatus;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetch all products from Supabase products table
 */
export async function getProducts(): Promise<StoreResponse<Product[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as Product[]) || [], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch products';
    return { data: null, error: message };
  }
}

/**
 * Fetch a single product by UUID or product_id
 */
export async function getProductById(id: string): Promise<StoreResponse<Product>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('products').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('product_id', id);
    }

    const { data, error } = await query.single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch product';
    return { data: null, error: message };
  }
}

/**
 * Create a new product in Supabase products table
 */
export async function createProduct(input: CreateProductInput): Promise<StoreResponse<Product>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.name || input.name.trim() === '') {
    return { data: null, error: 'Product name is required.' };
  }

  try {
    const payload: {
      name: string;
      category_id: string | null;
      barcode: string | null;
      mrp: number;
      selling_price: number;
      retail_quantity: number;
      warehouse_quantity: number;
      low_selling_price: number;
      low_warehouse_quantity: number;
      status: ProductStatus;
    } = {
      name: input.name.trim(),
      category_id: input.category_id ? input.category_id : null,
      barcode: input.barcode && input.barcode.trim() !== '' ? input.barcode.trim() : null,
      mrp: Number(input.mrp) || 0,
      selling_price: Number(input.selling_price) || 0,
      retail_quantity: Number(input.retail_quantity) || 0,
      warehouse_quantity: Number(input.warehouse_quantity) || 0,
      low_selling_price: Number(input.low_selling_price) || 0,
      low_warehouse_quantity: Number(input.low_warehouse_quantity) || 0,
      status: input.status || 'active',
    };

    const { data, error } = await supabase
      .from('products')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create product';
    return { data: null, error: message };
  }
}

/**
 * Update an existing product in Supabase products table
 */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<StoreResponse<Product>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const payload: Record<string, any> = {};

    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.category_id !== undefined) payload.category_id = input.category_id || null;
    if (input.barcode !== undefined) payload.barcode = input.barcode ? input.barcode.trim() : null;
    if (input.mrp !== undefined) payload.mrp = Number(input.mrp) || 0;
    if (input.selling_price !== undefined) payload.selling_price = Number(input.selling_price) || 0;
    if (input.retail_quantity !== undefined) payload.retail_quantity = Number(input.retail_quantity) || 0;
    if (input.warehouse_quantity !== undefined) payload.warehouse_quantity = Number(input.warehouse_quantity) || 0;
    if (input.low_selling_price !== undefined) payload.low_selling_price = Number(input.low_selling_price) || 0;
    if (input.low_warehouse_quantity !== undefined) payload.low_warehouse_quantity = Number(input.low_warehouse_quantity) || 0;
    if (input.status !== undefined) payload.status = input.status;

    let query = supabase.from('products').update(payload as never);
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('product_id', id);
    }

    const { data, error } = await query.select().single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update product';
    return { data: null, error: message };
  }
}

/**
 * Delete a product by UUID or product_id
 */
export async function deleteProduct(id: string): Promise<StoreResponse<boolean>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('products').delete();
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('product_id', id);
    }

    const { error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete product';
    return { data: null, error: message };
  }
}
