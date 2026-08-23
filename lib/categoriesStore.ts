import { supabase, isSupabaseConfigured } from './supabase';
import type { Category, CategoryStatus } from './types';

export interface CreateCategoryInput {
  name: string;
  category_id?: string;
  status?: CategoryStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  category_id?: string;
  status?: CategoryStatus;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetch all categories from Supabase categories table
 */
export async function getCategories(): Promise<StoreResponse<Category[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as Category[]) || [], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch categories';
    return { data: null, error: message };
  }
}

/**
 * Fetch a single category by UUID or category_id
 */
export async function getCategoryById(id: string): Promise<StoreResponse<Category>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // Check if the id provided is a UUID or a category_id string
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('categories').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('category_id', id);
    }

    const { data, error } = await query.single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Category, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch category';
    return { data: null, error: message };
  }
}

/**
 * Create a new category in Supabase categories table
 */
export async function createCategory(input: CreateCategoryInput): Promise<StoreResponse<Category>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.name || input.name.trim() === '') {
    return { data: null, error: 'Category name is required.' };
  }

  try {
    const payload: { name: string; category_id?: string; status?: CategoryStatus } = {
      name: input.name.trim(),
      status: input.status || 'active',
    };

    if (input.category_id && input.category_id.trim() !== '') {
      payload.category_id = input.category_id.trim();
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Category, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create category';
    return { data: null, error: message };
  }
}

/**
 * Update an existing category by UUID
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<StoreResponse<Category>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const payload: { name?: string; category_id?: string; status?: CategoryStatus; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      payload.name = input.name.trim();
    }

    if (input.category_id !== undefined && input.category_id.trim() !== '') {
      payload.category_id = input.category_id.trim();
    }

    if (input.status !== undefined) {
      payload.status = input.status;
    }

    const { data, error } = await supabase
      .from('categories')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Category, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update category';
    return { data: null, error: message };
  }
}

/**
 * Delete a category by UUID
 */
export async function deleteCategory(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete category';
    return { error: message };
  }
}
